import { Injectable } from "@angular/core";
import { PageResponse } from "../../../../shared/models/page-response.model";
import { environment } from "../../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { ProductResponseFull } from "../models/product-response-full.model";
import { catchError, Observable, shareReplay, throwError } from "rxjs";
import { ProductResponse } from "../models/product-response.model";


@Injectable({
  providedIn: 'root',
})
export class ProductService {
    private readonly baseUrl = `${environment.apiUrl}/api/guest/products`;
private detailCache = new Map<number, { at: number; req$: Observable<ProductResponseFull> }>();
private static readonly DETAIL_TTL_MS = 60_000;
  constructor(private http: HttpClient) {}

  getAllProducts(
    page: number = 0,
    size: number = 10,
    categoryId?: number,
    sort?: string
  ): Observable<PageResponse<ProductResponseFull>> {
    let params: any = { page, size };
    if (categoryId != null) params.categoryId = categoryId;
    if (sort)              params.sort = sort;
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
  


  getByIdCached(id: number): Observable<ProductResponseFull> {
  const hit = this.detailCache.get(id);
  if (hit && Date.now() - hit.at < ProductService.DETAIL_TTL_MS) return hit.req$;

  const req$ = this.getById(id).pipe(
    catchError(err => {
      this.detailCache.delete(id);   // no cachear errores
      return throwError(() => err);
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  this.detailCache.set(id, { at: Date.now(), req$ });
  return req$;
}
}
