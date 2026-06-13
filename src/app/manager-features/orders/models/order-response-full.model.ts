import { OrderItemResponseFull } from "../../order-items/models/order-item-response-full.model";

export interface OrderResponseFull {
  id: number;
  customerName: string;
  customerAddress: string;
  orderCode: string;
  orderStatusId: number;
  costTotal: number;
  total: number;
  createdAt: string | null;
  updatedAt: string | null;
  items: OrderItemResponseFull[];
}