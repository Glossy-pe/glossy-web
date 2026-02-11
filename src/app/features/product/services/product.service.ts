import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Product } from '../models/product.model';
import { ProductVariant } from '../models/product-variant.model';
import { ProductImage } from '../models/product-image.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  // ==================== PRODUCTOS ====================

  /**
   * Obtiene todos los productos
   */
  getProducts(label?: string): Observable<Product[]> {
    let url = this.apiUrl;
    
    if (label) {
      url += `?label=${label}`;
    }
    return this.http.get<Product[]>(url);
  }

  /**
   * Obtiene un producto por su ID
   */
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo producto
   */
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  /**
   * Actualiza un producto existente
   */
  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  /**
   * Elimina un producto
   */
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ==================== VARIANTES ====================

  /**
   * Crea una variante para un producto
   */
  createVariant(productId: number, variant: Partial<ProductVariant>): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(
      `${this.apiUrl}/${productId}/variants`,
      variant
    );
  }

  /**
   * Actualiza una variante existente
   */
  updateVariant(
    productId: number,
    variantId: number,
    variant: Partial<ProductVariant>
  ): Observable<ProductVariant> {
    return this.http.put<ProductVariant>(
      `${this.apiUrl}/${productId}/variants/${variantId}`,
      variant
    );
  }

  /**
   * Elimina una variante
   */
  deleteVariant(productId: number, variantId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${productId}/variants/${variantId}`
    );
  }

  // ==================== IMÁGENES ====================

  /**
   * Crea una imagen para un producto
   */
  createImage(productId: number, image: Partial<ProductImage>): Observable<Product> {
    return this.http.post<Product>(
      `${this.apiUrl}/${productId}/images`,
      image
    );
  }

  /**
   * Actualiza una imagen existente
   */
  updateImage(
    productId: number,
    imageId: number,
    image: Partial<ProductImage>
  ): Observable<ProductImage> {
    return this.http.put<ProductImage>(
      `${this.apiUrl}/${productId}/images/${imageId}`,
      image
    );
  }

  /**
   * Elimina una imagen
   */
  deleteImage(productId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${productId}/images/${imageId}`
    );
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Obtiene productos por categoría
   */
  getProductsByCategory(categoryId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}?categoryId=${categoryId}`);
  }

  /**
   * Busca productos por nombre
   */
  searchProducts(searchTerm: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}?search=${searchTerm}`);
  }
}