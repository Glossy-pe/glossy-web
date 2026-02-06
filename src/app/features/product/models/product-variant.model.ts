export interface ProductVariant {
  id: number;
  toneName: string;
  toneCode: string;  // En tu API es el color hex
  price: number;
  stock: number;
  colorHex?: string; // Campo opcional si lo quieres mantener separado
}