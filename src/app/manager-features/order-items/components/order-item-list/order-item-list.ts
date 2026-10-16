import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';

import { OrderItemService } from '../../services/order-item.service';
import { ManagerOrderItemResponseStructured } from '../../models/order-item-response-structured.model';
import { OrderItemRequest } from '../../models/order-item-request.model';
import { ProductService } from '../../../products/services/product.service';
import { ProductResponseFull } from '../../../products/models/product-response-full.model';
import { VariantResponseFull } from '../../../variants/models/variant-response.full.mode';

interface ItemSnapshot {
  amountPaid: number | null;
  definedPrice: number | null;
  isSeparated: boolean;
  isPacked: boolean;
}

interface EditableManagerOrderItem extends ManagerOrderItemResponseStructured {
  dirty: boolean; // existente con campos modificados
  pendingDelete: boolean; // existente marcado para eliminar
  isNew: boolean; // agregado localmente, aún no existe en el backend
  _snapshot: ItemSnapshot;
}

type ItemStatus = 'new' | 'deleted' | 'modified' | null;
type FlagKey = 'isSeparated' | 'isPacked' | 'paid';
type ItemFilter = 'all' | 'unpaid' | 'unpacked';

@Component({
  selector: 'app-order-item-list',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './order-item-list.html',
  styleUrl: './order-item-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderItemList implements OnChanges {
  private readonly orderItemService = inject(OrderItemService);
  private readonly productService = inject(ProductService);

  @Input({ required: true }) orderItems!: ManagerOrderItemResponseStructured[];
  @Input({ required: true }) orderId!: number;

  // ── Pago general ─────────────────────────────────────────────────
  readonly paymentInput = signal<number | null>(null);
  readonly paymentLeftover = signal<number | null>(null);
  readonly paymentOpen = signal(false);

  readonly failedImages = signal<ReadonlySet<string>>(new Set());

  /** Deuda pendiente de los items activos. */
  readonly pendingDebt = computed(() =>
    this.items()
      .filter((i) => !i.pendingDelete)
      .reduce((sum, i) => sum + Math.max(this.totalOwed(i) - (i.amountPaid ?? 0), 0), 0),
  );

  /** Se emite tras guardar (o fallar a medias) para que el padre recargue la orden. */
  readonly changed = output<void>();

  /** Interruptores por item (chips) y globales (botones superiores). */
  readonly flags: { key: FlagKey; label: string; bulkOn: string; bulkOff: string }[] = [
    { key: 'isSeparated', label: 'Sep', bulkOn: 'Separar todo', bulkOff: 'Quitar separados' },
    { key: 'isPacked', label: 'Pack', bulkOn: 'Empacar todo', bulkOff: 'Quitar empacados' },
    { key: 'paid', label: 'Pago', bulkOn: 'Pagar todo', bulkOff: 'Quitar pagos' },
  ];

  // ── Lista / edición ──────────────────────────────────────────────
  readonly items = signal<EditableManagerOrderItem[]>([]);
  readonly editMode = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly summary = computed(() => {
    const list = this.items();
    return {
      added: list.filter((i) => i.isNew).length,
      removed: list.filter((i) => i.pendingDelete && !i.isNew).length,
      modified: list.filter((i) => i.dirty && !i.pendingDelete && !i.isNew).length,
    };
  });
  readonly hasChanges = computed(() => {
    const s = this.summary();
    return s.added + s.removed + s.modified > 0;
  });



  // ── Filtro y orden ───────────────────────────────────────────────
  readonly filter = signal<ItemFilter>('all');
  readonly filterOptions: { key: ItemFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'unpaid', label: 'Sin pagar' },
    { key: 'unpacked', label: 'Sin empacar' },
  ];

  private productKey(item: ManagerOrderItemResponseStructured): number {
    return (item as { productId?: number }).productId ?? item.productVariantId ?? 0;
  }

  /** Nuevos (locales) primero, el más reciente arriba; luego los guardados por productId. */
  readonly orderedItems = computed(() => {
    const list = this.items();
    const added = list.filter((i) => i.isNew).reverse();
    const saved = list
      .filter((i) => !i.isNew)
      .sort((a, b) => this.productKey(a) - this.productKey(b) || a.id - b.id);
    return [...added, ...saved];
  });

  isUnpaid(item: ManagerOrderItemResponseStructured): boolean {
    return this.totalOwed(item) > 0 && !this.isFullyPaid(item);
  }

  readonly visibleItems = computed(() => {
  const f = this.filter();
  return this.orderedItems().filter((i) => {
    if (f === 'all') return true;
    return f === 'unpaid' ? this.isUnpaid(i) : !i.isPacked;
  });
});

  readonly counts = computed(() => {
    const active = this.items().filter((i) => !i.pendingDelete);
    return {
      all: active.length,
      unpaid: active.filter((i) => this.isUnpaid(i)).length,
      unpacked: active.filter((i) => !i.isPacked).length,
    };
  });

  onImageError(url: string): void {
    this.failedImages.update((s) => new Set(s).add(url));
  }

  imageOf(item: ManagerOrderItemResponseStructured): string | null {
    const withImages = item as { images?: { url: string; type?: string }[] };
    const first = withImages.images?.find((i) => i.type !== 'video') ?? withImages.images?.[0];
    return first?.url ?? item.image ?? null;
  }

  /** Ids temporales (negativos) para items nuevos. */
  private nextTempId = -1;

  // ── Buscador / agregar ───────────────────────────────────────────
  readonly query = signal('');
  readonly results = signal<ProductResponseFull[]>([]);
  readonly selectedProduct = signal<ProductResponseFull | null>(null);
  readonly selectedVariant = signal<VariantResponseFull | null>(null);
  readonly isSearching = signal(false);
  readonly searchError = signal(false);

  readonly sortedVariants = computed(() =>
    [...(this.selectedProduct()?.variants ?? [])].sort((a, b) => a.position - b.position),
  );

  constructor() {
    toObservable(this.query)
      .pipe(
        debounceTime(400),
        map((q) => q.trim()),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q) return of<ProductResponseFull[]>([]);

          this.isSearching.set(true);
          this.searchError.set(false);

          return this.productService.search(q).pipe(
            catchError(() => {
              this.searchError.set(true);
              return of<ProductResponseFull[]>([]);
            }),
            finalize(() => this.isSearching.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.results.set(r));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orderItems']) this.syncItems();
  }

  /**
   * Toma los datos frescos del padre, pero conserva lo que el usuario
   * tiene en preparación (modificados, por eliminar y nuevos).
   */
  private syncItems(): void {
    const current = this.items();
    const staged = new Map(
      current.filter((i) => !i.isNew && (i.dirty || i.pendingDelete)).map((i) => [i.id, i]),
    );
    const fresh = this.orderItems.map((i) => staged.get(i.id) ?? this.toEditable(i));
    const added = current.filter((i) => i.isNew);
    this.items.set([...fresh, ...added]);
  }

  private snapshotOf(item: ManagerOrderItemResponseStructured): ItemSnapshot {
    return {
      amountPaid: item.amountPaid,
      definedPrice: item.definedPrice,
      isSeparated: item.isSeparated,
      isPacked: item.isPacked,
    };
  }

  private toEditable(item: ManagerOrderItemResponseStructured): EditableManagerOrderItem {
    return {
      ...item,
      dirty: false,
      pendingDelete: false,
      isNew: false,
      _snapshot: this.snapshotOf(item),
    };
  }

  // ── Estado visual ────────────────────────────────────────────────
  statusOf(item: EditableManagerOrderItem): ItemStatus {
    if (item.isNew) return 'new';
    if (item.pendingDelete) return 'deleted';
    if (item.dirty) return 'modified';
    return null;
  }

  cardClass(item: EditableManagerOrderItem): string {
    switch (this.statusOf(item)) {
      case 'new':
        return 'ring-2 ring-emerald-400';
      case 'deleted':
        return 'ring-2 ring-red-400 opacity-60';
      case 'modified':
        return 'ring-2 ring-amber-400';
      default:
        return '';
    }
  }

  fieldChanged(item: EditableManagerOrderItem, field: keyof ItemSnapshot): boolean {
    return !item.isNew && item[field] !== item._snapshot[field];
  }

  flagChanged(item: EditableManagerOrderItem, key: FlagKey): boolean {
    return this.fieldChanged(item, key === 'paid' ? 'amountPaid' : key);
  }

  // ── Cálculos ─────────────────────────────────────────────────────
  totalOwed(item: ManagerOrderItemResponseStructured): number {
    return item.definedPrice ?? item.price ?? 0;
  }

  hasDiscount(item: ManagerOrderItemResponseStructured): boolean {
    return item.definedPrice != null && item.price != null && item.definedPrice < item.price;
  }

  paidRatio(item: ManagerOrderItemResponseStructured): number {
    const total = this.totalOwed(item);
    if (!total) return 0;
    return Math.min((item.amountPaid ?? 0) / total, 1);
  }

  isFullyPaid(item: ManagerOrderItemResponseStructured): boolean {
    const total = this.totalOwed(item);
    return total > 0 && (item.amountPaid ?? 0) >= total;
  }

  // ── Modo edición ─────────────────────────────────────────────────
  startEditMode(): void {
    this.editMode.set(true);
  }

  /** Descarta todo lo pendiente y vuelve a los datos del padre. */
  cancelEditMode(): void {
    this.items.set(this.orderItems.map((i) => this.toEditable(i)));
    this.exitEditMode();
  }

  private exitEditMode(): void {
    this.editMode.set(false);
    this.saveError.set(null);
    this.paymentOpen.set(false);
    this.paymentInput.set(null);
    this.paymentLeftover.set(null);
    this.resetPicker();
  }

  // ── Edición de campos ───────────────────────────────────────────
  private differsFromSnapshot(item: EditableManagerOrderItem): boolean {
    const s = item._snapshot;
    return (
      item.amountPaid !== s.amountPaid ||
      item.definedPrice !== s.definedPrice ||
      item.isSeparated !== s.isSeparated ||
      item.isPacked !== s.isPacked
    );
  }

  onFieldChange(item: EditableManagerOrderItem): void {
    if (!item.isNew) item.dirty = this.differsFromSnapshot(item);
    this.items.update((list) => [...list]);
  }

  onDefinedPriceChange(item: EditableManagerOrderItem): void {
    let value = item.definedPrice;
    if (value != null && value < 0) value = 0;
    item.definedPrice = value;

    const total = this.totalOwed(item);
    if ((item.amountPaid ?? 0) > total) {
      item.amountPaid = total;
    }

    this.onFieldChange(item);
  }

  onAmountPaidChange(item: EditableManagerOrderItem): void {
    const total = this.totalOwed(item);
    let value = item.amountPaid ?? 0;
    if (value < 0) value = 0;
    if (value > total) value = total;
    item.amountPaid = value;
    this.onFieldChange(item);
  }

  onPaymentInput(value: string): void {
    const n = value === '' ? null : Number(value);
    this.paymentInput.set(n != null && !Number.isNaN(n) && n > 0 ? n : null);
    this.paymentLeftover.set(null);
  }

  /** Reparte el pago general entre los items: primero los parciales, luego los impagos. */
  applyGeneralPayment(): void {
    const amount = this.paymentInput();
    if (!amount) return;

    // Trabajamos en céntimos para evitar errores de decimales.
    let remaining = Math.round(amount * 100);

    const candidates = this.items().filter((i) => !i.pendingDelete);
    const partial = candidates.filter((i) => (i.amountPaid ?? 0) > 0);
    const unpaid = candidates.filter((i) => (i.amountPaid ?? 0) <= 0);

    for (const item of [...partial, ...unpaid]) {
      if (remaining <= 0) break;

      const owed = Math.round(this.totalOwed(item) * 100);
      const paid = Math.round((item.amountPaid ?? 0) * 100);
      const balance = owed - paid;
      if (balance <= 0) continue;

      const applied = Math.min(balance, remaining);
      item.amountPaid = (paid + applied) / 100;
      remaining -= applied;

      if (!item.isNew) item.dirty = this.differsFromSnapshot(item);
    }

    this.paymentLeftover.set(remaining > 0 ? remaining / 100 : null);
    this.paymentInput.set(null);
    this.items.update((list) => [...list]);
  }

  // ── Interruptores (por item y globales) ──────────────────────────
  flagOn(item: EditableManagerOrderItem, key: FlagKey): boolean {
    return key === 'paid' ? this.isFullyPaid(item) : item[key];
  }

  private applyFlag(item: EditableManagerOrderItem, key: FlagKey, on: boolean): void {
  if (key === 'paid') {
    // Encendido: completa el monto. Apagado: lo deja en 0.
    item.amountPaid = on ? this.totalOwed(item) : 0;
  } else {
    item[key] = on;
  }
  if (!item.isNew) item.dirty = this.differsFromSnapshot(item);
}

  toggleFlag(item: EditableManagerOrderItem, key: FlagKey): void {
    if (!this.editMode() || item.pendingDelete) return;
    this.applyFlag(item, key, !this.flagOn(item, key));
    this.items.update((list) => [...list]);
  }

  togglePayment(): void {
    this.paymentOpen.update((v) => !v);
  }

  /** ¿Todos los items activos (no marcados para eliminar) tienen este interruptor encendido? */
  allOn(key: FlagKey): boolean {
    const active = this.items().filter((i) => !i.pendingDelete);
    return active.length > 0 && active.every((i) => this.flagOn(i, key));
  }

  /** Si no están todos encendidos, enciende todos; si ya lo están, apaga todos. */
  toggleAll(key: FlagKey): void {
    const active = this.items().filter((i) => !i.pendingDelete);
    if (active.length === 0) return;
    const target = !active.every((i) => this.flagOn(i, key));
    active.forEach((i) => this.applyFlag(i, key, target));
    this.items.update((list) => [...list]);
  }

  // ── Eliminar / deshacer ──────────────────────────────────────────
  /** Items nuevos se quitan de la lista; los existentes se marcan (o desmarcan) para eliminar. */
  toggleDelete(item: EditableManagerOrderItem): void {
    if (item.isNew) {
      this.items.update((list) => list.filter((i) => i !== item));
      return;
    }
    item.pendingDelete = !item.pendingDelete;
    this.items.update((list) => [...list]);
  }

  // ── Buscador / agregar (solo local) ──────────────────────────────
  onQueryChange(value: string): void {
    this.query.set(value);
    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
  }

  selectProduct(product: ProductResponseFull): void {
    this.selectedProduct.update((current) => (current?.id === product.id ? null : product));
    this.selectedVariant.set(null);
  }

  selectVariant(variant: VariantResponseFull): void {
    this.selectedVariant.update((current) => (current?.id === variant.id ? null : variant));
  }

  /** Cada producto agregado es un item independiente (sin fusionar con otros de la misma variante). */
  addItem(): void {
    const variant = this.selectedVariant();
    const product = this.selectedProduct();
    if (!variant) return;

    const draft = {
      id: this.nextTempId--,
      productVariantId: variant.id,
      orderId: this.orderId,
      quantity: 1, // campo deprecado: se mantiene en 1 mientras el backend lo exija
      price: variant.price,
      definedPrice: null,
      amountPaid: 0,
      isSeparated: false,
      isPacked: false,
      productName: product?.name ?? null,
      toneName: variant.toneName ?? null,
      image: product?.images?.[0]?.url ?? null,
    } as unknown as ManagerOrderItemResponseStructured;

    this.items.update((list) => [...list, { ...this.toEditable(draft), isNew: true }]);
    this.selectedVariant.set(null);
  }

  private resetPicker(): void {
    this.query.set('');
    this.results.set([]);
    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
  }

  // ── Guardar todo ─────────────────────────────────────────────────
  private buildRequest(item: EditableManagerOrderItem): OrderItemRequest {
    return {
      productVariantId: item.productVariantId,
      orderId: item.orderId,
      quantity: item.quantity, // deprecado: no se edita; los nuevos van con 1
      isPaid: this.isFullyPaid(item),
      isSeparated: item.isSeparated,
      isPacked: item.isPacked,
      amountPaid: item.amountPaid ?? 0,
      unitPrice: this.totalOwed(item),
    };
  }

  private markSaved(item: EditableManagerOrderItem): void {
    item._snapshot = this.snapshotOf(item);
    item.dirty = false;
    this.items.update((list) => [...list]);
  }

  private markCreated(item: EditableManagerOrderItem, created: unknown): void {
    const id = (created as { id?: number } | null)?.id;
    if (id != null) {
      item.id = id;
      item.isNew = false;
      this.markSaved(item);
    } else {
      // Sin id no se puede conservar; reaparecerá con la recarga del padre.
      this.items.update((list) => list.filter((i) => i !== item));
    }
  }

  saveChanges(): void {
    const list = this.items();
    const toDelete = list.filter((i) => i.pendingDelete && !i.isNew);
    const toUpdate = list.filter((i) => i.dirty && !i.pendingDelete && !i.isNew);
    const toCreate = list.filter((i) => i.isNew);

    if (!toDelete.length && !toUpdate.length && !toCreate.length) return;

    this.saving.set(true);
    this.saveError.set(null);

    const run = (calls: Observable<unknown>[]) => (calls.length ? forkJoin(calls) : of([]));

    // Fases en orden: eliminar → actualizar → crear. Cada fase exitosa
    // limpia su parte local, así un reintento no repite lo ya guardado.
    run(
      toDelete.map((i) =>
        this.orderItemService
          .delete(i.id)
          .pipe(tap(() => this.items.update((l) => l.filter((x) => x !== i)))),
      ),
    )
      .pipe(
        switchMap(() =>
          run(
            toUpdate.map((i) =>
              this.orderItemService
                .update(i.id, this.buildRequest(i))
                .pipe(tap(() => this.markSaved(i))),
            ),
          ),
        ),
        switchMap(() =>
          run(
            toCreate.map((i) =>
              this.orderItemService
                .create(this.buildRequest(i))
                .pipe(tap((created) => this.markCreated(i, created))),
            ),
          ),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.exitEditMode();
          this.changed.emit();
        },
        error: (err) => {
          console.error('Error guardando cambios', err);
          this.saveError.set(
            'No se pudieron guardar todos los cambios. Lo que ya se guardó se quitó de pendientes; revisa el resto y reintenta.',
          );
          this.changed.emit();
        },
      });
  }
}