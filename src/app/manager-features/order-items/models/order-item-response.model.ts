export interface OrderItemResponse {
  id: number;
  productVariantId: number;
  orderId: number;
  quantity: number;
  isPaid: boolean;
  isSeparated: boolean;
  isPacked: boolean;
  amountPaid: number | null;
  unitPrice: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}