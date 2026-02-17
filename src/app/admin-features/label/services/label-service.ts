import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LabelRequest, LabelResponse } from '../models/label.interface';
import { environment } from '../../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class LabelService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/labels`;

  getAll(): Observable<LabelResponse[]> {
    return this.http.get<LabelResponse[]>(this.apiUrl);
  }

  create(label: LabelRequest): Observable<LabelResponse> {
    return this.http.post<LabelResponse>(this.apiUrl, label);
  }

  update(id: number, label: LabelRequest): Observable<LabelResponse> {
    // Tu OpenAPI especifica PUT para labels
    return this.http.put<LabelResponse>(`${this.apiUrl}/${id}`, label);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}