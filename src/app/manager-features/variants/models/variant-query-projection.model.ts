export interface VariantQueryProjection {
  productId: number;
  productName: string;
  variantId: number;
  toneName: string;
  toneCode: string;
  stock: number;
  price: number;
  imageUrl: string | null;
  mainImage: boolean | null;
  imagePosition: number | null;
}