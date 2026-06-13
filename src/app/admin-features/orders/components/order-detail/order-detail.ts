import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { OrderResponse } from '../../models/order-response.model';
import { OrderItemList } from "../../../order-items/components/order-item-list/order-item-list";

@Component({
  selector: 'app-order-detail',
  imports: [CommonModule, OrderItemList],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {
  order = signal<OrderResponse | null>(null);
  isLoading = signal(false);
  isDeleting = signal(false);
  hasError = signal(false);
  showDeleteConfirm = signal(false);

  private orderId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.orderId) this.loadOrder();
  }

  loadOrder(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.orderService
      .getById(this.orderId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (o) => this.order.set(o),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  goToEdit(): void {
    this.router.navigate(['/admin/orders', this.orderId, 'edit']);
  }

  confirmDelete(): void { this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); }

  deleteOrder(): void {
    this.isDeleting.set(true);
    this.orderService
      .delete(this.orderId)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/admin/orders']),
        error: (err) => console.error(err),
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/orders']);
  }
}