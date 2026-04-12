import { VariantResponseFull } from "./variant-response-full.model";

export interface ProductImageResponse {
  id: number;
  productId: number;
  mainImage: boolean;
  position: number;
  url: string;
}

export interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  label: string | null;
  active: boolean | null;
  categoryId: number;
  variants: VariantResponseFull[];
  labels: { id: number; name: string }[];
  images: ProductImageResponse[]; // 👈 imágenes propias del producto
}