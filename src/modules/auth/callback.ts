const FALLBACK = "/admin";

/** Keeps the post-login return path inside the staff area. */
export function safeStaffCallback(raw: string): string {
  const value = raw.trim();
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.includes("\r") ||
    value.includes("\n")
  ) {
    return FALLBACK;
  }

  let url: URL;
  try {
    url = new URL(value, "http://zera.local");
  } catch {
    return FALLBACK;
  }
  if (url.origin !== "http://zera.local" || url.username || url.password) {
    return FALLBACK;
  }
  if (!url.pathname.startsWith("/admin")) {
    return FALLBACK;
  }
  return `${url.pathname}${url.search}`;
}
