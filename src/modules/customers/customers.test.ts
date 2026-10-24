import "dotenv/config";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@/lib/db/prisma";
import { canManageCustomers } from "@/modules/customers/permissions";
import { normalizeEmail, normalizePhone } from "@/modules/customers/normalize";
import { parseCustomerInput } from "@/modules/customers/schemas";
import { listCustomers } from "@/modules/customers/queries";
import {
  findCustomerDuplicates,
  linkCustomerOffer,
  saveCustomer,
  setCustomerStatus,
} from "@/modules/customers/service";

const createdCustomerIds: string[] = [];
const createdOfferIds: string[] = [];

function person(phone: string, email = "", extra: Record<string, unknown> = {}) {
  return {
    kind: "INDIVIDUAL" as const,
    displayName: "Ion Popescu",
    phone,
    email,
    companyName: "",
    idno: "",
    contactName: "",
    notes: "",
    addresses: [],
    ...extra,
  };
}

describe("customer registry", () => {
  after(async () => {
    if (createdOfferIds.length > 0) {
      await prisma.customerOffer.deleteMany({ where: { id: { in: createdOfferIds } } });
    }
    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    }
    await prisma.$disconnect();
  });

  it("lets both staff roles manage customers and normalizes contact keys", () => {
    assert.equal(canManageCustomers("ADMIN"), true);
    assert.equal(canManageCustomers("MANAGER"), true);
    assert.equal(normalizePhone("+373 60 000 111")?.key, "37360000111");
    assert.equal(normalizePhone("060000111")?.key, "060000111");
    assert.equal(normalizeEmail("  Ana@Exemplu.MD ")?.key, "ana@exemplu.md");
    assert.equal(normalizePhone("123"), null);
    assert.equal(normalizeEmail("fara-arond"), null);
  });

  it("rejects invalid contact data and a company without a name", () => {
    assert.equal(parseCustomerInput(person("123")).ok, false);
    assert.equal(parseCustomerInput(person("+37360000111", "nu-este-email")).ok, false);
    assert.equal(
      parseCustomerInput(person("+37360000111", "", { idno: "123" })).ok,
      false,
    );
    const company = parseCustomerInput({
      ...person("+37360000111"),
      kind: "COMPANY",
      displayName: "SRL Test",
      companyName: "",
    });
    assert.equal(company.ok, false);
    const tagged = parseCustomerInput(person("+37360000111", "", { displayName: "<b>Ana</b> Maria" }));
    assert.equal(tagged.ok && tagged.data.displayName, "Ana Maria");
  });

  it("saves incomplete individuals, keeps duplicates, and stores one primary address", async () => {
    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    assert.ok(user);
    const stamp = String(Date.now()).slice(-8);
    const phone = `+373${stamp}`;
    const email = `client-${stamp}@exemplu.md`;

    const firstParsed = parseCustomerInput(
      person(phone, email, {
        notes: "Observație internă",
        addresses: [
          { label: "Sediu", line: "Str. Ștefan cel Mare 1", city: "Chișinău", postalCode: "MD-2001", isPrimary: false },
          { label: "Livrare", line: "Str. Pușkin 2", city: "Chișinău", postalCode: "", isPrimary: true },
        ],
      }),
    );
    assert.equal(firstParsed.ok, true);
    if (!firstParsed.ok) {
      return;
    }
    assert.equal(firstParsed.data.addresses.filter((address) => address.isPrimary).length, 1);
    assert.equal(firstParsed.data.addresses[1]?.isPrimary, true);

    const first = await saveCustomer(firstParsed.data, user.id);
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }
    createdCustomerIds.push(first.id);

    const secondParsed = parseCustomerInput(
      person(`373 ${stamp}`, email, { displayName: "Altcineva" }),
    );
    assert.equal(secondParsed.ok, true);
    if (!secondParsed.ok) {
      return;
    }
    const second = await saveCustomer(secondParsed.data, user.id);
    assert.equal(second.ok, true);
    if (!second.ok) {
      return;
    }
    createdCustomerIds.push(second.id);
    assert.equal(second.duplicates.some((item) => item.id === first.id), true);
    assert.equal(
      (await findCustomerDuplicates(secondParsed.data, second.id)).some((item) =>
        item.reasons.includes("același telefon"),
      ),
      true,
    );

    const listed = await listCustomers({ q: email, status: "ALL", pageSize: 10 });
    assert.equal(listed.rows.length, 2);
    assert.equal("notes" in listed.rows[0], false);

    const stored = await prisma.customer.findUnique({
      where: { id: first.id },
      include: { addresses: true },
    });
    assert.equal(stored?.notes, "Observație internă");
    assert.equal(stored?.addresses.length, 2);
    assert.equal(stored?.addresses.filter((address) => address.isPrimary).length, 1);
  });

  it("archives without deleting and links an offer without rewriting it", async () => {
    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    assert.ok(user);
    const stamp = String(Date.now()).slice(-8);
    const parsed = parseCustomerInput(person(`+3737${stamp.slice(0, 7)}`, `arhiva-${stamp}@exemplu.md`));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) {
      return;
    }
    const saved = await saveCustomer(parsed.data, user.id);
    assert.equal(saved.ok, true);
    if (!saved.ok) {
      return;
    }
    createdCustomerIds.push(saved.id);

    const offer = await prisma.customerOffer.create({
      data: {
        number: `OFT-CUST-${stamp}`,
        clientName: "Nume pe ofertă",
        clientPhone: "+37361111111",
        productName: "Oglindă",
        createdById: user.id,
        updatedById: user.id,
      },
    });
    createdOfferIds.push(offer.id);

    const linked = await linkCustomerOffer({ customerId: saved.id, offerId: offer.id });
    assert.equal(linked.ok, true);
    const after = await prisma.customerOffer.findUnique({ where: { id: offer.id } });
    assert.equal(after?.customerId, saved.id);
    assert.equal(after?.clientName, "Nume pe ofertă");
    assert.equal(after?.clientPhone, "+37361111111");

    const otherParsed = parseCustomerInput(
      person(`+3738${stamp.slice(0, 7)}`, `alt-${stamp}@exemplu.md`, { displayName: "Alt client" }),
    );
    assert.equal(otherParsed.ok, true);
    if (!otherParsed.ok) {
      return;
    }
    const other = await saveCustomer(otherParsed.data, user.id);
    assert.equal(other.ok, true);
    if (!other.ok) {
      return;
    }
    createdCustomerIds.push(other.id);
    const stolen = await linkCustomerOffer({ customerId: other.id, offerNumber: offer.number });
    assert.equal(stolen.ok, false);

    await setCustomerStatus(saved.id, "ARCHIVED", user.id);
    const active = await listCustomers({ q: parsed.data.email ?? "", status: "ACTIVE" });
    assert.equal(active.rows.some((row) => row.id === saved.id), false);
    const archived = await listCustomers({ status: "ARCHIVED", q: parsed.data.displayName });
    assert.equal(archived.rows.some((row) => row.id === saved.id), true);
    assert.equal(await prisma.customerOffer.count({ where: { id: offer.id } }), 1);
  });
});
