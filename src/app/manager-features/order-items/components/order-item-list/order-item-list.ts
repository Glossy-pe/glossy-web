import { Component, Input, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
import { OrderItemService } from '../../services/order-item.service';
import { OrderItemProductPicker } from '../order-item-product-picker/order-item-product-picker';
import { VariantResponseFull } from '../../../variants/models/variant-response.full.mode';
import { OrderItemRow} from '../order-item-row/order-item-row';
import { OrderItemResponseFull } from '../../models/order-item-response-full.model';
import { OrderService } from '../../../orders/services/order.service';
import { ProductResponseFull } from '../../../products/models/product-response-full.model';
import { VariantQueryProjection } from '../../../variants/models/variant-query-projection.model';

export type TriState = boolean | null;

export interface EditableOrderItem extends OrderItemResponseFull {
  dirty: boolean;
  pendingDelete: boolean;
  isNew: boolean;
}

@Component({
  selector: 'app-order-item-list',
  imports: [CommonModule, FormsModule, OrderItemProductPicker, OrderItemRow],
  templateUrl: './order-item-list.html',
  styleUrl: './order-item-list.scss',
})
export class OrderItemList implements OnInit {
  @Input({ required: true }) orderId!: number;
  @Output() itemsSaved = new EventEmitter<void>();

  viewMode = signal<'simple' | 'detailed'>('simple');

  items = signal<EditableOrderItem[]>([]);
  originalItems: OrderItemResponseFull[] = [];
  filterSeparated = signal<TriState>(null);
  filterPacked = signal<TriState>(null);
  filterPaid = signal<TriState>(null);

  isEditMode = signal(false);
  isLoading = signal(false);
  hasError = signal(false);
  isSaving = signal(false);
  showPicker = signal(false);
  

  toastMessage = signal<string | null>(null);
  private toastTimer: any;

  dirtyCount = computed(() =>
    this.items().filter(i => (i.dirty || i.isNew) && !i.pendingDelete).length +
    this.items().filter(i => i.pendingDelete && !i.isNew).length
  );

  pendingDeleteCount = computed(() =>
    this.items().filter(i => i.pendingDelete && !i.isNew).length
  );

hasActiveFilters = computed(() =>
  this.filterSeparated() !== null ||
  this.filterPacked() !== null ||
  this.filterPaid() !== null
);

filteredItems = computed(() => {
  const sep = this.filterSeparated();
  const pack = this.filterPacked();
  const paid = this.filterPaid();

  if (sep === null && pack === null && paid === null) {
    return this.items();
  }

  return this.items().filter(item => {
    // los items pendientes de borrar o nuevos siempre se muestran
    if (item.pendingDelete || item.isNew) return true;

    const isSeparated = item.separatedQuantity >= item.quantity;
    const isPacked = item.packedQuantity >= item.quantity;
    const isPaid = item.paidQuantity >= item.quantity;

    if (sep !== null && isSeparated !== sep) return false;
    if (pack !== null && isPacked !== pack) return false;
    if (paid !== null && isPaid !== paid) return false;
    return true;
  });
});

sortedItems = computed(() =>
  [...this.filteredItems()].sort((a, b) => {
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    const productA = a.variant?.productId ?? 0;
    const productB = b.variant?.productId ?? 0;
    return productA - productB;
  })
);


  constructor(
    private orderItemService: OrderItemService,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.orderService
      .getFullById(this.orderId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (order) => {
          this.originalItems = structuredClone(order.items);
          this.items.set(order.items.map(i => ({
            ...i,
            variant: i.variant ?? null,
            dirty: false,
            pendingDelete: false,
            isNew: false,
          })));
        },
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.showPicker.set(false);
  }

  cancelEdit(): void {
    this.isEditMode.set(false);
    this.showPicker.set(false);
    this.items.set(
      this.originalItems.map(i => ({ ...i, variant: i.variant ?? null, dirty: false, pendingDelete: false, isNew: false }))
    );
  }

  markDirty(item: EditableOrderItem): void {
    item.dirty = true;
    this.items.update(items => [...items]);
  }

  togglePendingDelete(item: EditableOrderItem): void {
    item.pendingDelete = !item.pendingDelete;
    this.items.update(items => [...items]);
  }

  saveAll(): void {
    const toCreate = this.items().filter(i => i.isNew && !i.pendingDelete);
    const toUpdate = this.items().filter(i => i.dirty && !i.isNew && !i.pendingDelete);
    const toDelete = this.items().filter(i => i.pendingDelete && !i.isNew);

    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      this.isEditMode.set(false);
      this.showPicker.set(false);
      return;
    }

    const createOps$ = toCreate.map(i =>
      this.orderItemService.create({
        productVariantId: i.productVariantId,
        orderId: i.orderId,
        quantity: i.quantity,
        paidQuantity: i.paidQuantity,
        separatedQuantity: i.separatedQuantity,
        packedQuantity: i.packedQuantity,
        amountPaid: i.amountPaid,
        unitPrice: i.unitPrice,
      }).pipe(catchError(err => { console.error(err); return of(null); }))
    );

    this.isSaving.set(true);

    const updateOps$ = toUpdate.map(i =>
      this.orderItemService.update(i.id, {
        productVariantId: i.productVariantId,
        orderId: i.orderId,
        quantity: i.quantity,
        paidQuantity: i.paidQuantity,
        separatedQuantity: i.separatedQuantity,
        packedQuantity: i.packedQuantity,
        amountPaid: i.amountPaid,
        unitPrice: i.unitPrice,
      }).pipe(catchError(err => { console.error(err); return of(null); }))
    );

    const deleteOps$ = toDelete.map(i =>
      this.orderItemService.delete(i.id)
        .pipe(catchError(err => { console.error(err); return of(null); }))
    );

    const all$ = [...createOps$, ...updateOps$, ...deleteOps$];

    forkJoin(all$.length ? all$ : [of(null)])
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.isEditMode.set(false);
          this.showPicker.set(false);
          this.loadItems();
          this.showToast('Cambios guardados');
          this.itemsSaved.emit();
        },
        error: (err) => console.error(err),
      });
  }

  showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMessage.set(msg);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3000);
  }

  onVariantSelected({ variant, product, quantity }: { variant: VariantResponseFull; product: ProductResponseFull; quantity: number }): void {
    
    const existing = this.items().find(
      i => i.productVariantId === variant.id && !i.pendingDelete
    );

    // if (existing) {
    //   existing.quantity += quantity;
    //   existing.dirty = true;
    //   this.items.update(items => [...items]);
    //   this.showToast(`"${product.name} - ${variant.toneName}" ya existe — cantidad actualizada a ${existing.quantity}`);
    //   return;
    // }

    
    const mainImage = variant.images?.find(img => img.mainImage) ?? variant.images?.[0] ?? null;

    const draft: EditableOrderItem = {
      id: -(Date.now()),
      orderId: this.orderId,
      productVariantId: variant.id,
      quantity,
      paidQuantity: 0,
      separatedQuantity: 0,
      packedQuantity: 0,
      amountPaid: null,
      unitPrice: variant.price ?? null,
      createdAt: null,
      updatedAt: null,
      dirty: false,
      pendingDelete: false,
      isNew: true,
      variant: {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        toneName: variant.toneName,
        toneCode: variant.toneCode,
        stock: variant.stock,
        price: variant.price,
        imageUrl: mainImage?.url ?? null,
        mainImage: mainImage?.mainImage ?? null,
        imagePosition: mainImage?.position ?? null,
      },
    };

    this.items.update(items => [...items, draft]);
  }

  markAllSeparated(): void {
    this.items.update(items =>
      items.map(i => i.pendingDelete ? i : { ...i, separatedQuantity: i.quantity, dirty: true })
    );
  }

  markAllPacked(): void {
    this.items.update(items =>
      items.map(i => i.pendingDelete ? i : { ...i, packedQuantity: i.quantity, dirty: true })
    );
  }

  markAllPaid(): void {
    this.items.update(items =>
      items.map(i => i.pendingDelete ? i : {
        ...i,
        paidQuantity: i.quantity,
        amountPaid: (i.unitPrice ?? 0) * i.quantity,
        dirty: true
      })
    );
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'simple' ? 'detailed' : 'simple');
  }

  toggleSimpleField(item: EditableOrderItem, field: 'separatedQuantity' | 'packedQuantity' | 'paidQuantity'): void {
  const isComplete = item[field] >= item.quantity;
  item[field] = isComplete ? 0 : item.quantity;
  if (field === 'paidQuantity') {
    item.amountPaid = isComplete ? 0 : (item.unitPrice ?? 0) * item.quantity;
  }
  item.dirty = true;
  this.items.update(items => [...items]);
}

private cycleFilter(current: TriState): TriState {
  if (current === null) return true;
  if (current === true) return false;
  return null;
}

toggleFilterSeparated(): void {
  this.filterSeparated.update(v => this.cycleFilter(v));
}

toggleFilterPacked(): void {
  this.filterPacked.update(v => this.cycleFilter(v));
}

toggleFilterPaid(): void {
  this.filterPaid.update(v => this.cycleFilter(v));
}

clearFilters(): void {
  this.filterSeparated.set(null);
  this.filterPacked.set(null);
  this.filterPaid.set(null);
}

}