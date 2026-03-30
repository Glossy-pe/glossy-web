import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Product } from '../models/product.model';
import { ProductVariant } from '../models/product-variant-response.model';
import { ProductImage } from '../models/product-image.model';

@Injectable({
  providedIn: 'root',
})
export class VariantService {
  private apiUrl = `${environment.apiUrl}/variants`;

  constructor(private http: HttpClient) {}

  // GET ALL
  getAll(): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(this.apiUrl);
  }

  // GET BY ID
  getById(id: number): Observable<ProductVariant> {
    return this.http.get<ProductVariant>(`${this.apiUrl}/${id}`);
  }

  // GET BY PRODUCT ID
  getByProductId(productId: number): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(`${this.apiUrl}?productId=${productId}`);
  }

  // CREATE
  create(variant: ProductVariant): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(this.apiUrl, variant);
  }

  // UPDATE
  update(id: number, variant: ProductVariant): Observable<ProductVariant> {
    return this.http.put<ProductVariant>(`${this.apiUrl}/${id}`, variant);
  }

  // DELETE
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
