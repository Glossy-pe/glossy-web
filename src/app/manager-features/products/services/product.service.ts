import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

import { ProductResponse } from '../models/product-response.model';
import { ProductRequest } from '../models/product-request.model';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { ProductResponseFull } from '../models/product-response-full.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/api/manager/products`;

  constructor(private http: HttpClient) {}

  // getAllProducts(page: number = 0, size: number = 10): Observable<PageResponse<ProductResponseFull>> {
  //     return this.http.get<PageResponse<ProductResponseFull>>(this.baseUrl, {
  //       params: { page, size }
  //     });
  // }

  getAllProducts(
    page: number = 0,
    size: number = 10,
    categoryId?: number,
    sort?: string
  ): Observable<PageResponse<ProductResponseFull>> {
    let params: any = { page, size };
    if (categoryId != null) params.categoryId = categoryId;
    if (sort)              params.sort = sort;
    return this.http.get<PageResponse<ProductResponseFull>>(this.baseUrl, { params });
  }


  getById(id: number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: ProductRequest): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(this.baseUrl, request);
  }

  update(
    id: number,
    request: ProductRequest
  ): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(
      `${this.baseUrl}/${id}`,
      request
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  search(q: string, categoryId?: number, active?: boolean): Observable<ProductResponseFull[]> {
    let params: any = { q };
    if (categoryId !== undefined) params.categoryId = categoryId;
    if (active !== undefined) params.active = active;
    return this.http.get<ProductResponseFull[]>(`${this.baseUrl}/search`, { params });
  }
}