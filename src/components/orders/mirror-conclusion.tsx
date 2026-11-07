"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { MirrorPlacementForm } from "@/components/orders/mirror-placement-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ConclusionRow } from "@/modules/orders/conclusion";
import {
  millimetreLabel,
  touchPlacementLabel,
  type MirrorPlacement,
} from "@/modules/orders/placement";

export type MirrorConclusionData = {
  orderId: string;
  mirrorKey: string;
  code: string;
  name: string;
  photoUrl: string | null;
  rows: ConclusionRow[];
  placement: MirrorPlacement;
  width: string;
  height: string;
  glass: string;
};

function mirrorOrderText(data: MirrorConclusionData): string {
  return [`Comandă: ${data.code}`, `Lățime: ${data.width}`, `Înălțime: ${data.height}`, `Tip: ${data.glass}`].join(
    "\n",
  );
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#ececec] bg-white px-3 py-1.5 text-xs">
      <span>{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function MirrorConclusion({ data }: { data: MirrorConclusionData }) {
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const [showSandblast, setShowSandblast] = useState(false);

  async function copyMirrorOrder() {
    const text = mirrorOrderText(data);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = false;
    }
    if (!ok) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand("copy");
      area.remove();
    }
    setCopied(ok ? "ok" : "failed");
  }

  return (
    <Dialog>
      <DialogTrigger
        aria-label={`Concluzia ${data.name}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded bg-[#243140] text-white"
      >
        <Plus className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl" closeLabel="Închide">
        <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex min-h-64 items-center justify-center bg-[#f3f1ec] p-4">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.name} className="max-h-[70vh] w-full object-contain" />
            ) : (
              <p className="text-sm text-[#6b7280]">Modelul nu are fotografie.</p>
            )}
          </div>
          <div className="min-w-0">
            <DialogHeader className="px-4 pt-4 pr-12 text-left">
              <DialogTitle className="text-lg">{data.code}</DialogTitle>
              <DialogDescription>{data.name}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              <button
                type="button"
                onClick={copyMirrorOrder}
                className="inline-flex h-8 items-center rounded bg-[#1c7ed6] px-3 text-xs font-medium text-white"
              >
                {copied === "ok" ? "Copiat" : "Comandă oglindă"}
              </button>
              <button
                type="button"
                onClick={() => setShowSandblast((open) => !open)}
                className="inline-flex h-8 items-center rounded bg-[#f08c00] px-3 text-xs font-medium text-white"
              >
                Comandă peskostrui
              </button>
            </div>
            {copied ? (
              <div className="mx-4 mt-2">
                {copied === "failed" ? (
                  <p className="mb-1 text-xs text-[#e03131]">Textul nu a putut fi copiat. Selectați-l de mai jos.</p>
                ) : null}
                <pre className="rounded bg-[#f3f4f6] px-3 py-2 text-xs whitespace-pre-wrap text-[#243140]">
                  {mirrorOrderText(data)}
                </pre>
              </div>
            ) : null}
            {showSandblast ? (
              <div className="mx-4 mt-2 overflow-hidden rounded border border-[#f08c00]">
                <h3 className="bg-[#f08c00] px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
                  Comandă peskostrui
                </h3>
                <SheetRow label="Comandă" value={data.code} />
                <SheetRow label="Dimensiune" value={`${data.width} × ${data.height}`} />
                <SheetRow label="Amplasare touch" value={touchPlacementLabel(data.placement)} />
                <SheetRow label="Spațiu până la sablare" value={millimetreLabel(data.placement.sandblastGapMm)} />
                <SheetRow label="Grosimea sablării" value={millimetreLabel(data.placement.sandblastThicknessMm)} />
              </div>
            ) : null}
            <div className="mt-3">
              <h3 className="bg-[#111111] px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
                Din configurator
              </h3>
              {data.rows.length > 0 ? (
                data.rows.map((row, index) => (
                  <SheetRow key={`${row.label}-${index}`} label={row.label} value={row.value} />
                ))
              ) : (
                <p className="border-b border-[#ececec] px-3 py-2 text-xs text-[#6b7280]">
                  Configuratorul profesional nu are parametri de afișat.
                </p>
              )}
              <h3 className="bg-[#111111] px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
                Amplasare
              </h3>
              <SheetRow label="Amplasare touch" value={touchPlacementLabel(data.placement)} />
              <SheetRow label="Spațiu până la sablare" value={millimetreLabel(data.placement.sandblastGapMm)} />
              <SheetRow label="Grosimea sablării" value={millimetreLabel(data.placement.sandblastThicknessMm)} />
              <MirrorPlacementForm
                key={`${data.placement.touchVertical}-${data.placement.touchHorizontal}-${data.placement.sandblastGapMm}-${data.placement.sandblastThicknessMm}`}
                orderId={data.orderId}
                mirrorKey={data.mirrorKey}
                placement={data.placement}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
