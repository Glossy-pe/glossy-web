import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderResponse, OrderStatus } from '../../models/order.model';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

const PENDING_STATUSES: OrderStatus[] = ['PENDIENTE_ENVIO', 'PENDIENTE_PACKAGE'];

@Component({
  selector: 'app-admin-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order-list.html',
})
export class AdminOrderList implements OnInit {

  private orderService = inject(OrderService);
  private router       = inject(Router);
  private cdr          = inject(ChangeDetectorRef);

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
    'CREATED', 'CREADO', 'ACUMULANDO',
    'PENDIENTE_PACKAGE', 'PENDIENTE_ENVIO',
    'ENVIADO', 'PAID'
  ];

  ngOnInit() {
    this.loadOrders(0);

    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.currentPage = 0;
      this.isSearchMode = !!term.trim();
      this.loadOrders(0);
    });
  }

  // ── Carga ────────────────────────────────────────────────────────────────────

  loadOrders(page: number) {
    this.isLoading.set(true);
    this.cdr.markForCheck();

    const status = this.pendingOnly()
      ? PENDING_STATUSES.join(',')
      : this.selectedStatus() || '';

    this.orderService.getAll(page, this.pageSize, this.searchTerm, status)
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
    this.searchTerm = term;
    this.search$.next(term);
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
    this.loadOrders(page);
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
}