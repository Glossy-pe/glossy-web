import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryResponse } from '../models/category-response.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly baseUrl = `${environment.apiUrl}/api/manager/categories`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(this.baseUrl);
  }
}
