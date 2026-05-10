import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductResponseFull } from '../../../../features/product/models/product-response-full.model';
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

  isLoading = signal(true);
  isCollapsed = signal(true);
  private _products = signal<ProductResponseFull[]>([]);

  productsWithAlerts = computed(() =>
    this._products().filter(p =>
      p.variants?.some(v => v.stock < 2)
    )
  );

  ngOnInit() {
    this.productService.getProducts(0, 200).subscribe({
      next: (res) => {
        this._products.set(res.content);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  getCriticalVariants(product: ProductResponseFull) {
    return (product.variants || [])
      .filter(v => v.stock < 2)
      .sort((a, b) => a.stock - b.stock);
  }

  getAlertCount(product: ProductResponseFull) {
    return this.getCriticalVariants(product).length;
  }

  getUrgencyPercentage(product: ProductResponseFull) {
    const critical = this.getCriticalVariants(product);
    if (!critical.length) return 0;
    const zeros = critical.filter(v => v.stock === 0).length;
    return (zeros / critical.length) * 100;
  }

  getMainImage(product: ProductResponseFull): string {
    for (const v of product.variants || []) {
      const main = v.images?.find((i: any) => i.mainImage);
      if (main) return main.url;
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3C/svg%3E';
  }
}