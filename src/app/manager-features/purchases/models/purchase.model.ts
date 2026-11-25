export type PurchaseType = 'BOX' | 'UNIT';

export interface PurchaseItemRequest {
  variantId: number;
  quantity: number;
  unitCost?: number;
}

export interface PurchaseRequest {
  productId: number;
  type: PurchaseType;
  purchaseDate?: string;
  notes?: string;
  items: PurchaseItemRequest[];
}

export interface PurchaseResponse {
  id: number;
  productId: number;
  type: PurchaseType;
  boxUnits: number | null;
  totalCost: number;
  purchaseDate: string;
  notes: string | null;
  items: { variantId: number; quantity: number; remaining: number; unitCost: number }[];
}

export interface BoxPurchaseRequest {
  productId: number;
  boxCount: number;
  costPerBox: number;
  purchaseDate?: string;
  notes?: string;
}