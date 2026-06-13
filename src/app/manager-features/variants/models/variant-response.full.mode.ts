export interface VariantResponseFull {
  id: number;
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  stock: number;
  position: number;
  active: boolean;
  productId: number;
  images: VariantImageResponse[];
}


export interface VariantImageResponse {
  id: number;
  url: string;
  position: number;
  mainImage: boolean;
  productVariantId: number;
}