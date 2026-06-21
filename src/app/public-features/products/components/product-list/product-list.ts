import { Component, computed, signal } from '@angular/core';
import { PageResponse } from '../../../../../shared/models/page-response.model';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { ProductCard } from '../product-card/product-card';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, EMPTY, finalize, Subject, switchMap } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { Router } from '@angular/router';
import { CategoryResponse } from '../../../categories/models/category-response.model';
import { CategoryService } from '../../../categories/services/category.service';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  // ── Estado de lista ──────────────────────────────────────────────
  pageData      = signal<PageResponse<ProductResponseFull> | null>(null);
  searchResults = signal<ProductResponseFull[]>([]);
  currentPage   = signal(0);
  readonly pageSize = 12;

  // ── Estado UI ────────────────────────────────────────────────────
  query      = signal('');
  isSearching = signal(false);
  isLoading  = signal(false);
  hasError   = signal(false);

  // ── Nuevo: categorías ───────────────────────────────────────────
  categories         = signal<CategoryResponse[]>([]);
  selectedCategoryId = signal<number | null>(null);


  private search$ = new Subject<{ query: string; categoryId: number | null }>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadPage(0);

    this.categoryService.getAll().subscribe({
      next: cats => this.categories.set(cats),
      error: err => console.error('Error cargando categorías', err),
    });

    this.search$.pipe(
    debounceTime(400),
    distinctUntilChanged((a, b) => a.query === b.query && a.categoryId === b.categoryId),
    switchMap(({ query, categoryId }) => {
      if (!query.trim()) {
        this.isSearching.set(false);
        this.searchResults.set([]);
        return EMPTY;
      }
      this.isSearching.set(true);
      this.isLoading.set(true);
      return this.productService.search(query, categoryId ?? undefined).pipe(
        finalize(() => this.isLoading.set(false))
      );
    }),
  ).subscribe({
    next: results => this.searchResults.set(results),
    error: err => { console.error(err); this.hasError.set(true); },
  });
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }

  // ── Nuevo: selección de categoría ───────────────────────────────
  selectCategory(categoryId: number | null): void {
    if (this.selectedCategoryId() === categoryId) return;
    this.selectedCategoryId.set(categoryId);

    if (this.isSearching()) {
      this.search$.next({ query: this.query(), categoryId });
    } else {
      this.loadPage(0);
    }
  }

  // ── Lista / búsqueda ─────────────────────────────────────────────
  onQueryChange(value: string): void {
    this.query.set(value);
    this.search$.next({ query: value, categoryId: this.selectedCategoryId() });
  }

  loadPage(page: number): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.productService.getAllProducts(page, this.pageSize, this.selectedCategoryId() ?? undefined)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: data => { this.pageData.set(data); this.currentPage.set(page); },
        error: err => { console.error(err); this.hasError.set(true); },
      });
  }

  // ── Modal ────────────────────────────────────────────────────────

  pages = computed<number[]>(() => {
    const total = this.pageData()?.totalPages ?? 0;
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);

    const result: number[] = [0];
    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);

    if (start > 1) result.push(-1); // -1 = elipsis
    for (let i = start; i <= end; i++) result.push(i);
    if (end < total - 2) result.push(-1);

    result.push(total - 1);
    return result;
  });

}
