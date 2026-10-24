"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOfferAction,
  duplicateConfigurationAction,
  saveConfigurationAction,
} from "@/modules/offers/actions";

type ConfigToolbarProps = {
  configId: string | null;
  configCode: string | null;
  configName: string;
  onNameChange: (name: string) => void;
  /** Full configurator state as plain object for persistence. */
  buildPayload: () => Record<string, unknown>;
  dirty: boolean;
  onSaved: (id: string, code: string, name: string) => void;
};

export function ConfigToolbar({
  configId,
  configCode,
  configName,
  onNameChange,
  buildPayload,
  dirty,
  onSaved,
}: ConfigToolbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [offerOpen, setOfferOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  function save(asNew: boolean) {
    if (!configName.trim()) {
      toast.error("Introduceți un nume pentru configurație.");
      return;
    }
    startTransition(async () => {
      const result = await saveConfigurationAction({
        id: asNew ? undefined : configId ?? undefined,
        name: configName.trim(),
        config: buildPayload(),
        forceDraft: false,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.id && result.code) {
        onSaved(result.id, result.code, configName.trim());
        router.replace(`/admin/configurator?id=${result.id}`);
      }
    });
  }

  function duplicate() {
    if (!configId) {
      toast.error("Salvați configurația înainte de a o duplica.");
      return;
    }
    startTransition(async () => {
      const result = await duplicateConfigurationAction({ id: configId });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.id) {
        router.push(`/admin/configurator?id=${result.id}`);
      }
    });
  }

  function createOffer() {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error("Numele și telefonul clientului sunt obligatorii.");
      return;
    }
    startTransition(async () => {
      // Ensure config is saved first when possible
      let configurationId = configId;
      if (!configurationId || dirty) {
        const saved = await saveConfigurationAction({
          id: configurationId ?? undefined,
          name: configName.trim() || "Configurație fără nume",
          config: buildPayload(),
        });
        if (!saved.ok || !saved.id) {
          toast.error(saved.ok ? "Salvare eșuată." : saved.message);
          return;
        }
        configurationId = saved.id;
        onSaved(saved.id, saved.code ?? "", configName.trim());
      }

      const result = await createOfferAction({
        configurationId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        productName: configName.trim() || "Oglindă personalizată",
        quantity: 1,
        priceTier: "retail",
        validityDays: 14,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOfferOpen(false);
      if (result.id) {
        router.push(`/admin/oferte/${result.id}`);
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-[220px] flex-1 gap-1.5">
          <Label htmlFor="cfg-name">Nume configurație</Label>
          <Input
            id="cfg-name"
            value={configName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Ex: Baie master 600×1000"
          />
        </div>
        {configCode ? (
          <p className="pb-2 text-xs text-muted-foreground">Cod: {configCode}</p>
        ) : null}
        {dirty ? (
          <p className="pb-2 text-xs text-amber-700 dark:text-amber-300">
            Modificări nesalvate
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => save(false)}
        >
          Salvează
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => save(true)}
        >
          Salvează ca nou
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !configId}
          onClick={duplicate}
        >
          Duplică
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setOfferOpen((value) => !value)}
        >
          Creează ofertă
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => router.push("/admin/configuratii")}
        >
          Configurații salvate
        </Button>
      </div>

      {offerOpen ? (
        <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Client — nume</Label>
            <Input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Telefon</Label>
            <Input
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" disabled={pending} onClick={createOffer}>
              Continuă către ofertă
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
