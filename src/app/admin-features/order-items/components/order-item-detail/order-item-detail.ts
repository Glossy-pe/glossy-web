import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { OrderItemResponse } from '../../models/order-item-response.model';
import { OrderItemService } from '../../services/order-item.service';

@Component({
  selector: 'app-order-item-detail',
  imports: [CommonModule],
  templateUrl: './order-item-detail.html',
  styleUrl: './order-item-detail.scss',
})
export class OrderItemDetail implements OnInit {
  item = signal<OrderItemResponse | null>(null);
  isLoading = signal(false);
  isDeleting = signal(false);
  hasError = signal(false);
  showDeleteConfirm = signal(false);

  private itemId = 0;
  private orderId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderItemService: OrderItemService
  ) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.itemId = Number(this.route.snapshot.paramMap.get('itemId'));
    if (this.itemId) this.loadItem();
  }

  loadItem(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.orderItemService
      .getById(this.itemId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (i) => this.item.set(i),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  goToEdit(): void {
    this.router.navigate(['/admin/orders', this.orderId, 'order-items', this.itemId, 'edit']);
  }

  confirmDelete(): void { this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); }

  deleteItem(): void {
    this.isDeleting.set(true);
    this.orderItemService
      .delete(this.itemId)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/admin/orders', this.orderId]),
        error: (err) => console.error(err),
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/orders', this.orderId]);
  }
}