import { ProductVariant } from "../../../features/product/models/product-variant-response.model";

export type OrderStatus =
  | 'QUOTE'
  | 'CREATED'
  | 'CREADO'
  | 'ACUMULANDO'
  | 'PENDIENTE_PACKAGE'
  | 'PENDIENTE_ENVIO'
  | 'ENVIADO'
  | 'PAID';

export interface OrderUser {
  id: number;
  name: string;
  email: string;
}

export interface OrderItem {
  id: number;
  url: string;
  productVariant: ProductVariant;
  quantity: number;
  paidQuantity: number;        // ✅ nuevo
  amountPaid: number | null;   // ✅ nuevo
  separatedQuantity: number;
  packedQuantity: number;
}

export interface OrderResponse {
  id: number;
  user: OrderUser;
  status: OrderStatus;
  customerName: string;
  customerAddress: string;
  orderCode: string;
  total: number;
  costTotal: number;
  createdAt: string;
  orderItems: OrderItem[];
}

export interface OrderItemRequest {
  productVariantId: number;
  quantity: number;
  paidQuantity: number;        // ✅ nuevo
  amountPaid: number | null;   // ✅ nuevo
  separatedQuantity: number;
  packedQuantity: number;
}

export interface OrderRequest {
  customerName: string;
  customerAddress: string;
  status: OrderStatus;
  total: number;
  costTotal: number;
  createdAt: string;
  orderItems: OrderItemRequest[];
}