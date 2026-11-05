export interface OrderCalendarItem {
  id: number;
  orderCode: string;
  customerName: string;
  orderStatusId: number | null;
  scheduledSendAt: string | null;
}