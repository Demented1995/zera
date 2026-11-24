"use client";

import { useRouter } from "next/navigation";

import { ConfiguratorWorkspace } from "@/components/configurator/configurator-workspace";
import { saveOrderMirrorAction } from "@/modules/orders/actions";
import type { ConfiguratorSectionSetting } from "@/modules/configurator/layout";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";

export function OrderMirrorEditor({
  orderId,
  mirrorKey,
  initialState,
  sections,
  canEditTariffs,
  pricedGlassTypeIds,
}: {
  orderId: string;
  mirrorKey: string;
  initialState: ConfiguratorState;
  sections: ConfiguratorSectionSetting[];
  canEditTariffs: boolean;
  pricedGlassTypeIds: readonly string[];
}) {
  const router = useRouter();

  return (
    <ConfiguratorWorkspace
      canEditTariffs={canEditTariffs}
      sections={sections}
      initialState={initialState}
      pricedGlassTypeIds={pricedGlassTypeIds}
      onSaveParameters={async (payload) => {
        const result = await saveOrderMirrorAction({ orderId, mirrorKey, config: payload });
        if (result.ok) {
          router.refresh();
        }
        return result;
      }}
    />
  );
}
