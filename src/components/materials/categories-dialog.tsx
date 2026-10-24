"use client";

import { CategoriesPanel } from "@/components/materials/categories-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MaterialCategoryDTO } from "@/modules/materials/types";

type CategoriesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MaterialCategoryDTO[];
  canManage: boolean;
  onChanged: () => void;
};

export function CategoriesDialog({
  open,
  onOpenChange,
  categories,
  canManage,
  onChanged,
}: CategoriesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gestionează categoriile</DialogTitle>
          <DialogDescription>
            Adăugați, redenumiți sau dezactivați categoriile de materiale,
            componente și operațiuni.
          </DialogDescription>
        </DialogHeader>
        <CategoriesPanel
          categories={categories}
          canManage={canManage}
          onChanged={onChanged}
        />
      </DialogContent>
    </Dialog>
  );
}
