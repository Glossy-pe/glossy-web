// order.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderRequest, OrderResponse } from '../models/order.model';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';

@Injectable({ providedIn: 'root' })
export class OrderService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/orders`;

  getAll(page = 0, size = 10, q = '', status = '', variantId?: number): Observable<PageResponse<OrderResponse>> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('size', size.toString());
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (variantId) params.set('variantId', variantId.toString());
    return this.http.get<PageResponse<OrderResponse>>(`${this.apiUrl}?${params.toString()}`);
  }

  getById(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/${id}`);
  }

  create(order: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.apiUrl, order);
  }

  update(id: number, order: Partial<OrderRequest>): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}/${id}`, order);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}