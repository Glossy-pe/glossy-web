import { ProductVariant } from "../../../features/product/models/product-variant.model";

export type OrderStatus = 'CREATED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface OrderUser {
  id: number;
  name: string;
  email: string;
}

export interface OrderItem {
  id: number;
  productVariant: ProductVariant;
  quantity: number;
}

export interface OrderResponse {
  id: number;
  user: OrderUser;
  status: OrderStatus;
  customerName: string;
  customerAddress: string;
  orderCode: string;
  total: number;
  createdAt: string;
  orderItems: OrderItem[];
}

export interface OrderItemRequest {
  productVariantId: number;
  quantity: number;
}

export interface OrderRequest {
  customerName: string;
  customerAddress: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  orderItems: OrderItemRequest[];
}