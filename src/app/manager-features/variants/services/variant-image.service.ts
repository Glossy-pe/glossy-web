import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { VariantImageResponse } from '../models/variant-image-response.model';
import { VariantImageRequest } from '../models/variant-image-request.model';

@Injectable({ providedIn: 'root' })
export class VariantImageService {

  private readonly backendUrl = `${environment.apiUrl}/api/manager/variant-images`;
  private readonly cloudName = environment.cloudinaryCloudName;
  private readonly uploadPreset = environment.cloudinaryUploadPreset;
  private readonly cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  constructor(private http: HttpClient) {}

  getByVariantId(variantId: number): Observable<VariantImageResponse[]> {
    return this.http.get<VariantImageResponse[]>(
      `${environment.apiUrl}/api/manager/variants/${variantId}/images`
    );
  }

  uploadAndCreate(file: File, variantId: number, position: number, mainImage: boolean): Observable<VariantImageResponse> {
    const isVideo = file.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', this.uploadPreset);
    form.append('folder', `variants/${variantId}`);

    return this.http.post<{ secure_url: string }>(cloudinaryUrl, form).pipe(
      switchMap(({ secure_url }) =>
        this.create({ url: secure_url, position, mainImage, productVariantId: variantId, resourceType })
      )
    );
  }

  create(request: VariantImageRequest): Observable<VariantImageResponse> {
    return this.http.post<VariantImageResponse>(this.backendUrl, request);
  }

  update(id: number, request: VariantImageRequest): Observable<VariantImageResponse> {
    return this.http.put<VariantImageResponse>(`${this.backendUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.backendUrl}/${id}`);
  }
}