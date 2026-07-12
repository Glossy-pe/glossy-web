import { Component, computed, signal, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { PageResponse } from '../../../../../shared/models/page-response.model';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { ProductCard } from '../product-card/product-card';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, EMPTY, finalize, map, Subject, switchMap, take } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryResponse } from '../../../categories/models/category-response.model';
import { CategoryService } from '../../../categories/services/category.service';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sentinel') set sentinel(el: ElementRef | undefined) {
    if (el) this.observer?.observe(el.nativeElement);
  }

  // Estado — solo lo esencial
  products = signal<ProductResponseFull[]>([]);
  loading = signal(false);
  hasMore = signal(true);
  error = signal(false);

  // Filtros
  query = signal('');
  categoryId = signal<number | null>(null);
  sort = signal('newest');
  categories = signal<CategoryResponse[]>([]);

  private page = 0;
  private observer?: IntersectionObserver;
  private search$ = new Subject<string>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
  ) { }

ngOnInit(): void {
  this.categoryService.getAll().subscribe(cats => this.categories.set(cats));

  // Search con debounce
  this.search$.pipe(
    debounceTime(400),
    distinctUntilChanged(),
    switchMap(q => {
      this.reset();
      if (!q.trim()) return this.loadPage();
      return this.productService.search(q, this.categoryId() ?? undefined).pipe(
        map(results => ({
          content: results,
          page: 0,
          size: results.length,
          totalElements: results.length,
          totalPages: 1,
          first: true,
          last: true,
        } as PageResponse<ProductResponseFull>))
      );
    })
  ).subscribe({                                    // ← faltaba esto
    next: res => this.handleResponse(res),
    error: () => this.error.set(true),
  });

  // Carga inicial + reacción a cambios de URL
  this.route.queryParamMap.subscribe(qp => {
    const newCategoryId = qp.get('categoryId') ? Number(qp.get('categoryId')) : null;
    const newSort = qp.get('sort') ?? 'newest';

    this.categoryId.set(newCategoryId);
    this.sort.set(newSort);
    this.reset();
    this.loadPage().subscribe({
      next: res => this.handleResponse(res),
      error: () => this.error.set(true),
    });
  });

    // ← ELIMINA el loadPage() que estaba aquí suelto
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.loading() && this.hasMore()) {
        this.loadPage().subscribe({
          next: res => this.handleResponse(res),
          error: () => this.error.set(true),
        });
      }
    }, { rootMargin: '300px' });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.search$.complete();
  }

  private loadPage() {
    this.loading.set(true);
    this.error.set(false);
    return this.productService
      .getAllProducts(this.page, 12, this.categoryId() ?? undefined, this.sort() || undefined)
      .pipe(finalize(() => this.loading.set(false)));
  }

  private handleResponse(res: PageResponse<ProductResponseFull>) {
    this.products.update(prev => [...prev, ...res.content]);
    this.hasMore.set(!res.last);
    this.page = res.page + 1;
  }

  private reset() {
    this.products.set([]);
    this.page = 0;
    this.hasMore.set(true);
    this.error.set(false);
  }

  // Handlers públicos
  onQueryChange(value: string): void {
    this.query.set(value);
    this.search$.next(value);
  }

  onSortChange(value: string): void {
    this.sort.set(value);
    this.reset();
    this.loadPage().subscribe({
      next: res => this.handleResponse(res),
      error: () => this.error.set(true),
    });
  }

  selectCategory(id: number | null): void {
    if (this.categoryId() === id) return;
    this.categoryId.set(id);
    this.reset();
    this.loadPage().subscribe({
      next: res => this.handleResponse(res),
      error: () => this.error.set(true),
    });
  }

  retry(): void {
    this.loadPage().subscribe({
      next: res => this.handleResponse(res),
      error: () => this.error.set(true),
    });
  }
}