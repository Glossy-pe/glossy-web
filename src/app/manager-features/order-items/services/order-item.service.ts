import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrderItemResponse } from '../models/order-item-response.model';
import { OrderItemRequest } from '../models/order-item-request.model';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { OrderItemResponseFull } from '../models/order-item-response-full.model';

@Injectable({
  providedIn: 'root',
})
export class OrderItemService {
  private readonly baseUrl = `${environment.apiUrl}/api/manager/order-items`;
  private readonly ordersUrl = `${environment.apiUrl}/api/manager/orders`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<OrderItemResponse[]> {
    return this.http.get<OrderItemResponse[]>(this.baseUrl);
  }

  getById(id: number): Observable<OrderItemResponse> {
    return this.http.get<OrderItemResponse>(`${this.baseUrl}/${id}`);
  }

  getByOrderId(orderId: number): Observable<OrderItemResponse[]> {
    return this.http.get<OrderItemResponse[]>(`${this.ordersUrl}/${orderId}/order-items`);
  }

  getAllFull(page = 0, size = 10): Observable<PageResponse<OrderItemResponseFull>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<PageResponse<OrderItemResponseFull>>(`${this.baseUrl}/full`, { params });
  }

  create(request: OrderItemRequest): Observable<OrderItemResponse> {
    return this.http.post<OrderItemResponse>(this.baseUrl, request);
  }

  update(id: number, request: OrderItemRequest): Observable<OrderItemResponse> {
    return this.http.put<OrderItemResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}