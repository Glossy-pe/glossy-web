export interface OrderResponse {
  id: number;
  customerName: string;
  customerAddress: string;
  description: string;
  orderCode: string;
  orderStatusId: number;
  costTotal: number;
  total: number;
  publicToken: string;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}