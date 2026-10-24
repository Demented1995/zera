"use client";

import { useRef, useState } from "react";

import { CustomerConfigurator } from "@/components/catalog/customer-configurator";
import { PreviewDiagnostics } from "@/components/catalog/preview-diagnostics";
import { applyCustomerPatch, isLatestPreviewResponse } from "@/modules/catalog/preview/patch";
import type {
  AdminPreviewDiagnostic,
  CustomerPreviewPayload,
  PreviewActionResult,
  PreviewPatch,
} from "@/modules/catalog/preview/types";

type QuoteAction = (input: {
  modelId: string;
  request: CustomerPreviewPayload["selection"];
}) => Promise<PreviewActionResult>;

type Props = {
  modelId: string;
  initial: CustomerPreviewPayload;
  initialDiagnostic: AdminPreviewDiagnostic | null;
  quoteAction: QuoteAction;
};

export function MirrorPreviewScreen({
  modelId,
  initial,
  initialDiagnostic,
  quoteAction,
}: Props) {
  const [customer, setCustomer] = useState(initial);
  const [diagnostic, setDiagnostic] = useState(initialDiagnostic);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);

  function onPatch(patch: PreviewPatch) {
    const nextSelection = applyCustomerPatch(customer.selection, patch);
    const id = requestId.current + 1;
    requestId.current = id;
    setPending(true);
    setError(null);

    void quoteAction({ modelId, request: nextSelection }).then((result) => {
      if (!isLatestPreviewResponse(id, requestId.current)) {
        return;
      }
      setPending(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCustomer(result.customer);
      setDiagnostic(result.diagnostic);
      setRevision(id);
    });
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <CustomerConfigurator
        customer={customer}
        pending={pending}
        revision={revision}
        onPatch={onPatch}
      />
      {diagnostic ? <PreviewDiagnostics diagnostic={diagnostic} /> : null}
    </div>
  );
}
