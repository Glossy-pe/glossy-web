import { CriticalVariantDto } from "./CriticalVariantDto";

export interface StockAlertResponse {
  alertId: number;
  variantId: number;
  toneName: string;
  toneCode: string;
  stock: number;
  dismissed: boolean;
  dismissedAt: string | null;
  firstImageUrl: string | null;
}