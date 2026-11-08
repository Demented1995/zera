"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";
import { localizePhrase } from "@/modules/shop/phrases";
import { shareConfigurationAction } from "@/modules/shop/share-actions";

type Props = {
  modelId: string;
  slug: string;
  selection: CustomerConfigRequest;
  revision: number;
  pending: boolean;
  locale: ShopLocale;
};

export function ShareConfiguration({
  modelId,
  slug,
  selection,
  revision,
  pending,
  locale,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (revision === 0) {
      return;
    }
    setLink(null);
    setNotice(null);
    const url = new URL(window.location.href);
    if (!url.searchParams.has("c")) {
      return;
    }
    url.searchParams.delete("c");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [revision]);

  async function copyLink() {
    if (busy || pending) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await shareConfigurationAction({ modelId, request: selection });
    setBusy(false);
    if (!result.ok) {
      setError(localizePhrase(locale, result.message));
      return;
    }
    const absolute = `${window.location.origin}${result.path}`;
    setLink(absolute);
    window.history.replaceState(null, "", result.path);
    try {
      await navigator.clipboard.writeText(absolute);
      setNotice(t(locale, "linkCopied"));
    } catch {
      setNotice(t(locale, "linkReady"));
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending || busy}
        onClick={copyLink}
      >
        {busy ? t(locale, "sending") : t(locale, "copyLink")}
      </Button>
      {notice ? (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}
      {link ? (
        <Input readOnly value={link} aria-label={t(locale, "copyLink")} onFocus={(event) => event.currentTarget.select()} />
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
