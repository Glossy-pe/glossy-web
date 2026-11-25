import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import { ProductService } from '../../../products/services/product.service';
import { ProductResponseFull } from '../../../products/models/product-response-full.model';
import { PurchaseRequest } from '../../models/purchase.model';
import { PurchaseService } from '../../services/pucharse.service';

interface VariantOption {
  id: number;
  toneName: string;
  toneCode: string;
  stock: number;
}

interface UnitLine {
  key: number;
  variantId: number | null;
  quantity: number | null;
  unitCost: number | null;
}

@Component({
  selector: 'app-purchase-unit-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-unit-form.html',
})
export class PurchaseUnitForm implements OnInit, OnDestroy {

  // Búsqueda de producto
  query     = signal('');
  results   = signal<ProductResponseFull[]>([]);
  searching = signal(false);
  private search$ = new Subject<string>();

  // Formulario
  product  = signal<ProductResponseFull | null>(null);
  variants = signal<VariantOption[]>([]);
  lines    = signal<UnitLine[]>([]);
  notes    = signal('');
  private nextKey = 1;

  // Estado de envío
  saving  = signal(false);
  error   = signal('');
  success = signal('');

  // Derivados
  total = computed(() =>
    this.lines().reduce((sum, l) => sum + (l.quantity ?? 0) * (l.unitCost ?? 0), 0)
  );
  totalUnits = computed(() =>
    this.lines().reduce((sum, l) => sum + (l.quantity ?? 0), 0)
  );
  canAddLine = computed(() => this.lines().length < this.variants().length);
  canSubmit = computed(() =>
    !!this.product() &&
    this.lines().length > 0 &&
    this.lines().every(l =>
      l.variantId !== null &&
      l.quantity !== null && Number.isInteger(l.quantity) && l.quantity >= 1 &&
      l.unitCost !== null && l.unitCost >= 0
    ) &&
    !this.saving()
  );

  constructor(
    private productService: ProductService,
    private purchaseService: PurchaseService,
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(300),
      map(q => q.trim()),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 2) return of([] as ProductResponseFull[]);
        this.searching.set(true);
        return this.productService.search(q).pipe(
          catchError(() => of([] as ProductResponseFull[])),
          finalize(() => this.searching.set(false)),
        );
      }),
    ).subscribe(res => this.results.set(res));
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }

  // ── Producto ─────────────────────────────────────────────────────
  onQueryChange(value: string): void {
    this.query.set(value);
    this.search$.next(value);
  }

  selectProduct(p: ProductResponseFull): void {
    // Ajusta los nombres de campo si tu modelo de variante es distinto
    const variants: VariantOption[] = (p.variants ?? [])
      .filter(v => v.active !== false)
      .map(v => ({ id: v.id, toneName: v.toneName, toneCode: v.toneCode, stock: v.stock }));

    this.product.set(p);
    this.variants.set(variants);
    this.results.set([]);
    this.query.set('');
    this.error.set('');
    this.success.set('');
    this.lines.set([]);
    if (variants.length > 0) this.addLine();
  }

  clearProduct(): void {
    this.product.set(null);
    this.variants.set([]);
    this.lines.set([]);
  }

  // ── Líneas ───────────────────────────────────────────────────────
  addLine(): void {
    if (!this.canAddLine()) return;
    this.lines.update(l => [...l, { key: this.nextKey++, variantId: null, quantity: 1, unitCost: null }]);
  }

  removeLine(key: number): void {
    this.lines.update(l => l.filter(x => x.key !== key));
  }

  patchLine(key: number, patch: Partial<UnitLine>): void {
    this.lines.update(l => l.map(x => x.key === key ? { ...x, ...patch } : x));
  }

  /** Variantes disponibles para una línea: excluye las ya elegidas en otras líneas. */
  optionsFor(line: UnitLine): VariantOption[] {
    const usedByOthers = new Set(
      this.lines().filter(l => l.key !== line.key && l.variantId !== null).map(l => l.variantId)
    );
    return this.variants().filter(v => !usedByOthers.has(v.id));
  }

  stockOf(variantId: number | null): number | null {
    return this.variants().find(v => v.id === variantId)?.stock ?? null;
  }

  // ── Guardar ──────────────────────────────────────────────────────
  save(): void {
    if (!this.canSubmit()) return;

    const request: PurchaseRequest = {
      productId: this.product()!.id,
      type: 'UNIT',
      notes: this.notes().trim() || undefined,
      items: this.lines().map(l => ({
        variantId: l.variantId!,
        quantity: l.quantity!,
        unitCost: l.unitCost!,
      })),
    };

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.purchaseService.create(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.success.set('Ingreso registrado y stock actualizado.');
          this.resetForm();
        },
        error: err => {
          console.error(err);
          this.error.set(err?.error?.message ?? 'No se pudo registrar el ingreso. Intenta nuevamente.');
        },
      });
  }

  private resetForm(): void {
    this.product.set(null);
    this.variants.set([]);
    this.lines.set([]);
    this.notes.set('');
  }
}