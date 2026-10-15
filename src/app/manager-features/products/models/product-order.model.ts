import { ProductOrderVariant } from "./product-order-variant.model";

export interface ProductOrder {
  orderId: number;
  orderCode: string;
  customerName: string;
  customerAddress: string | null;
  orderStatusId: number | null;
  createdAt: string | null;
  variants: ProductOrderVariant[];
}