import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductImageResponse } from '../models/product-image-response.model';
import { ProductImageRequest } from '../models/product-image-request.model';

@Injectable({ providedIn: 'root' })
export class ProductImageService {

  private readonly backendUrl = `${environment.apiUrl}/api/manager/product-images`;
  private readonly cloudName = environment.cloudinaryCloudName; // 'dqyqtgkdk'
  private readonly uploadPreset = environment.cloudinaryUploadPreset; // 'glossy_upload_preset'
  private readonly cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  constructor(private http: HttpClient) {}

  getByProductId(productId: number): Observable<ProductImageResponse[]> {
    return this.http.get<ProductImageResponse[]>(
      `${environment.apiUrl}/api/manager/products/${productId}/images`
    );
  }

  uploadAndCreate(file: File, productId: number, position: number, mainImage: boolean): Observable<ProductImageResponse> {
    const isVideo = file.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', this.uploadPreset);
    form.append('folder', `products/${productId}`);

    return this.http.post<{ secure_url: string }>(cloudinaryUrl, form).pipe(
      switchMap(({ secure_url }) =>
        this.create({ url: secure_url, position, mainImage, productId, resourceType })
      )
    );
  }

  create(request: ProductImageRequest): Observable<ProductImageResponse> {
    return this.http.post<ProductImageResponse>(this.backendUrl, request);
  }

  update(id: number, request: ProductImageRequest): Observable<ProductImageResponse> {
    return this.http.put<ProductImageResponse>(`${this.backendUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.backendUrl}/${id}`);
  }
}