export interface VariantResponse {
  id: number;
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  stock: number;
  position: number | null;
  active: boolean;
  productId: number;
}