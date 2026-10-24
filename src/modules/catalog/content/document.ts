/**
 * Romanian is the only stored locale in this stage.
 * `ru` is reserved so a later translation can sit beside this document
 * without a second product record.
 */
export const PRIMARY_CONTENT_LOCALE = "ro" as const;
export const FUTURE_CONTENT_LOCALES = ["ru"] as const;
export type ContentLocale = typeof PRIMARY_CONTENT_LOCALE | (typeof FUTURE_CONTENT_LOCALES)[number];

export type InlineNode =
  | { type: "text"; text: string; bold?: boolean }
  | { type: "link"; text: string; href: string };

export type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] };

export type RichDocument = {
  version: 1;
  locale: typeof PRIMARY_CONTENT_LOCALE;
  blocks: ContentBlock[];
};

const MAX_SOURCE = 20_000;
const MAX_BLOCKS = 60;
const MAX_TEXT = 2_000;

export function emptyDocument(): RichDocument {
  return { version: 1, locale: PRIMARY_CONTENT_LOCALE, blocks: [] };
}

function stripUnsafe(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href || href.length > 400 || /\s/.test(href)) {
    return null;
  }
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) {
    return href;
  }
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function cleanInlines(nodes: InlineNode[]): InlineNode[] {
  const cleaned: InlineNode[] = [];
  for (const node of nodes) {
    if (node.type === "link") {
      const text = stripUnsafe(node.text).slice(0, MAX_TEXT);
      const href = safeHref(node.href);
      if (!text.trim() || !href) {
        if (text.trim()) {
          cleaned.push({ type: "text", text: text.trim() });
        }
        continue;
      }
      cleaned.push({ type: "link", text, href });
      continue;
    }
    const text = stripUnsafe(node.text).slice(0, MAX_TEXT);
    if (!text.trim()) {
      continue;
    }
    cleaned.push(node.bold ? { type: "text", text, bold: true } : { type: "text", text });
  }
  return cleaned;
}

export function sanitizeDocument(raw: unknown): RichDocument {
  if (!raw || typeof raw !== "object") {
    return emptyDocument();
  }
  const blocks = (raw as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) {
    return emptyDocument();
  }
  const next: ContentBlock[] = [];
  for (const block of blocks.slice(0, MAX_BLOCKS)) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const kind = (block as { type?: unknown }).type;
    if (kind === "heading") {
      const level = (block as { level?: unknown }).level === 3 ? 3 : 2;
      const text = stripUnsafe(String((block as { text?: unknown }).text ?? ""))
        .trim()
        .slice(0, MAX_TEXT);
      if (text) {
        next.push({ type: "heading", level, text });
      }
      continue;
    }
    if (kind === "paragraph") {
      const children = cleanInlines(
        Array.isArray((block as { children?: unknown }).children)
          ? ((block as { children: InlineNode[] }).children)
          : [],
      );
      if (children.length > 0) {
        next.push({ type: "paragraph", children });
      }
      continue;
    }
    if (kind === "list") {
      const ordered = (block as { ordered?: unknown }).ordered === true;
      const items = Array.isArray((block as { items?: unknown }).items)
        ? (block as { items: InlineNode[][] }).items
        : [];
      const cleanItems = items
        .slice(0, 40)
        .map((item) => cleanInlines(Array.isArray(item) ? item : []))
        .filter((item) => item.length > 0);
      if (cleanItems.length > 0) {
        next.push({ type: "list", ordered, items: cleanItems });
      }
    }
  }
  return { version: 1, locale: PRIMARY_CONTENT_LOCALE, blocks: next };
}

function parseInlines(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push({ type: "text", text: source.slice(cursor, index) });
    }
    if (match[1]) {
      nodes.push({ type: "text", text: match[1], bold: true });
    } else if (match[2] && match[3]) {
      nodes.push({ type: "link", text: match[2], href: match[3] });
    }
    cursor = index + match[0].length;
  }
  if (cursor < source.length) {
    nodes.push({ type: "text", text: source.slice(cursor) });
  }
  return nodes;
}

export function parseRichSource(source: string): RichDocument {
  const text = source.replace(/\r\n/g, "\n").slice(0, MAX_SOURCE);
  const lines = text.split("\n");
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    const joined = paragraph.join(" ").trim();
    paragraph = [];
    if (!joined) {
      return;
    }
    blocks.push({ type: "paragraph", children: parseInlines(joined) });
  }

  for (let index = 0; index < lines.length; ) {
    const line = lines[index] ?? "";
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: heading[1] === "###" ? 3 : 2,
        text: heading[2] ?? "",
      });
      index += 1;
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const items: InlineNode[][] = [];
      const isOrdered = Boolean(ordered);
      while (index < lines.length) {
        const current = lines[index] ?? "";
        const item = (isOrdered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/).exec(current);
        if (!item) {
          break;
        }
        items.push(parseInlines(item[1] ?? ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }
    paragraph.push(line.trim());
    index += 1;
  }
  flushParagraph();
  return sanitizeDocument({ version: 1, locale: PRIMARY_CONTENT_LOCALE, blocks });
}

function inlineToSource(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "link") {
        return `[${node.text}](${node.href})`;
      }
      return node.bold ? `**${node.text}**` : node.text;
    })
    .join("");
}

export function documentToSource(document: RichDocument): string {
  return sanitizeDocument(document)
    .blocks.map((block) => {
      if (block.type === "heading") {
        return `${block.level === 3 ? "###" : "##"} ${block.text}`;
      }
      if (block.type === "list") {
        return block.items
          .map((item, index) =>
            block.ordered ? `${index + 1}. ${inlineToSource(item)}` : `- ${inlineToSource(item)}`,
          )
          .join("\n");
      }
      return inlineToSource(block.children);
    })
    .join("\n\n");
}

export function plainText(document: RichDocument): string {
  return sanitizeDocument(document)
    .blocks.map((block) => {
      if (block.type === "heading") {
        return block.text;
      }
      if (block.type === "list") {
        return block.items
          .map((item) => item.map((node) => node.text).join(""))
          .join("\n");
      }
      return block.children.map((node) => node.text).join("");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function documentFromStored(raw: unknown, fallback = ""): RichDocument {
  if (raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks)) {
    return sanitizeDocument(raw);
  }
  if (fallback.trim()) {
    return parseRichSource(fallback);
  }
  return emptyDocument();
}

export function isEmptyDocument(document: RichDocument): boolean {
  return sanitizeDocument(document).blocks.length === 0;
}
