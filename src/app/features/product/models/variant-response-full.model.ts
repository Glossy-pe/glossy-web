import { VariantImageResponse } from "./variant-image-response.model";

export interface VariantResponseFull {
  id: number;
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  stock: number;
  position: number | null;
  separated: boolean;
  packed: boolean;
  active: boolean | null;
  images: VariantImageResponse[];
}