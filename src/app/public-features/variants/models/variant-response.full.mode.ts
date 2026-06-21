import { VariantImageResponse } from "./variant-image-response.model";

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
