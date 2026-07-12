import { Component, computed, signal, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { ProductRequest } from '../../models/product-request.model';
import { PageResponse } from '../../../../../shared/models/page-response.model';
import { ProductCard } from '../product-card/product-card';
import { CategoryResponse } from '../../../category/models/category-response.model';
import { CategoryService } from '../../../category/services/category.service';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, ProductCard],
  templateUrl: './product-list.html',
})
export class ProductList implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sentinel') set sentinel(el: ElementRef | undefined) {
    if (el) this.observer?.observe(el.nativeElement);
  }

  // Estado de lista (scroll infinito)
  products = signal<ProductResponseFull[]>([]);
  loading  = signal(false);
  hasMore  = signal(true);
  error    = signal(false);

  // Filtros
  query      = signal('');
  categoryId = signal<number | null>(null);
  sort       = signal('newest');
  categories = signal<CategoryResponse[]>([]);

  private page = 0;
  private observer?: IntersectionObserver;
  private search$ = new Subject<string>();

  // ── Modal creación ───────────────────────────────────────────────
  showModal   = signal(false);
  isCreating  = signal(false);
  createError = signal('');
  createForm  = signal<ProductRequest>({
    name: '', description: '', fullDescription: '',
    label: '', active: true, categoryId: 0,
  });

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.categoryService.getAll().subscribe(cats => this.categories.set(cats));

    // Búsqueda con debounce
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
    ).subscribe({
      next: res => this.handleResponse(res),
      error: () => this.error.set(true),
    });

    // Carga inicial
    this.loadPage().subscribe({
      next: res => this.handleResponse(res),
      error: () => this.error.set(true),
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

  // ── Handlers públicos ────────────────────────────────────────────
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

  goToDetail(id: number): void {
    this.router.navigate(['/manager/products', id]);
  }

  // ── Modal ────────────────────────────────────────────────────────
  openModal(): void {
    this.createForm.set({
      name: 'DEFAULT', description: 'DEFAULT', fullDescription: 'DEFAULT',
      label: 'NA', active: true, categoryId: 1
    });
    this.createError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveProduct(): void {
    this.isCreating.set(true);
    this.createError.set('');
    this.productService.create(this.createForm())
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: res => { this.closeModal(); this.goToDetail(res.id); },
        error: err => {
          console.error(err);
          this.createError.set('No se pudo crear el producto. Intenta nuevamente.');
        },
      });
  }

  patchForm(patch: Partial<ProductRequest>): void {
    this.createForm.update(v => ({ ...v, ...patch }));
  }

  onProductDeleted(id: number): void {
    this.products.update(items => items.filter(p => p.id !== id));
  }
}