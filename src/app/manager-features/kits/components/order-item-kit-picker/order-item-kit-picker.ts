import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { KitService, apiErrorMessage } from '../../../kits/services/kit.service';
import { KitItemWithVariants, KitResponse, KitVariant } from '../../../kits/models/kit.model';

export interface PickedKitItem {
  variantId: number;
  productId: number;
  productName: string | null;
  toneName: string | null;
  price: number;
  image: string | null;
}

interface KitRow {
  item: KitItemWithVariants;
  variantId: number | null;
  auto: boolean; // true si el tono salió del sorteo
}

@Component({
  selector: 'app-order-item-kit-picker',
  imports: [FormsModule],
  templateUrl: './order-item-kit-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderItemKitPicker {
  private readonly kitService = inject(KitService);

  /** Se emite al confirmar, con un elemento por producto del kit. */
  readonly itemsPicked = output<PickedKitItem[]>();

  readonly kits = signal<KitResponse[]>([]);
  readonly kitQuery = signal('');
  readonly loadingKits = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedKit = signal<KitResponse | null>(null);
  readonly rows = signal<KitRow[]>([]);
  readonly loadingRows = signal(false);

  readonly filteredKits = computed(() => {
    const q = this.kitQuery().trim().toLowerCase();
    return this.kits().filter(
      (k) => k.active && (!q || k.name.toLowerCase().includes(q) || String(k.id) === q),
    );
  });

  readonly selectedCount = computed(() => this.rows().filter((r) => r.variantId != null).length);
  readonly noStockCount = computed(() => this.rows().filter((r) => !this.hasStock(r)).length);

  constructor() {
    this.loadingKits.set(true);
    this.kitService
      .getAll()
      .pipe(finalize(() => this.loadingKits.set(false)))
      .subscribe({
        next: (k) => this.kits.set(k),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
  }

  // ── Kit ──
  selectKit(kit: KitResponse): void {
    this.selectedKit.set(kit);
    this.rows.set([]);
    this.error.set(null);
    this.loadingRows.set(true);

    this.kitService
      .getItemsWithVariants(kit.id)
      .pipe(finalize(() => this.loadingRows.set(false)))
      .subscribe({
        next: (items) =>
          this.rows.set(items.map((item) => ({ item, variantId: null, auto: false }))),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
  }

  back(): void {
    this.selectedKit.set(null);
    this.rows.set([]);
    this.error.set(null);
  }

  // ── Tonos ──
  hasStock(row: KitRow): boolean {
    return row.item.variants.some((v) => v.stock > 0);
  }

  onSelect(row: KitRow, value: string): void {
    const id = value ? Number(value) : null;
    this.rows.update((list) =>
      list.map((r) => (r === row ? { ...r, variantId: id, auto: false } : r)),
    );
  }

  /** Vuelve a sortear solo esta fila (evita repetir el tono actual si hay otro). */
  reroll(row: KitRow): void {
    this.rows.update((list) => list.map((r) => (r === row ? this.withRandom(r, r.variantId) : r)));
  }

  /** Rellena solo los que no tienen tono elegido. */
  fillMissing(): void {
    this.rows.update((list) => list.map((r) => (r.variantId == null ? this.withRandom(r) : r)));
  }

  /** Sortea todos, incluso los ya elegidos. */
  randomAll(): void {
    this.rows.update((list) => list.map((r) => this.withRandom(r)));
  }

  private withRandom(row: KitRow, avoid?: number | null): KitRow {
    let pool = row.item.variants.filter((v) => v.stock > 0);
    if (avoid != null && pool.length > 1) pool = pool.filter((v) => v.id !== avoid);
    if (!pool.length) return row;
    const v = pool[Math.floor(Math.random() * pool.length)];
    return { ...row, variantId: v.id, auto: true };
  }

  // ── Confirmar ──
  confirm(): void {
    const picked: PickedKitItem[] = [];
    for (const r of this.rows()) {
      const v: KitVariant | undefined = r.item.variants.find((x) => x.id === r.variantId);
      if (!v) continue;
      picked.push({
        variantId: v.id,
        productId: r.item.productId,
        productName: r.item.productName,
        toneName: v.toneName,
        price: v.price,
        image: v.image ?? r.item.image,
      });
    }
    if (!picked.length) return;
    this.itemsPicked.emit(picked);
    this.back();
    this.kitQuery.set('');
  }
}