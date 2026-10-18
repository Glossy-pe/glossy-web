export interface OrderItemRequest {
  productVariantId: number;
  orderId: number;
  quantity: number;
  isPaid: boolean;
  isSeparated: boolean;
  isPacked: boolean;
  amountPaid: number | null;
  unitPrice: number | null;
}