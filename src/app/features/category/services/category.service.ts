import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../models/category.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  
  private readonly API_URL = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  /**
   * GET: obtener todas las categorías
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.API_URL);
  }

  /**
   * GET: obtener una categoría por id
   */
  getCategoryById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.API_URL}/${id}`);
  }

  /**
   * POST: crear una nueva categoría
   */
  createCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(this.API_URL, category);
  }
}
