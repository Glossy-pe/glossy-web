export interface ManagerOrderItemResponseStructured {
  id: number;
  productVariantId: number;
  orderId: number;
  productName: string;
  toneName: string;
  quantity: number;
  price: number | null;
  definedPrice: number | null;
  amountPaid: number | null;
  isSeparated: boolean;
  isPacked: boolean;
  image: string;
}