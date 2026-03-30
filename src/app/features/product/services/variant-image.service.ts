import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { VariantImageResponse } from '../models/variant-image-response.model';

@Injectable({
  providedIn: 'root',
})
export class VariantImageService {
  private apiUrl = `${environment.apiUrl}/variant-images`;

  constructor(private http: HttpClient) {}

  // GET ALL
  getAll(): Observable<VariantImageResponse[]> {
    return this.http.get<VariantImageResponse[]>(this.apiUrl);
  }

  // GET BY ID
  getById(imageId: number): Observable<VariantImageResponse> {
    return this.http.get<VariantImageResponse>(`${this.apiUrl}/${imageId}`);
  }

  // CREATE
  create(image: VariantImageResponse): Observable<VariantImageResponse> {
    return this.http.post<VariantImageResponse>(this.apiUrl, image);
  }

  // UPDATE
  update(imageId: number, image: VariantImageResponse): Observable<VariantImageResponse> {
    return this.http.put<VariantImageResponse>(`${this.apiUrl}/${imageId}`, image);
  }

  // DELETE
  delete(imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${imageId}`);
  }
}
