import { VariantQueryProjection } from "../../variants/models/variant-query-projection.model";

export interface OrderItemResponseFull {
  id: number;
  productVariantId: number;
  orderId: number;
  quantity: number;
  paidQuantity: number;
  separatedQuantity: number;
  packedQuantity: number;
  amountPaid: number | null;
  unitPrice: number | null;
  variant: VariantQueryProjection | null;
  createdAt: string | null;
  updatedAt: string | null;
}