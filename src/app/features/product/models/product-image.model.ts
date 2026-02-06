
export interface ProductImage {
  id: number;
  url: string;
  position?: number | null;
  mainImage: boolean;
  productId: number;  // Array de URLs de imágenes
}