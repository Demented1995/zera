import { readFileSync } from "node:fs";
import { join } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";

import type { ImmutableOfferSnapshot } from "@/modules/offers/snapshots";

function money(value: number): string {
  return `${value.toFixed(2)} MDL`;
}

function loadFontBytes(fileName: string): Uint8Array {
  const path = join(process.cwd(), "src/modules/offers/fonts", fileName);
  return new Uint8Array(readFileSync(path));
}

/**
 * Minimalist B/W professional offer PDF.
 * Commercial + technical data only — never includes sinecost / internal costs.
 * Uses embedded DejaVu for Romanian diacritics (ă â î ș ț).
 */
export async function buildOfferPdfBytes(
  snapshot: ImmutableOfferSnapshot,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(loadFontBytes("DejaVuSans.ttf"));
  const fontBold = await doc.embedFont(loadFontBytes("DejaVuSans-Bold.ttf"));
  const black = rgb(0, 0, 0);
  const gray = rgb(0.35, 0.35, 0.35);

  let y = 800;
  const left = 50;
  const width = 495;

  const write = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: typeof black; x?: number },
  ) => {
    const size = opts?.size ?? 10;
    const f = opts?.bold ? fontBold : font;
    page.drawText(text, {
      x: opts?.x ?? left,
      y,
      size,
      font: f,
      color: opts?.color ?? black,
      maxWidth: width,
    });
    y -= size + 6;
  };

  write("ZERA", { bold: true, size: 22 });
  write("Ofertă comercială", { size: 12, color: gray });
  y -= 6;

  const companyLines = [
    snapshot.company.legalName,
    snapshot.company.taxId ? `IDNO / Cod fiscal: ${snapshot.company.taxId}` : null,
    snapshot.company.address,
    snapshot.company.phone ? `Tel: ${snapshot.company.phone}` : null,
    snapshot.company.email,
    snapshot.company.bankDetails,
  ].filter(Boolean) as string[];

  if (companyLines.length === 0) {
    write("Datele legale ale firmei nu sunt configurate în Setări.", {
      size: 9,
      color: gray,
    });
  } else {
    for (const line of companyLines) {
      write(line, { size: 9, color: gray });
    }
  }

  y -= 8;
  page.drawLine({
    start: { x: left, y },
    end: { x: left + width, y },
    thickness: 1,
    color: black,
  });
  y -= 18;

  write(`Ofertă nr. ${snapshot.offerNumber} · Revizia ${snapshot.revisionNumber}`, {
    bold: true,
    size: 12,
  });
  write(`Data emiterii: ${new Date(snapshot.issuedAt).toLocaleDateString("ro-RO")}`, {
    size: 9,
    color: gray,
  });
  if (snapshot.validUntil) {
    write(
      `Valabilă până la: ${new Date(snapshot.validUntil).toLocaleDateString("ro-RO")}`,
      { size: 9, color: gray },
    );
  }
  y -= 6;

  write("Client", { bold: true, size: 11 });
  write(snapshot.client.name);
  if (snapshot.client.company) {
    write(snapshot.client.company, { size: 9, color: gray });
  }
  write(`Tel: ${snapshot.client.phone}`, { size: 9, color: gray });
  if (snapshot.client.email) {
    write(snapshot.client.email, { size: 9, color: gray });
  }
  y -= 6;

  write("Produs", { bold: true, size: 11 });
  write(snapshot.productName, { bold: true });
  write(
    `${snapshot.tech.shapeLabel} · ${snapshot.tech.widthMm} × ${snapshot.tech.heightMm} mm · ${snapshot.tech.glassTypeLabel}`,
  );
  write(`Iluminare: ${snapshot.tech.lightingLabel}`, { size: 9, color: gray });
  for (const feature of snapshot.tech.features) {
    write(`• ${feature}`, { size: 9, color: gray });
  }
  y -= 6;

  write("Preț", { bold: true, size: 11 });
  write(
    `Cantitate: ${snapshot.quantity} · Preț unitar (${snapshot.priceTier === "wholesale" ? "en-gros" : "retail"}): ${money(snapshot.unitPrice)}`,
  );
  write(`Servicii suplimentare: ${money(snapshot.servicesTotal)}`);
  write(`Total ofertă: ${money(snapshot.offerTotal)}`, { bold: true, size: 12 });
  y -= 8;

  if (snapshot.commercialNotes) {
    write("Note comerciale", { bold: true, size: 11 });
    write(snapshot.commercialNotes, { size: 9, color: gray });
  }

  y = 60;
  write(
    "Document generat automat. Nu include costuri interne de producție.",
    { size: 8, color: gray, x: left },
  );

  return doc.save();
}
