import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { OrderResponse } from '../models/order-response.model';
import { OrderRequest } from '../models/order-request.model';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/orders`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 10): Observable<PageResponse<OrderResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<PageResponse<OrderResponse>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.baseUrl}/${id}`);
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
}