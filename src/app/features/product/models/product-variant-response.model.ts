export interface ProductVariant {
  id: number;
  productId: number;
  productName: string;
  toneName: string;
  toneCode: string;
  price: number;
  cost: number;
  stock: number;
  position: number;
  active: boolean;
  mainImageUrl: string | null;
}