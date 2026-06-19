import { OrderItemResponseFull } from "../../order-items/models/order-item-response-full.model";
import { OrderStatusResponse } from "./order-status-response.model";

export interface OrderResponseFull {
  id: number;
  customerName: string;
  customerAddress: string;
  orderCode: string;
  orderStatusId: number;
  orderStatus: OrderStatusResponse | null;
  packed: boolean;
  separated: boolean;
  paid: boolean;
  costTotal: number;
  total: number;
  createdAt: string | null;
  updatedAt: string | null;
  items: OrderItemResponseFull[];
}