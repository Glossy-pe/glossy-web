export interface BoxPresentationResponse {
  productId: number;
  totalUnits: number;
  activeVariants: number;
  unitsPerVariant: number | null;
  valid: boolean;
}

export interface SaleTemplateItemRequest {
  variantId: number;
  quantity: number;
}

export interface SaleTemplateRequest {
  productId?: number;
  name: string;
  unitPrice: number;     // antes: price
  active?: boolean;
  items: SaleTemplateItemRequest[];
}

export interface SaleTemplateResponse {
  id: number;
  productId: number;
  name: string;
  unitPrice: number;     // nuevo
  totalPrice: number;    // antes: price
  referencePrice: number;
  discount: number;
  discountPercent: number;
  active: boolean;
  totalUnits: number;
  items: { variantId: number; toneName: string; quantity: number; unitPrice: number }[];
}