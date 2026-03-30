import { ProductResponseFull } from "../../../product/models/product-response-full.model";
import { VariantResponseFull } from "../../../product/models/variant-response-full.model";

export interface CartItem {
  product: ProductResponseFull;
  selectedVariant: VariantResponseFull;
  quantity: number;
}