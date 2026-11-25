import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BoxPurchaseRequest, PurchaseRequest, PurchaseResponse } from '../models/purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly baseUrl = `${environment.apiUrl}/api/manager/purchases`;

  constructor(private http: HttpClient) {}

  create(request: PurchaseRequest): Observable<PurchaseResponse> {
    return this.http.post<PurchaseResponse>(this.baseUrl, request);
  }

  registerBoxes(request: BoxPurchaseRequest): Observable<PurchaseResponse[]> {
    return this.http.post<PurchaseResponse[]>(`${this.baseUrl}/box`, request);
  }

  getByProductId(productId: number): Observable<PurchaseResponse[]> {
    return this.http.get<PurchaseResponse[]>(this.baseUrl, { params: { productId } });
  }
}