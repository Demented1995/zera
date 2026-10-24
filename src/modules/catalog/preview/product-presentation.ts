export function productStatusNote(
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
): string | null {
  if (status === "ARCHIVED") {
    return "Model arhivat. Previzualizarea nu îl publică și nu creează o ofertă.";
  }
  if (status === "DRAFT") {
    return "Model în ciornă. Pagina publică de magazin nu este activă.";
  }
  return null;
}

export function nextGalleryIndex(
  current: number,
  count: number,
  direction: 1 | -1,
): number {
  if (count <= 0) {
    return 0;
  }
  const safe = Number.isInteger(current) ? current : 0;
  return (safe + direction + count) % count;
}
