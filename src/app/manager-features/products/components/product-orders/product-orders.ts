import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { OrderItemService } from '../../../order-items/services/order-item.service';
import { PageResponse } from '../../../../../shared/models/page-response.model';
import { ProductOrder } from '../../models/product-order.model';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-product-orders',
  imports: [DatePipe],
  templateUrl: './product-orders.html',
  styleUrl: './product-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOrders {
  private readonly orderItemService = inject(OrderItemService);

  readonly productId = input.required<number>();

  readonly name = signal('');
  readonly page = signal(0);
  readonly data = signal<PageResponse<ProductOrder> | null>(null);
  readonly loading = signal(false);

  constructor() {
    // Al cambiar el filtro, vuelve a la página 0
    toObservable(this.name).pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.page.set(0));

    // Recarga cuando cambian producto, filtro o página
    toObservable(
      computed(() => ({ id: this.productId(), name: this.name().trim(), page: this.page() })),
    ).pipe(
      debounceTime(0),
      tap(() => this.loading.set(true)),
      switchMap((q) =>
        this.orderItemService.getOrdersByProduct(q.id, q.name, q.page).pipe(
          catchError(() => of(null)),
          finalize(() => this.loading.set(false)),
        ),
      ),
      takeUntilDestroyed(),
    ).subscribe((res) => this.data.set(res));
  }

  onSearch(value: string) { this.name.set(value); }
  go(p: number) { this.page.set(p); }
}
