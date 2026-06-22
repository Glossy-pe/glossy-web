import { VariantResponseFull } from "../../variants/models/variant-response.full.mode";

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
  variant: VariantResponseFull | null;
  createdAt: string | null;
  updatedAt: string | null;
}