export interface ProductVariant {
  id: number;
  productId: number;
  productName: string;
  toneName: string;
  toneCode: string;  // En tu API es el color hex
  price: number;
  position: number;
  stock: number;
  colorHex?: string; // Campo opcional si lo quieres mantener separado
}