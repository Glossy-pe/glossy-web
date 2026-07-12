import { Component, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { PageResponse } from '../../../../../shared/models/page-response.model';
import { OrderStatusResponse } from '../../models/order-status-response.model';
import { OrderResponseFull } from '../../models/order-response-full.model';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-order-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList implements OnInit {

  private searchSubject = new Subject<string>();
  @ViewChild('statusSelect') statusSelect!: ElementRef<HTMLSelectElement>;

  search = signal('');
  page = signal<PageResponse<OrderResponseFull> | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  isCreating = signal(false);
  currentPage = signal(0);
  readonly pageSize = 10;
  showCreateConfirm = signal(false);
  newCustomerName = signal('');

  statuses = signal<OrderStatusResponse[]>([]);          // 👈
  selectedStatusId = signal<number | undefined>(2);

  isPaid = signal<boolean | undefined>(undefined);
  isSeparated = signal<boolean | undefined>(undefined);
  isPacked = signal<boolean | undefined>(undefined);

  @Input() variantId: number | undefined;

  constructor(
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadStatuses();   // 👈

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(value => {
        this.search.set(value);
        this.currentPage.set(0);
        this.loadOrders();
      });

    this.loadOrders();
  }

  loadStatuses(): void {   // 👈
    this.orderService.getStatuses().subscribe(res => {
      this.statuses.set(res);
    });
  }

  onStatusChange(value: string): void {   // 👈
    this.selectedStatusId.set(value ? +value : undefined);
    this.currentPage.set(0);
    this.loadOrders();
  }

toggleFilter(filter: 'isPaid' | 'isSeparated' | 'isPacked'): void {
  const map = {
    isPaid: this.isPaid,
    isSeparated: this.isSeparated,
    isPacked: this.isPacked,
  };

  const signal = map[filter];
  const current = signal();

  let next: boolean | undefined;

  if (current === undefined) {
    next = true;
  } else if (current === true) {
    next = false;
  } else {
    next = undefined;
  }

  signal.set(next);
  this.currentPage.set(0);
  this.loadOrders();
}

  loadOrders(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.orderService
      .getAll(
        this.currentPage(),
        this.pageSize,
        this.search(),
        this.variantId,
        this.selectedStatusId(),   // 👈
        this.isPaid(),
        this.isSeparated(),
        this.isPacked()
      )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (p) => this.page.set(p),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  createDefault(): void {
    this.isCreating.set(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    this.orderService
      .create({
        customerName: 'DEFAULT',
        customerAddress: 'NA',
        description: 'NA',
        orderCode: '',
        orderStatusId: 1,
        costTotal: 0,
        total: 0,
        expiresAt: expiresAt.toISOString(),
      })
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: (order) => this.router.navigate(['/manager/orders', order.id]),
        error: (err) => console.error(err),
      });
  }

  goToDetail(id: number): void {
    this.router.navigate(['/manager/orders', id]);
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.loadOrders();
    }
  }

  nextPage(): void {
    const p = this.page();
    if (p && !p.last) {
      this.currentPage.update(p => p + 1);
      this.loadOrders();
    }
  }

  onSearch(value: string): void {
    this.selectedStatusId.set(undefined);
    // this.isPaid.set(undefined);
    // this.isSeparated.set(undefined);
    // this.isPacked.set(undefined);
    if (this.statusSelect) {
      this.statusSelect.nativeElement.value = '';
    }
    this.searchSubject.next(value.trim());
  }


  confirmCreate(): void {
    this.showCreateConfirm.set(true);
    this.newCustomerName.set('');
  }

  cancelCreate(): void {
    this.showCreateConfirm.set(false);
  }

  confirmAndCreate(): void {
    const name = this.newCustomerName().trim();
    if (!name) return;
    this.showCreateConfirm.set(false);
    this.createDefaultWithName(name);
  }

  createDefaultWithName(customerName: string): void {
  this.isCreating.set(true);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  this.orderService
    .create({
      customerName,
      customerAddress: 'NA',
      description: 'NA',
      orderCode: '',
      orderStatusId: 1,
      costTotal: 0,
      total: 0,
      expiresAt: expiresAt.toISOString(),
    })
    .pipe(finalize(() => this.isCreating.set(false)))
    .subscribe({
      next: (order) => this.router.navigate(['/manager/orders', order.id]),
      error: (err) => console.error(err),
    });
}

  getTotalQuantity(order: OrderResponseFull): number {
    return order.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  getSeparatedQuantity(order: OrderResponseFull): number {
    return order.items.reduce((sum, i) => sum + i.separatedQuantity, 0);
  }

  getPackedQuantity(order: OrderResponseFull): number {
    return order.items.reduce((sum, i) => sum + i.packedQuantity, 0);
  }

  getPaidAmount(order: OrderResponseFull): number {
    return order.items.reduce((sum, i) => sum + (i.amountPaid ?? 0), 0);
  }
}