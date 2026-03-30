import { VariantResponseFull } from "./variant-response-full.model";

export interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  label: string | null;
  active: boolean | null;
  categoryId: number;
  variants: VariantResponseFull[];
}