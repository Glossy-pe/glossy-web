import { VariantResponseFull } from "../../variants/models/variant-response.full.mode";
import { ProductImageResponse } from "./product-image-response.model";

export interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  label: string;
  active: boolean;
  categoryId: number;
  images: ProductImageResponse[];
  variants: VariantResponseFull[];
}