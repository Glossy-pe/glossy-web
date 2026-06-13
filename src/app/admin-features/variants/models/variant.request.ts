export interface VariantRequest {
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  stock: number;
  position: number | null;
  active: boolean;
  productId: number;
}