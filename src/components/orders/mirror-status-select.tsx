"use client";

import { useState, useTransition } from "react";

import { setMirrorStatusAction } from "@/modules/orders/actions";
import { MIRROR_STATUS_LABEL, MIRROR_STATUSES } from "@/modules/orders/public";
import type { MirrorStatus } from "@prisma/client";

const STATUS_COLOR: Record<MirrorStatus, string> = {
  WAITING: "bg-[#868e96]",
  TO_START: "bg-[#f08c00]",
  ORDERED: "bg-[#1c7ed6]",
  SENT_TO_SANDBLAST: "bg-[#7950f2]",
  ASSEMBLED: "bg-[#2f9e44]",
  CLOSED_SUCCESS: "bg-[#2b8a3e]",
  REFUSED: "bg-[#e03131]",
  BRAK: "bg-[#c92a2a]",
};

export function MirrorStatusSelect({
  orderId,
  mirrorKey,
  status,
}: {
  orderId: string;
  mirrorKey: string;
  status: MirrorStatus;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Statut oglindă"
      disabled={pending}
      value={value}
      className={`h-7 w-full min-w-36 rounded px-1.5 text-xs font-medium text-white ${STATUS_COLOR[value]}`}
      onChange={(event) => {
        const next = event.target.value as MirrorStatus;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const result = await setMirrorStatusAction({ orderId, mirrorKey, status: next });
          if (!result.ok) {
            setValue(previous);
          }
        });
      }}
    >
      {MIRROR_STATUSES.map((item) => (
        <option key={item} value={item}>
          {MIRROR_STATUS_LABEL[item]}
        </option>
      ))}
    </select>
  );
}
