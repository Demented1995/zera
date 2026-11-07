"use client";

import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type OrderMirrorRow = {
  key: string;
  code: string;
  name: string;
  detail: string;
  price: string;
  href: string;
};

export function OrderMirrorsWindow({
  orderId,
  number,
  customerName,
  mirrors,
}: {
  orderId: string;
  number: string;
  customerName: string;
  mirrors: OrderMirrorRow[];
}) {
  return (
    <Dialog>
      <DialogTrigger className="font-semibold text-white underline-offset-2 hover:underline">
        {number}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" closeLabel="Închide">
        <DialogHeader>
          <DialogTitle>{number}</DialogTitle>
          <DialogDescription>
            {customerName}. {mirrors.length} {mirrors.length === 1 ? "oglindă" : "oglinzi"}.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {mirrors.map((mirror) => (
            <li key={mirror.key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <Link href={mirror.href} className="font-medium underline-offset-2 hover:underline">
                  {mirror.code}
                </Link>
                <p className="text-muted-foreground">
                  {mirror.name}
                  {mirror.detail ? ` · ${mirror.detail}` : ""}
                </p>
              </div>
              <p className="font-medium whitespace-nowrap">{mirror.price}</p>
            </li>
          ))}
        </ul>
        <Link
          href={`/admin/comenzi/${orderId}`}
          className="text-sm underline-offset-2 hover:underline"
        >
          Deschide comanda
        </Link>
      </DialogContent>
    </Dialog>
  );
}
