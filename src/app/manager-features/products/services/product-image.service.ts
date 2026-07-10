import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductImageResponse } from '../models/product-image-response.model';
import { ProductImageRequest } from '../models/product-image-request.model';

@Injectable({ providedIn: 'root' })
export class ProductImageService {

  private readonly backendUrl = `${environment.apiUrl}/api/manager/product-images`;

  constructor(private http: HttpClient) {}

  getByProductId(productId: number): Observable<ProductImageResponse[]> {
    return this.http.get<ProductImageResponse[]>(
      `${environment.apiUrl}/api/manager/products/${productId}/images`
    );
  }

  uploadAndCreate(file: File, productId: number, position: number, mainImage: boolean): Observable<ProductImageResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('position', position.toString());
    form.append('mainImage', mainImage.toString());
    form.append('productId', productId.toString());

    return this.http.post<ProductImageResponse>(this.backendUrl, form);
  }

  replaceImage(id: number, file: File): Observable<ProductImageResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.put<ProductImageResponse>(`${this.backendUrl}/${id}/image`, form);
  }

  update(id: number, request: ProductImageRequest): Observable<ProductImageResponse> {
    return this.http.put<ProductImageResponse>(`${this.backendUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.backendUrl}/${id}`);
  }
}