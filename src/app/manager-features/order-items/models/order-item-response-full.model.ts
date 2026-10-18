import { VariantQueryProjection } from "../../variants/models/variant-query-projection.model";

export interface OrderItemResponseFull {
  id: number;
  productVariantId: number;
  orderId: number;
  quantity: number;

  isPaid: boolean;
  isSeparated: boolean;
  isPacked: boolean;

  amountPaid: number | null;
  unitPrice: number | null;
  variant: VariantQueryProjection | null;
  createdAt: string | null;
  updatedAt: string | null;
}