import { Injectable } from "@angular/core";
import { PageResponse } from "../../../../shared/models/page-response.model";
import { environment } from "../../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { ProductResponseFull } from "../models/product-response-full.model";
import { Observable } from "rxjs";
import { ProductResponse } from "../models/product-response.model";


@Injectable({
  providedIn: 'root',
})
export class ProductService {
    private readonly baseUrl = `${environment.apiUrl}/api/guest/products`;

  constructor(private http: HttpClient) {}

  getAllProducts(page: number = 0, size: number = 10, categoryId?: number): Observable<PageResponse<ProductResponseFull>> {
    let params: any = { page, size };
    if (categoryId !== undefined && categoryId !== null) params.categoryId = categoryId;

    return this.http.get<PageResponse<ProductResponseFull>>(this.baseUrl + '/full', { params });
  }

  search(q: string, categoryId?: number, active?: boolean): Observable<ProductResponseFull[]> {
    let params: any = { q };
    if (categoryId !== undefined) params.categoryId = categoryId;
    if (active !== undefined) params.active = active;
    return this.http.get<ProductResponseFull[]>(`${this.baseUrl}/search`, { params });
  }

    getById(id: number): Observable<ProductResponseFull> {
    return this.http.get<ProductResponseFull>(`${this.baseUrl}/${id}`);
  }
}
