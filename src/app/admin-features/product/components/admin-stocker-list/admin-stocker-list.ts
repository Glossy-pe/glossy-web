import { Component, OnInit, inject, ChangeDetectionStrategy, 
         ChangeDetectorRef, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockAlertResponse } from './models/StockAlertResponse';
import { ProductService } from '../../../../features/product/services/product.service';

@Component({
  selector: 'app-admin-stocker-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-stocker-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminStockerList implements OnInit {
  private productService = inject(ProductService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  isLoading = signal(true);
  isCollapsed = signal(true);
  alerts = signal<StockAlertResponse[]>([]);

  readonly fallbackImg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3C/svg%3E';

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.isLoading.set(true);
    this.productService.getStockAlerts().subscribe({
      next: (data) => {
        this.alerts.set(data);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  dismiss(alertId: number) {
    this.productService.dismissStockAlert(alertId).subscribe({
      next: () => {
        // Quitar la card inmediatamente sin esperar reload
        this.alerts.update(list => list.filter(a => a.alertId !== alertId));
        this.cdr.markForCheck();
      }
    });
  }

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  scrollLeft() {
    this.scrollContainer.nativeElement.scrollBy({ left: -280, behavior: 'smooth' });
  }

  scrollRight() {
    this.scrollContainer.nativeElement.scrollBy({ left: 280, behavior: 'smooth' });
  }

  isOutOfStock(alert: StockAlertResponse): boolean {
    return alert.stock === 0;
  }
}