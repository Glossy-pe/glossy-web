export interface OrderItemResponse {
  id: number;
  productVariantId: number;
  orderId: number;
  quantity: number;
  isPaid: Boolean;
  isSeparated: Boolean;
  isPacked: Boolean;
  amountPaid: number | null;
  unitPrice: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}