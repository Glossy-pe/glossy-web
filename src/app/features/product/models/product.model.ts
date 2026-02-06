import { ProductImage } from "./product-image.model";
import { ProductVariant } from "./product-variant.model";

export interface Product {
  id: number;
  name: string;
  description: string;
  fullDescription?: string | null;
  images: ProductImage[];  // Array de URLs de imágenes
  basePrice?: number | null;  // Precio base si no hay variantes
  active: boolean;
  categoryId: number;
  variants: ProductVariant[];
}
