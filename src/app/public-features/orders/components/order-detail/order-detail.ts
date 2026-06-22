import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { OrderResponseFull } from '../../models/order-response-full.model';
import { finalize } from 'rxjs';
import { OrderItemResponseFull } from '../../../order-items/models/order-item-response-full.model';

@Component({
  selector: 'app-order-detail',
  imports: [CommonModule],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {

  order = signal<OrderResponseFull | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  isExpired = signal(false);

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.hasError.set(true);
      return;
    }
    this.load(token);
  }

  load(token: string): void {
    this.isLoading.set(true);
    this.orderService.getFullByToken(token)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (order) => {
          const expired = order.expiresAt != null && new Date(order.expiresAt) < new Date();
          this.isExpired.set(expired);
          this.order.set(order);
        },
        error: () => this.hasError.set(true),
      });
  }

  getMainImage(item: OrderItemResponseFull): string | null {
  const images = item.variant?.images;
  if (!images?.length) return null;
  return (images.find(i => i.mainImage) ?? images[0]).url;
}

getProductName(item: OrderItemResponseFull): string {
  return item.variant?.toneName ?? '';
}
}