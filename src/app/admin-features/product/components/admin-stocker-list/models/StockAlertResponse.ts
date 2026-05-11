import { CriticalVariantDto } from "./CriticalVariantDto";

export interface StockAlertResponse {
  productId: number;
  productName: string;
  productSlug: string;
  mainImageUrl: string | null;
  totalStock: number;
  criticalVariantCount: number;
  outOfStockCount: number;
  recentSales: number;
  urgencyScore: number;
  criticalVariants: CriticalVariantDto[];
}
