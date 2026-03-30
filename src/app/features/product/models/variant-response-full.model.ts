import { VariantImageResponse } from "./variant-image-response.model";

export interface VariantResponseFull {
  id: number;
  toneName: string;
  toneCode: string;
  cost: number | null;
  price: number;
  stock: number;
  position: number | null;
  active: boolean | null;
  images: VariantImageResponse[];
}