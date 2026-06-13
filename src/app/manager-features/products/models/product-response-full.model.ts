import { VariantResponseFull } from "../../variants/models/variant-response.full.mode";

export interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  label: string;
  active: boolean;
  categoryId: number;
  variants: VariantResponseFull[];
}