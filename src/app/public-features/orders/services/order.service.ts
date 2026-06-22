import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { OrderResponseFull } from '../models/order-response-full.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly baseUrl = `${environment.apiUrl}/api/guest/orders`;
  private readonly statusBaseUrl = `${environment.apiUrl}/api/guest/order-status`;

  constructor(private http: HttpClient) {}

  getFullById(id: number): Observable<OrderResponseFull> {
    return this.http.get<OrderResponseFull>(`${this.baseUrl}/full/${id}`);
  }

  getFullByToken(token: string): Observable<OrderResponseFull> {
    return this.http.get<OrderResponseFull>(`${this.baseUrl}/by-token/${token}`);
  }
}
