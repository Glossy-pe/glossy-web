import { Component, Input, Output, EventEmitter, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { ProductService } from '../../../products/services/product.service';
import { OrderItemService } from '../../services/order-item.service';
import { ProductResponseFull } from '../../../products/models/product-response-full.model';
import { VariantResponseFull } from '../../../variants/models/variant-response.full.mode';
import { OrderItemResponse } from '../../models/order-item-response.model';

@Component({
  selector: 'app-order-item-product-picker',
  imports: [CommonModule, FormsModule],
  templateUrl: './order-item-product-picker.html',
  styleUrl: './order-item-product-picker.scss',
})
export class OrderItemProductPicker implements OnDestroy {
  @Input({ required: true }) orderId!: number;
  @Output() variantSelected = new EventEmitter<{ variant: VariantResponseFull; product: ProductResponseFull; quantity: number }>();
  query = signal('');
  results = signal<ProductResponseFull[]>([]);
  selectedProduct = signal<ProductResponseFull | null>(null);
  selectedVariant = signal<VariantResponseFull | null>(null);
  quantity = signal(1);

  isSearching = signal(false);
  isAdding = signal(false);
  searchError = signal(false);
  addError = signal<string | null>(null);

  private search$ = new Subject<string>();

  constructor(
    private productService: ProductService,
  ) {
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe(q => this.doSearch(q));
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
    this.search$.next(value);
  }

  private doSearch(q: string): void {
    if (!q.trim()) {
      this.results.set([]);
      return;
    }
    this.isSearching.set(true);
    this.searchError.set(false);
    this.productService.search(q)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (r) => this.results.set(r),
        error: () => this.searchError.set(true),
      });
  }

  selectProduct(product: ProductResponseFull): void {
    this.selectedProduct.set(
      this.selectedProduct()?.id === product.id ? null : product
    );
    this.selectedVariant.set(null);
  }

  selectVariant(variant: VariantResponseFull): void {
    this.selectedVariant.set(
      this.selectedVariant()?.id === variant.id ? null : variant
    );
    this.quantity.set(1);
    this.addError.set(null);
  }

  onQuantityChange(value: number): void {
    const max = this.selectedVariant()?.stock ?? 1;
    this.quantity.set(Math.min(Math.max(1, value), max));
  }

  addItem(): void {
    const variant = this.selectedVariant();
    const product = this.selectedProduct();
    if (!variant || !product) return;
    this.variantSelected.emit({ variant, product, quantity: this.quantity() });
    this.selectedVariant.set(null);
    this.quantity.set(1);
    this.addError.set(null);
  }

  reset(): void {
    this.query.set('');
    this.results.set([]);
    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
    this.quantity.set(1);
    this.addError.set(null);
  }
}