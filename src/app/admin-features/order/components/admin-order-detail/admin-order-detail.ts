import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderResponse } from '../../models/order.model';
import { catchError, of } from 'rxjs';
import { PdfGeneratorService } from '../../../../features/cart/services/pdf-generator.service';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-order-detail.html',
})
export class AdminOrderDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
private pdfService = inject(PdfGeneratorService);

  order = signal<OrderResponse | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(Number(id));
    }
  }

  loadOrder(id: number) {
    this.orderService.getById(id).pipe(
      catchError(() => {
        this.router.navigate(['/admin/orders']);
        return of(null);
      })
    ).subscribe(data => {
      this.order.set(data);
      this.isLoading.set(false);
    });
  }

  get subtotal(): number {
    return this.order()?.orderItems.reduce(
      (acc, item) => acc + item.productVariant.price * item.quantity, 0
    ) ?? 0;
  }

  goBack() {
    this.router.navigate(['/admin/orders']);
  }

  get totalUnits(): number {
  return this.order()?.orderItems.reduce(
    (acc, item) => acc + item.quantity, 0
  ) ?? 0;
}

downloadPdf() {
  const order = this.order();
  if (order) this.pdfService.generateOrderPdf(order);
}
}