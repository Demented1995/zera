"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { saveMirrorPlacementAction } from "@/modules/orders/placement-actions";
import {
  TOUCH_HORIZONTAL,
  TOUCH_VERTICAL,
  type MirrorPlacement,
} from "@/modules/orders/placement";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-[#4b5563]">{label}</span>
      {children}
    </label>
  );
}

const controlClass = "h-8 rounded border border-[#d5d8de] bg-white px-2 text-xs text-[#243140]";

export function MirrorPlacementForm({
  orderId,
  mirrorKey,
  placement,
}: {
  orderId: string;
  mirrorKey: string;
  placement: MirrorPlacement;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveMirrorPlacementAction({
        orderId,
        mirrorKey,
        touchVertical: String(data.get("touchVertical") ?? ""),
        touchHorizontal: String(data.get("touchHorizontal") ?? ""),
        sandblastGapMm: String(data.get("sandblastGapMm") ?? ""),
        sandblastThicknessMm: String(data.get("sandblastThicknessMm") ?? ""),
      });
      setMessage(result.message);
      setError(!result.ok);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 bg-white px-3 py-3">
      <p className="text-[11px] font-medium tracking-wide text-[#6b7280] uppercase">
        Se alege doar din comandă
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Amplasare touch, vertical">
          <select name="touchVertical" defaultValue={placement.touchVertical} className={controlClass}>
            <option value="">—</option>
            {TOUCH_VERTICAL.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amplasare touch, orizontal">
          <select name="touchHorizontal" defaultValue={placement.touchHorizontal} className={controlClass}>
            <option value="">—</option>
            {TOUCH_HORIZONTAL.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Spațiu până la sablare, mm">
          <input
            name="sandblastGapMm"
            inputMode="numeric"
            defaultValue={placement.sandblastGapMm ?? ""}
            className={controlClass}
          />
        </Field>
        <Field label="Grosimea sablării, mm">
          <input
            name="sandblastThicknessMm"
            inputMode="numeric"
            defaultValue={placement.sandblastThicknessMm ?? ""}
            className={controlClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center rounded bg-[#243140] px-3 text-xs text-white disabled:opacity-60"
        >
          {pending ? "Se salvează" : "Salvează amplasarea"}
        </button>
        {message ? (
          <p className={error ? "text-xs text-[#e03131]" : "text-xs text-[#2f9e44]"}>{message}</p>
        ) : null}
      </div>
    </form>
  );
}
