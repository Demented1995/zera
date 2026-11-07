"use client";

import { useState, useTransition } from "react";

import { setOrderStatusAction } from "@/modules/orders/actions";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/modules/orders/public";
import type { OrderStatus } from "@prisma/client";

const STATUS_COLOR: Record<OrderStatus, string> = {
  NEW: "bg-[#2f9e44]",
  CLOSED_SUCCESS: "bg-[#1c7ed6]",
  FAKE: "bg-[#868e96]",
  BRAK: "bg-[#e03131]",
};

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Status"
      disabled={pending}
      value={value}
      className={`h-7 w-full min-w-28 rounded px-1.5 text-xs font-medium text-white ${STATUS_COLOR[value]}`}
      onChange={(event) => {
        const next = event.target.value as OrderStatus;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const result = await setOrderStatusAction({ orderId, status: next, note: "" });
          if (!result.ok) {
            setValue(previous);
          }
        });
      }}
    >
      {ORDER_STATUSES.map((item) => (
        <option key={item} value={item}>
          {ORDER_STATUS_LABEL[item]}
        </option>
      ))}
    </select>
  );
}
