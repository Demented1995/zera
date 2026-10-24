"use client";

import { EmptyState } from "@/components/admin/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMaterialPrice } from "@/modules/materials/format";
import type { PriceHistoryDTO } from "@/modules/materials/types";

type PriceHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialName: string;
  history: PriceHistoryDTO[];
};

export function PriceHistoryDialog({
  open,
  onOpenChange,
  materialName,
  history,
}: PriceHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Istoric prețuri</DialogTitle>
          <DialogDescription>
            {materialName}. Istoricul este doar pentru citire — nu poate fi
            editat sau șters din interfață.
          </DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <EmptyState
            title="Nicio modificare de preț"
            description="Istoricul apare automat la fiecare schimbare de preț."
            className="py-10"
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Preț anterior</TableHead>
                  <TableHead>Preț nou</TableHead>
                  <TableHead>Utilizator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(entry.changedAt).toLocaleString("ro-RO")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMaterialPrice(entry.previousPrice)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMaterialPrice(entry.newPrice)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>{entry.changedByName}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.changedByEmail}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
