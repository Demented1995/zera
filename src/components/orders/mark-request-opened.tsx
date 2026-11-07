"use client";

import { useEffect, useRef } from "react";

import { markSiteRequestOpenedAction } from "@/modules/orders/actions";

export function MarkRequestOpened({ orderId }: { orderId: string }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void markSiteRequestOpenedAction(orderId);
  }, [orderId]);

  return null;
}
