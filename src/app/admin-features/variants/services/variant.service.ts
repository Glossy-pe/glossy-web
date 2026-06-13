import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { VariantResponse } from '../models/variant-response';
import { VariantRequest } from '../models/variant.request';

@Injectable({
  providedIn: 'root',
})
export class VariantService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/variants`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<VariantResponse[]> {
    return this.http.get<VariantResponse[]>(this.baseUrl);
  }

  getById(id: number): Observable<VariantResponse> {
    return this.http.get<VariantResponse>(`${this.baseUrl}/${id}`);
  }

  getByProductId(id: number): Observable<VariantResponse[]> {
    return this.http.get<VariantResponse[]>(`${environment.apiUrl}/api/admin/products/${id}/variants`);
  }

  create(request: VariantRequest): Observable<VariantResponse> {
    return this.http.post<VariantResponse>(this.baseUrl, request);
  }

  update(
    id: number,
    request: VariantRequest
  ): Observable<VariantResponse> {
    return this.http.put<VariantResponse>(
      `${this.baseUrl}/${id}`,
      request
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }


}