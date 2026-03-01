// order.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderRequest, OrderResponse } from '../models/order.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrderService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/orders`;

  getAll(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(this.apiUrl);
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