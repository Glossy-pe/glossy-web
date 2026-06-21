import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { ProductRequest } from '../../models/product-request.model';
import { PageResponse } from '../../../../../shared/models/page-response.model';
import { ProductCard } from "../product-card/product-card";

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, ProductCard],
  templateUrl: './product-list.html',
})
export class ProductList implements OnInit, OnDestroy {

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

  // ── Modal creación ───────────────────────────────────────────────
  showModal   = signal(false);
  isCreating  = signal(false);
  createError = signal('');
  createForm  = signal<ProductRequest>({
    name: '', description: '', fullDescription: '',
    label: '', active: true, categoryId: 0,
  });

  private search$ = new Subject<string>();

  constructor(
    private productService: ProductService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadPage(0);
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q.trim()) {
          this.isSearching.set(false);
          this.searchResults.set([]);
          return [];
        }
        this.isSearching.set(true);
        this.isLoading.set(true);
        return this.productService.search(q).pipe(
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

  // ── Lista / búsqueda ─────────────────────────────────────────────
  onQueryChange(value: string): void {
    this.query.set(value);
    this.search$.next(value);
  }

  loadPage(page: number): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.productService.getAllProducts(page, this.pageSize)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: data => { this.pageData.set(data); this.currentPage.set(page); },
        error: err => { console.error(err); this.hasError.set(true); },
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
        next: res => { this.closeModal(); this.loadPage(0); this.goToDetail(res.id); },
        error: err => {
          console.error(err);
          this.createError.set('No se pudo crear el producto. Intenta nuevamente.');
        },
      });
  }

  patchForm(patch: Partial<ProductRequest>): void {
    this.createForm.update(v => ({ ...v, ...patch }));
  }

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

  onProductDeleted(id: number): void {
    this.pageData.update(pd =>
      pd ? { ...pd, content: pd.content.filter(p => p.id !== id), totalElements: pd.totalElements - 1 } : pd
    );
    // Si también puede estar en modo búsqueda:
    this.searchResults.update(items => items.filter(p => p.id !== id));
  }
}