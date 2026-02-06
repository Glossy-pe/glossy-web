import { ProductVariant } from "../../../product/models/product-variant.model";
import { Product} from "../../../product/models/product.model";

export interface CartItem {
  product: Product;
  selectedVariant: ProductVariant;
  quantity: number;
}