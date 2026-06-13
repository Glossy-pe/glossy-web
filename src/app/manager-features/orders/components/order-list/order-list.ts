import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { OrderResponse } from '../../models/order-response.model';
import { PageResponse } from '../../../../../shared/models/page-response.model';

@Component({
  selector: 'app-order-list',
  imports: [CommonModule],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList implements OnInit {
  page = signal<PageResponse<OrderResponse> | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  isCreating = signal(false);
  currentPage = signal(0);
  readonly pageSize = 10;

  constructor(
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.orderService
      .getAll(this.currentPage(), this.pageSize)
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

    this.orderService
      .create({
        customerName: 'DEFAULT',
        customerAddress: 'NA',
        orderCode: '',
        orderStatusId: 1,
        costTotal: 0,
        total: 0,
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
}