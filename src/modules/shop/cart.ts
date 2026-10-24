import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";

export const CART_STORAGE_KEY = "zera-cart-v1";
export const CART_MAX_LINES = 8;
export const CART_MAX_QUANTITY = 20;

export type CartLine = {
  id: string;
  modelId: string;
  slug: string;
  name: string;
  imageSrc: string | null;
  imageAlt: string;
  selection: CustomerConfigRequest;
  summary: string[];
  unitPrice: number;
  quantity: number;
};

export type CartDraft = Omit<CartLine, "id" | "quantity">;

export type CartAddResult = "added" | "updated" | "full" | "max";

export function stableSelection(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSelection(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSelection((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function cartLineTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 100) / 100;
}

export function cartTotal(lines: CartLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + cartLineTotal(line.unitPrice, line.quantity), 0) * 100) / 100;
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") {
    return false;
  }
  const line = value as Partial<CartLine>;
  return (
    typeof line.id === "string" &&
    line.id.length >= 8 &&
    typeof line.modelId === "string" &&
    line.modelId.length > 0 &&
    typeof line.slug === "string" &&
    typeof line.name === "string" &&
    (line.imageSrc === null || typeof line.imageSrc === "string") &&
    typeof line.imageAlt === "string" &&
    !!line.selection &&
    typeof line.selection === "object" &&
    Array.isArray(line.summary) &&
    typeof line.unitPrice === "number" &&
    Number.isFinite(line.unitPrice) &&
    typeof line.quantity === "number" &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1 &&
    line.quantity <= CART_MAX_QUANTITY
  );
}

export function readCart(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isCartLine).slice(0, CART_MAX_LINES);
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

export function addCartLine(lines: CartLine[], draft: CartDraft): { lines: CartLine[]; result: CartAddResult } {
  const signature = stableSelection(draft.selection);
  const existing = lines.find(
    (line) => line.modelId === draft.modelId && stableSelection(line.selection) === signature,
  );
  if (existing) {
    if (existing.quantity >= CART_MAX_QUANTITY) {
      return { lines, result: "max" };
    }
    return {
      result: "updated",
      lines: lines.map((line) =>
        line.id === existing.id
          ? {
              ...line,
              name: draft.name,
              imageSrc: draft.imageSrc,
              imageAlt: draft.imageAlt,
              summary: draft.summary,
              unitPrice: draft.unitPrice,
              quantity: line.quantity + 1,
            }
          : line,
      ),
    };
  }
  if (lines.length >= CART_MAX_LINES) {
    return { lines, result: "full" };
  }
  return {
    result: "added",
    lines: [
      ...lines,
      {
        ...draft,
        id: crypto.randomUUID(),
        quantity: 1,
      },
    ],
  };
}

export function setCartQuantity(lines: CartLine[], id: string, quantity: number): CartLine[] {
  const next = Math.min(CART_MAX_QUANTITY, Math.max(1, Math.trunc(quantity)));
  return lines.map((line) => (line.id === id ? { ...line, quantity: next } : line));
}

export function removeCartLine(lines: CartLine[], id: string): CartLine[] {
  return lines.filter((line) => line.id !== id);
}

export function applyQuotedPrices(
  lines: CartLine[],
  updates: Array<{ lineId: string; unitPrice: number }>,
): CartLine[] {
  const next = new Map(updates.map((update) => [update.lineId, update.unitPrice]));
  return lines.map((line) => {
    const unitPrice = next.get(line.id);
    return unitPrice == null ? line : { ...line, unitPrice };
  });
}

const EMPTY_CART: CartLine[] = [];
let snapshot: CartLine[] = EMPTY_CART;
let hydrated = false;
let cartReadyAt = 0;
const listeners = new Set<() => void>();

function emitCart(): void {
  for (const listener of listeners) {
    listener();
  }
}

function hydrateCart(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  snapshot = readCart();
  hydrated = true;
  if (cartReadyAt === 0) {
    cartReadyAt = Date.now();
  }
}

export function cartFormStartedAt(): number {
  hydrateCart();
  return cartReadyAt;
}

export function subscribeCart(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getCartSnapshot(): CartLine[] {
  hydrateCart();
  return snapshot;
}

export function getServerCartSnapshot(): CartLine[] {
  return EMPTY_CART;
}

function commitCart(next: CartLine[]): void {
  snapshot = next;
  hydrated = true;
  writeCart(next);
  emitCart();
}

export function addToStoredCart(draft: CartDraft): CartAddResult {
  hydrateCart();
  const next = addCartLine(snapshot, draft);
  commitCart(next.lines);
  return next.result;
}

export function setStoredQuantity(id: string, quantity: number): void {
  hydrateCart();
  commitCart(setCartQuantity(snapshot, id, quantity));
}

export function removeStoredLine(id: string): void {
  hydrateCart();
  commitCart(removeCartLine(snapshot, id));
}

export function applyStoredPrices(updates: Array<{ lineId: string; unitPrice: number }>): void {
  hydrateCart();
  commitCart(applyQuotedPrices(snapshot, updates));
}

export function clearStoredCart(): void {
  commitCart([]);
}
