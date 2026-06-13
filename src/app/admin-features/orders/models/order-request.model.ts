export interface OrderRequest {
  // userId: number;
  customerName: string;
  customerAddress: string;
  orderCode: string;
  orderStatusId: number;
  costTotal: number;
  total: number;
}