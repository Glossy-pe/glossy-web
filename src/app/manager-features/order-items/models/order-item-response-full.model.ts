import { VariantQueryProjection } from "../../variants/models/variant-query-projection.model";

export interface OrderItemResponseFull {
  id: number;
  productVariantId: number;
  orderId: number;
  quantity: number;

  isPaid: Boolean;
  isSeparated: Boolean;
  isPacked: Boolean;

  amountPaid: number | null;
  unitPrice: number | null;
  variant: VariantQueryProjection | null;
  createdAt: string | null;
  updatedAt: string | null;
}