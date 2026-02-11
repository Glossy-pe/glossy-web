import { ProductImage } from "./product-image.model";
import { ProductVariant } from "./product-variant.model";

export interface Product {
  id: number;
  basePrice: number;
  name: string;
  description: string;
  fullDescription?: string | null;
  images: ProductImage[];  // Array de URLs de imágenes
  active: boolean;
  label: string;
  categoryId: number;
  variants: ProductVariant[];
}
