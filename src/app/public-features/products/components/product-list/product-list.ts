import { Component, computed, signal, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject, DestroyRef } from '@angular/core';
import { PageResponse } from '../../../../../shared/models/page-response.model';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { ProductCard } from '../product-card/product-card';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, defer, distinctUntilChanged, EMPTY, filter, finalize, map, Subject, switchMap, take } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryResponse } from '../../../categories/models/category-response.model';
import { CategoryService } from '../../../categories/services/category.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  private destroyRef = inject(DestroyRef);
  private request$ = new Subject<{ reset: boolean }>();

  private page = 0;
  private observer?: IntersectionObserver;
  private search$ = new Subject<string>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
  ) { }

ngOnInit(): void {
  this.categoryService.getAll()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(cats => this.categories.set(cats));

  // Único pipeline de carga
  this.request$.pipe(
    switchMap(({ reset }) => {
      if (reset) this.reset();
      // defer: loading=true se aplica DESPUÉS de cancelar el inner anterior,
      // si no, el finalize del anterior lo deja en false
      return defer(() => {
        this.loading.set(true);
        this.error.set(false);
        return this.fetch().pipe(
          catchError(() => { this.error.set(true); return EMPTY; }),
          finalize(() => this.loading.set(false)),
        );
      });
    }),
    takeUntilDestroyed(this.destroyRef),
  ).subscribe(res => this.handleResponse(res));

  // Búsqueda con debounce → solo dispara request$
  this.search$.pipe(
    map(q => q.trim()),
    debounceTime(400),
    distinctUntilChanged(),
    filter(q => q.length === 0 || q.length >= 2), // no buscar con 1 letra
    takeUntilDestroyed(this.destroyRef),
  ).subscribe(() => this.request$.next({ reset: true }));

  // URL → filtros
  this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(qp => {
    this.categoryId.set(qp.get('categoryId') ? Number(qp.get('categoryId')) : null);
    this.sort.set(qp.get('sort') ?? 'newest');
    this.request$.next({ reset: true });
  });
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

  // Handlers: todos se reducen a una línea
onSortChange(v: string) { this.sort.set(v); this.request$.next({ reset: true }); }
selectCategory(id: number | null) {
  if (this.categoryId() === id) return;
  this.categoryId.set(id);
  this.request$.next({ reset: true });
}
retry() { this.request$.next({ reset: false }); }

  private fetch() {
  const q = this.query().trim();
  if (q) {
    return this.productService.search(q, this.categoryId() ?? undefined).pipe(
      map(results => ({ content: results, page: 0, size: results.length,
        totalElements: results.length, totalPages: 1, first: true, last: true,
      } as PageResponse<ProductResponseFull>)));
  }
  return this.productService.getAllProducts(
    this.page, 12, this.categoryId() ?? undefined, this.sort() || undefined);
}


}