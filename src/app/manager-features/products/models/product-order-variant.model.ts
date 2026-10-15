export interface ProductOrderVariant {
  orderItemId: number;
  orderId: number;
  variantId: number;
  toneName: string | null;
  toneCode: string | null;
  unitPrice: number | null;
  amountPaid: number | null;
  isSeparated: boolean;
  isPacked: boolean;
}