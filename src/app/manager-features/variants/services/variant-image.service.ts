import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VariantImageResponse } from '../models/variant-image-response.model';
import { VariantImageRequest } from '../models/variant-image-request.model';

@Injectable({ providedIn: 'root' })
export class VariantImageService {

  private readonly backendUrl = `${environment.apiUrl}/api/manager/variant-images`;

  constructor(private http: HttpClient) {}

  getByVariantId(variantId: number): Observable<VariantImageResponse[]> {
    return this.http.get<VariantImageResponse[]>(
      `${environment.apiUrl}/api/manager/variants/${variantId}/images`
    );
  }

  uploadAndCreate(file: File, variantId: number, position: number, mainImage: boolean): Observable<VariantImageResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('position', position.toString());
    form.append('mainImage', mainImage.toString());
    form.append('productVariantId', variantId.toString());

    return this.http.post<VariantImageResponse>(this.backendUrl, form);
  }

  replaceImage(id: number, file: File): Observable<VariantImageResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.put<VariantImageResponse>(`${this.backendUrl}/${id}/image`, form);
  }

  update(id: number, request: VariantImageRequest): Observable<VariantImageResponse> {
    return this.http.put<VariantImageResponse>(`${this.backendUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.backendUrl}/${id}`);
  }
}