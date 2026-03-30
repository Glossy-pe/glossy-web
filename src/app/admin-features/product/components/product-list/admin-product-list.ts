import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface VariantImageResponse {
  id: number;
  variantId: number;
  url: string;
  position: number;
  mainImage: boolean;
}

interface VariantResponseFull {
  id: number;
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  stock: number;
  position: number;
  active: boolean;
  images: VariantImageResponse[];
}

interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  label: string;
  active: boolean;
  categoryId: number;
  variants: VariantResponseFull[];
}

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
}

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './admin-product-list.html',
  styleUrl: './admin-product-list.scss'
})
export class AdminProductList implements OnInit {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);

  private apiUrl = `${environment.apiUrl}/products`;

  products:      ProductResponseFull[] = [];
  isLoading      = false;

  // Paginación
  currentPage    = 0;
  pageSize       = 10;
  totalPages     = 0;
  totalElements  = 0;

  // Búsqueda
  searchTerm     = '';
  private search$ = new Subject<string>();
  isSearchMode   = false;

  ngOnInit() {
    this.loadProducts(0);

    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.currentPage = 0;
      if (term.trim()) {
        this.isSearchMode = true;
        this.searchProducts(term.trim(), 0);
      } else {
        this.isSearchMode = false;
        this.loadProducts(0);
      }
    });
  }

  loadProducts(page: number) {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.http.get<PageResponse<ProductResponseFull>>(
      `${this.apiUrl}/full?page=${page}&size=${this.pageSize}`
    ).subscribe({
      next: (res) => {
        this.products      = res.content;
        this.totalPages    = res.totalPages;
        this.totalElements = res.totalElements;
        this.currentPage   = res.number;
        this.isLoading     = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  searchProducts(q: string, page: number) {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.http.get<PageResponse<ProductResponseFull>>(
      `${this.apiUrl}/full/search?q=${encodeURIComponent(q)}&page=${page}&size=${this.pageSize}`
    ).subscribe({
      next: (res) => {
        this.products      = res.content;
        this.totalPages    = res.totalPages;
        this.totalElements = res.totalElements;
        this.currentPage   = res.number;
        this.isLoading     = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchInput(term: string) {
    this.search$.next(term);
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages) return;
    if (this.isSearchMode) {
      this.searchProducts(this.searchTerm, page);
    } else {
      this.loadProducts(page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToDetail(product: ProductResponseFull) {
    this.router.navigate([`/admin/products/${product.id}`]);
  }

  goToCreateNewProduct() {
    this.router.navigate([`/admin/products/new`]);
  }

  deleteProduct(id: number, event: Event) {
    event.stopPropagation();
    if (!confirm('¿Eliminar este producto?')) return;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        if (this.isSearchMode) {
          this.searchProducts(this.searchTerm, this.currentPage);
        } else {
          this.loadProducts(this.currentPage);
        }
      },
      error: (err) => { console.error(err); alert('Error al eliminar'); }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getMainImage(product: ProductResponseFull): string {
    for (const v of product.variants || []) {
      const main = v.images?.find(i => i.mainImage);
      if (main) return main.url;
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23e2e8f0" width="150" height="150"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="12"%3ESin imagen%3C/text%3E%3C/svg%3E';
  }

  getTotalStock(p: ProductResponseFull)  { return p.variants?.reduce((a, v) => a + v.stock, 0) || 0; }
  getMinPrice(p: ProductResponseFull)    { return Math.min(...(p.variants?.map(v => v.price) || [0])); }
  getMaxPrice(p: ProductResponseFull)    { return Math.max(...(p.variants?.map(v => v.price) || [0])); }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  get visiblePages(): number[] {
    return this.pages.filter(p => p >= this.currentPage - 2 && p <= this.currentPage + 2);
  }
}