import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { OrderItemResponse } from '../../models/order-item-response.model';
import { OrderItemService } from '../../services/order-item.service';

@Component({
  selector: 'app-order-item-list',
  imports: [CommonModule],
  templateUrl: './order-item-list.html',
  styleUrl: './order-item-list.scss',
})
export class OrderItemList implements OnInit {
  @Input({ required: true }) orderId!: number;

  items = signal<OrderItemResponse[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  constructor(
    private orderItemService: OrderItemService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.orderItemService
      .getByOrderId(this.orderId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  goToDetail(itemId: number): void {
    this.router.navigate(['/admin/orders', this.orderId, 'order-items', itemId, 'detail']);
  }

  goToCreate(): void {
    this.router.navigate(['/admin/orders', this.orderId, 'order-items', 'new']);
  }
}