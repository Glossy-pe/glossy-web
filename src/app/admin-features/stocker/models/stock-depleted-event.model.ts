export interface VariantImage {
  id: number;
  variantId: number;
  url: string;
  position: number;
  mainImage: boolean;
}

export interface StockDepletedEvent {
  id: number;        // id de StockAlert en BD
  variantId: number;
  toneName: string;
  timestamp: string;
}

// datos enriquecidos para mostrar en la card
export interface StockAlertCard {
  alertId: number;
  variantId: number;
  productName: string;
  toneName: string;
  mainImageUrl: string | null;
  images: VariantImage[];
  occurredAt: string;
}