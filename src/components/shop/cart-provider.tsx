"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

import {
  addToStoredCart,
  applyStoredPrices,
  cartCount,
  clearStoredCart,
  getCartSnapshot,
  getServerCartSnapshot,
  removeStoredLine,
  setStoredQuantity,
  subscribeCart,
  type CartAddResult,
  type CartDraft,
  type CartLine,
} from "@/modules/shop/cart";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  add: (draft: CartDraft) => CartAddResult;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  applyPrices: (updates: Array<{ lineId: string; unitPrice: number }>) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribeCart, getCartSnapshot, getServerCartSnapshot);
  const value: CartContextValue = {
    lines,
    count: cartCount(lines),
    add: addToStoredCart,
    setQuantity: setStoredQuantity,
    remove: removeStoredLine,
    applyPrices: applyStoredPrices,
    clear: clearStoredCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("Coșul nu este disponibil.");
  }
  return value;
}
