export interface OrderItemRequest {
  productVariantId: number;
  orderId: number;
  quantity: number;
  paidQuantity: number;
  separatedQuantity: number;
  packedQuantity: number;
  amountPaid: number | null;
  unitPrice: number | null;
}