import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  KitDetailResponse,
  KitItemRequest,
  KitItemResponse,
  KitPublicResponse,
  KitRequest,
  KitResponse,
  ProductSearchResult,
} from '../models/kit.model';

@Injectable({ providedIn: 'root' })
export class KitService {
  private readonly http = inject(HttpClient);
  private readonly managerUrl = `${environment.apiUrl}/api/manager/kits`;

  // ── Kits (manager) ──
  getAll(): Observable<KitResponse[]> {
    return this.http.get<KitResponse[]>(this.managerUrl);
  }

  getById(id: number): Observable<KitDetailResponse> {
    return this.http.get<KitDetailResponse>(`${this.managerUrl}/${id}`);
  }

  create(request: KitRequest): Observable<KitResponse> {
    return this.http.post<KitResponse>(this.managerUrl, request);
  }

  update(id: number, request: Partial<KitRequest>): Observable<KitResponse> {
    return this.http.put<KitResponse>(`${this.managerUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.managerUrl}/${id}`);
  }

  // ── Items (manager) ──
  addItem(kitId: number, request: KitItemRequest): Observable<KitItemResponse> {
    return this.http.post<KitItemResponse>(`${this.managerUrl}/${kitId}/items`, request);
  }

  updateItem(kitId: number, itemId: number, request: KitItemRequest): Observable<KitItemResponse> {
    return this.http.put<KitItemResponse>(`${this.managerUrl}/${kitId}/items/${itemId}`, request);
  }

  removeItem(kitId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.managerUrl}/${kitId}/items/${itemId}`);
  }

  // ── Buscador de productos (endpoint existente del manager) ──
  searchProducts(q: string): Observable<ProductSearchResult[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<ProductSearchResult[]>(
      `${environment.apiUrl}/api/manager/products/search`,
      { params },
    );
  }

  // ── Lectura pública (para el calendario) ──
  getPublicKit(id: number): Observable<KitPublicResponse> {
    return this.http.get<KitPublicResponse>(`${environment.apiUrl}/api/public/kits/${id}`);
  }
}

/** Extrae un mensaje legible de un error del backend */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    const msg = body?.message || body?.detail || (typeof body === 'string' ? body : null);
    if (msg) return msg;
    if (err.status === 409) return 'Conflicto: la posición o el producto ya están en uso.';
    if (err.status === 404) return 'No encontrado.';
    if (err.status === 400) return 'Datos inválidos.';
  }
  return 'Ocurrió un error inesperado.';
}