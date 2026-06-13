import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrderItemResponse } from '../models/order-item-response.model';
import { OrderItemRequest } from '../models/order-item-request.model';

@Injectable({
  providedIn: 'root',
})
export class OrderItemService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/order-items`;
  private readonly ordersUrl = `${environment.apiUrl}/api/admin/orders`;

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