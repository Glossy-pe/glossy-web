import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderResponse, OrderStatus } from '../../models/order.model';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment.prod';
import { HttpClient, HttpClientModule } from '@angular/common/http';

const PENDING_STATUSES: OrderStatus[] = ['PENDIENTE_ENVIO', 'PENDIENTE_PACKAGE'];

@Component({
  selector: 'app-admin-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-order-list.html',
})
export class AdminOrderList implements OnInit {


  selectedVariantId   = signal<number | null>(null);
  selectedVariantName = signal<string>('');
  productSearchTerm   = '';
  productResults      = signal<any[]>([]);
  showVariantPicker   = signal<any | null>(null); // producto seleccionado para ver variantes
  private productSearch$ = new Subject<string>();


  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private router       = inject(Router);
  private cdr          = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  // ── Datos ────────────────────────────────────────────────────────────────────
  orders        = signal<OrderResponse[]>([]);
  isLoading     = signal(true);

  // ── Paginación ───────────────────────────────────────────────────────────────
  currentPage   = 0;
  pageSize      = 10;
  totalPages    = 0;
  totalElements = 0;

  // ── Búsqueda ─────────────────────────────────────────────────────────────────
  searchTerm    = '';
  private search$ = new Subject<string>();
  isSearchMode  = false;

  // ── Filtro por estado ────────────────────────────────────────────────────────
  selectedStatus = signal<OrderStatus | ''>('');
  showStatusMenu = signal(false);
  pendingOnly    = signal(true); // por defecto activo

  readonly allStatuses: OrderStatus[] = [
    'QUOTE','CREATED', 'CREADO', 'ACUMULANDO',
    'PENDIENTE_PACKAGE', 'PENDIENTE_ENVIO',
    'ENVIADO', 'PAID'
  ];

  ngOnInit() {
  // Leer página inicial desde URL
  this.route.queryParamMap.subscribe(params => {
    const page = parseInt(params.get('page') ?? '0', 10);
    this.loadOrders(page);
  });

  this.search$.pipe(
  debounceTime(400),
  distinctUntilChanged()
).subscribe(() => {
  this.loadOrders(0); // ← directo, sin pasar por URL
});

this.productSearch$.pipe(
  debounceTime(350),
  distinctUntilChanged(),
  switchMap(term => {
    if (!term.trim()) { this.productResults.set([]); return of(null); }
    return this.http.get<any>(
      `${environment.apiUrl}/products/full/search?q=${encodeURIComponent(term)}&size=10`
    ).pipe(catchError(() => of(null)));
  })
).subscribe(res => {
  if (res) this.productResults.set(res.content.filter((p: any) => p.active));
});

}

  // ── Carga ────────────────────────────────────────────────────────────────────

  loadOrders(page: number) {
    this.isLoading.set(true);
    this.cdr.markForCheck();

    const status = this.pendingOnly()
      ? PENDING_STATUSES.join(',')
      : this.selectedStatus() || '';

    this.orderService.getAll(page, this.pageSize, this.searchTerm, status, this.selectedVariantId() ?? undefined)
      .subscribe({
        next: (res: PageResponse<OrderResponse>) => {
          this.orders.set(res.content);
          this.totalPages    = res.totalPages;
          this.totalElements = res.totalElements;
          this.currentPage   = res.number;
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error(err);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  // ── Búsqueda ─────────────────────────────────────────────────────────────────

  onSearchInput(term: string) {
  this.searchTerm = term.trim();

  if (this.searchTerm) {
    // Al escribir → limpia todos los filtros y va a página 0
    this.pendingOnly.set(false);
    this.selectedStatus.set('');
    this.currentPage = 0;
  }

  this.search$.next(this.searchTerm);
}

  // ── Filtro estado ────────────────────────────────────────────────────────────

  togglePendingOnly() {
    this.pendingOnly.update(v => !v);
    if (this.pendingOnly()) this.selectedStatus.set('');
    this.currentPage = 0;
    this.loadOrders(0);
  }

  selectStatus(status: OrderStatus | '') {
    this.selectedStatus.set(status);
    this.pendingOnly.set(false);
    this.showStatusMenu.set(false);
    this.currentPage = 0;
    this.loadOrders(0);
  }

  clearStatusFilter() {
    this.selectedStatus.set('');
    this.pendingOnly.set(false);
    this.currentPage = 0;
    this.loadOrders(0);
  }

  get activeFilterLabel(): string {
    if (this.pendingOnly()) return 'Pendientes';
    if (this.selectedStatus()) return this.selectedStatus() as string;
    return 'Todos';
  }

  // ── Paginación ───────────────────────────────────────────────────────────────

  goToPage(page: number) {
  if (page < 0 || page >= this.totalPages) return;
  
  // 👇 actualiza la URL, no recarga el componente
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { page },
    queryParamsHandling: 'merge',
    replaceUrl: false
  });
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  get visiblePages(): number[] {
    return this.pages.filter(p => p >= this.currentPage - 2 && p <= this.currentPage + 2);
  }

  // ── Acciones ─────────────────────────────────────────────────────────────────

  goToCreate() { this.router.navigate(['/admin/orders/new']); }

  viewOrder(id: number) { this.router.navigate(['/admin/orders', id]); }

  deleteOrder(id: number) {
    if (!confirm('¿Eliminar esta orden?')) return;
    this.orderService.delete(id).subscribe({
      next: () => this.loadOrders(this.currentPage),
      error: () => alert('No se pudo eliminar la orden')
    });
  }

  getSeparationStatus(order: OrderResponse): 'all' | 'partial' | 'none' {
  const items = order.orderItems;
  if (!items?.length) return 'none';
  const fullySepped = items.filter(i => i.separatedQuantity >= i.quantity).length;
  if (fullySepped === 0) return 'none';
  if (fullySepped === items.length) return 'all';
  return 'partial';
}

getPackedStatus(order: OrderResponse): 'all' | 'partial' | 'none' {
  const items = order.orderItems;
  if (!items?.length) return 'none';
  const fullyPacked = items.filter(i => i.packedQuantity >= i.quantity).length;
  if (fullyPacked === 0) return 'none';
  if (fullyPacked === items.length) return 'all';
  return 'partial';
}

getPaymentStatus(order: OrderResponse): 'paid' | 'partial' | 'none' {
  const items = order.orderItems;
  if (!items?.length) return 'none';
  const totalAmount = items.reduce((acc, i) => acc + i.productVariant.price * i.quantity, 0);
  const paidAmount  = items.reduce((acc, i) => acc + (i.amountPaid ?? 0), 0);
  if (paidAmount <= 0) return 'none';
  if (paidAmount >= totalAmount) return 'paid';
  return 'partial';
}

onProductSearchInput(term: string) {
  this.productSearchTerm = term;
  this.showVariantPicker.set(null);
  this.productSearch$.next(term);
}

selectProductForVariant(product: any) {
  this.showVariantPicker.set(product);
  this.productResults.set([]);
}

selectVariant(variant: any, productName: string) {
  this.selectedVariantId.set(variant.id);
  this.selectedVariantName.set(`${productName} · ${variant.toneName}`);
  this.productSearchTerm = `${productName} · ${variant.toneName}`;
  this.showVariantPicker.set(null);
  this.pendingOnly.set(false);
  this.selectedStatus.set('');
  this.currentPage = 0;
  this.loadOrders(0);
}

clearVariantFilter() {
  this.selectedVariantId.set(null);
  this.selectedVariantName.set('');
  this.productSearchTerm = '';
  this.showVariantPicker.set(null);
  this.productResults.set([]);
  this.currentPage = 0;
  this.loadOrders(0);
}
}