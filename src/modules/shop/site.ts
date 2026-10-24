/** Public origin used for canonical URLs, the sitemap, and product structured data. */
export function publicSiteUrl(): string {
  const configured = process.env.AUTH_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return "http://localhost:3000";
    }
  }
  return "http://localhost:3000";
}

/** JSON for a script tag. Escapes `<` so a product name cannot close the tag. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
