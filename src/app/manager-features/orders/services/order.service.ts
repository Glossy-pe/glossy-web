import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { OrderResponse } from '../models/order-response.model';
import { OrderRequest } from '../models/order-request.model';
import { OrderStatusResponse } from '../models/order-status-response.model';
import { OrderResponseFull } from '../models/order-response-full.model';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly baseUrl = `${environment.apiUrl}/api/manager/orders`;
  private readonly statusBaseUrl = `${environment.apiUrl}/api/manager/order-status`;
  private statuses$?: Observable<OrderStatusResponse[]>;

  constructor(private http: HttpClient) {}

  getAll(
    page = 0,
    size = 10,
    name?: string,
    variantId?: number,
    orderStatusId?: number,   // 👈
    isPaid?: boolean,
    isSeparated?: boolean,
    isPacked?: boolean
  ): Observable<PageResponse<OrderResponseFull>> {

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (name?.trim()) {
      params = params.set('name', name.trim());
    }

    if (variantId) {
      params = params.set('variantId', variantId);
    }

    if (orderStatusId) {                            // 👈
      params = params.set('orderStatusId', orderStatusId);
    }

    if (isPaid != null) {
      params = params.set('isPaid', isPaid);
    }

    if (isSeparated != null) {
      params = params.set('isSeparated', isSeparated);
    }

    if (isPacked != null) {
      params = params.set('isPacked', isPacked);
    }

    return this.http.get<PageResponse<OrderResponseFull>>(
      `${this.baseUrl}/full`,
      { params }
    );
  }

  getById(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.baseUrl}/${id}`);
  }

  getFullById(id: number): Observable<OrderResponseFull> {
    return this.http.get<OrderResponseFull>(`${this.baseUrl}/${id}/full`);
  }

  create(request: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.baseUrl, request);
  }

  update(id: number, request: OrderRequest): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getStatuses(): Observable<OrderStatusResponse[]> {

    if (!this.statuses$) {
      this.statuses$ = this.http
        .get<OrderStatusResponse[]>(this.statusBaseUrl)
        .pipe(
          shareReplay(1)
        );
    }

    return this.statuses$;
  }
}