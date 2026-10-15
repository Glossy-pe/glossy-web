export interface OrderItemRequest {
  productVariantId: number;
  orderId: number;
  quantity: number;
  isPaid: Boolean;
  isSeparated: Boolean;
  isPacked: Boolean;
  amountPaid: number | null;
  unitPrice: number | null;
}