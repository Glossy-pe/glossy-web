export interface OrderRequest {
  // userId: number;
  customerName: string;
  customerAddress: string;
  description: string;
  orderCode: string;
  orderStatusId: number;
  costTotal: number;
  total: number;
  expiresAt: string | null;
}