import { ProductResponseFull } from '../../../public-features/products/models/product-response-full.model';
export interface KitResponse {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface KitItemResponse {
  id: number;
  kitId: number;
  productId: number;
  productName: string | null;
  position: number;
}

export interface KitDetailResponse extends KitResponse {
  items: KitItemResponse[];
}

export interface KitRequest {
  name: string;
  active: boolean;
}

/** En PUT se envía solo lo que cambió */
export interface KitItemRequest {
  productId?: number;
  position?: number;
}

/** Resultado del buscador de productos del manager */
export interface ProductSearchResult {
  id: number;
  name: string;
  label?: string;
}

/** Lectura pública (la usa el calendario) */
export interface KitPublicItem {
  position: number;
  product: ProductResponseFull;
}

export interface KitPublicResponse {
  id: number;
  name: string;
  items: KitPublicItem[];
}