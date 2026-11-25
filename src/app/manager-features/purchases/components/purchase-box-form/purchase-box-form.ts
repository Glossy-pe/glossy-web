import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import { ProductService } from '../../../products/services/product.service';
import { ProductResponseFull } from '../../../products/models/product-response-full.model';
import { BoxPresentationService } from '../../services/box-presentation.service';
import { BoxPresentationResponse } from '../../models/box-presentation.model';
import { PurchaseService } from '../../services/pucharse.service';

@Component({
  selector: 'app-purchase-box-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './purchase-box-form.html',
})
export class PurchaseBoxForm implements OnInit, OnDestroy {

  // Búsqueda
  query     = signal('');
  results   = signal<ProductResponseFull[]>([]);
  searching = signal(false);
  private search$ = new Subject<string>();

  // Formulario
  product      = signal<ProductResponseFull | null>(null);
  presentation = signal<BoxPresentationResponse | null>(null);
  loadingPres  = signal(false);
  boxCount     = signal<number | null>(1);
  costPerBox   = signal<number | null>(null);
  notes        = signal('');

  // Envío
  saving  = signal(false);
  error   = signal('');
  success = signal('');

  // Variantes activas del producto (para mostrar qué se va a sumar)
  activeVariants = computed(() =>
    (this.product()?.variants ?? []).filter((v: any) => v.active !== false && !v.deleted));
  unitCost = computed(() => {
    const p = this.presentation();
    const c = this.costPerBox();
    return p && c !== null && p.totalUnits > 0 ? c / p.totalUnits : null;
  });
  canSubmit = computed(() =>
    !!this.product() &&
    !!this.presentation()?.valid &&
    this.boxCount() !== null && Number.isInteger(this.boxCount()) && this.boxCount()! >= 1 && this.boxCount()! <= 100 &&
    this.costPerBox() !== null && this.costPerBox()! >= 0 &&
    !this.saving()
  );

  constructor(
    private productService: ProductService,
    private purchaseService: PurchaseService,
    private boxService: BoxPresentationService,
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

  ngOnDestroy(): void { this.search$.complete(); }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.search$.next(value);
  }

  selectProduct(p: ProductResponseFull): void {
    this.product.set(p);
    this.presentation.set(null);
    this.results.set([]);
    this.query.set('');
    this.error.set('');
    this.success.set('');
    this.loadingPres.set(true);
    this.boxService.getPresentation(p.id)
      .pipe(finalize(() => this.loadingPres.set(false)))
      .subscribe({
        next: pres => this.presentation.set(pres),
        error: () => this.presentation.set(null), // sin Presentación BOX
      });
  }

  clearProduct(): void {
    this.product.set(null);
    this.presentation.set(null);
  }

  save(): void {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.purchaseService.registerBoxes({
      productId: this.product()!.id,
      boxCount: this.boxCount()!,
      costPerBox: this.costPerBox()!,
      notes: this.notes().trim() || undefined,
    }).pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: boxes => {
          this.success.set(`${boxes.length} BOX registrado(s) y stock actualizado.`);
          this.clearProduct();
          this.boxCount.set(1);
          this.costPerBox.set(null);
          this.notes.set('');
        },
        error: err => {
          console.error(err);
          this.error.set(err?.error?.message ?? 'No se pudo registrar el BOX. Intenta nuevamente.');
        },
      });
  }
}