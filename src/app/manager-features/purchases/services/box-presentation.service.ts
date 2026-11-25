import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BoxPresentationResponse, SaleTemplateRequest, SaleTemplateResponse,
} from '../models/box-presentation.model';

@Injectable({ providedIn: 'root' })
export class BoxPresentationService {
  private readonly api = `${environment.apiUrl}/api/manager`;

  constructor(private http: HttpClient) {}

  // Presentación BOX
  getPresentation(productId: number): Observable<BoxPresentationResponse> {
    return this.http.get<BoxPresentationResponse>(`${this.api}/box-presentations`, { params: { productId } });
  }

  savePresentation(productId: number, totalUnits: number): Observable<BoxPresentationResponse> {
    return this.http.put<BoxPresentationResponse>(`${this.api}/box-presentations/${productId}`, { totalUnits });
  }

  // Plantillas de venta
  getTemplates(productId: number): Observable<SaleTemplateResponse[]> {
    return this.http.get<SaleTemplateResponse[]>(`${this.api}/sale-templates`, { params: { productId } });
  }

  createTemplate(request: SaleTemplateRequest): Observable<SaleTemplateResponse> {
    return this.http.post<SaleTemplateResponse>(`${this.api}/sale-templates`, request);
  }

  updateTemplate(id: number, request: SaleTemplateRequest): Observable<SaleTemplateResponse> {
    return this.http.put<SaleTemplateResponse>(`${this.api}/sale-templates/${id}`, request);
  }

  deactivateTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/sale-templates/${id}`);
  }

  // Variantes del producto (endpoint que ya existe en tu backend)
  getVariants(productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/products/${productId}/variants`);
  }
}