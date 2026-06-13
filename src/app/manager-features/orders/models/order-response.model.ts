export interface OrderResponse {
  id: number;
  // userId: number;
  customerName: string;
  customerAddress: string;
  orderCode: string;
  orderStatusId: number;
  costTotal: number;
  total: number;
  createdAt: string | null;
  updatedAt: string | null;
}