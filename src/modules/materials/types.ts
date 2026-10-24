export type MaterialCategoryDTO = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

export type MaterialDTO = {
  id: string;
  name: string;
  internalCode: string | null;
  categoryId: string;
  categoryName: string;
  unitPrice: string | null;
  unitOfMeasure: string;
  currency: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PriceHistoryDTO = {
  id: string;
  previousPrice: string | null;
  newPrice: string | null;
  changedAt: string;
  changedByName: string;
  changedByEmail: string;
};
