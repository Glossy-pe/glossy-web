// cart-list.ts
import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { environment } from '../../../../../environments/environment';
import { CartItem } from '../models/cart-item.model';

@Component({
  selector: 'app-cart-list',
  imports: [CommonModule],
  templateUrl: './cart-list.html',
  styleUrl: './cart-list.scss',
})
export class CartList {
  numero = "51923895798";
  apiImageServer = environment.apiImageServer;

  selectedVariantIds = signal<Set<number>>(new Set());

  constructor(
    public readonly cartService: CartService,
    private pdfGenerator: PdfGeneratorService
  ) {}

  // Typed computed signals — sin doble llamada, sin any
  readonly cartItems = computed<CartItem[]>(() =>
    this.cartService.resolvedItems()
  );

  readonly totalItems = computed<number>(() =>
    this.cartService.totalItems()
  );

  readonly availableItems = computed<CartItem[]>(() =>
    this.cartItems().filter((i: CartItem) => i.selectedVariant.stock > 0)
  );

  readonly selectedItems = computed<CartItem[]>(() =>
    this.cartItems().filter((i: CartItem) =>
      i.selectedVariant.stock > 0 &&
      this.selectedVariantIds().has(i.selectedVariant.id)
    )
  );

  readonly subtotal = computed<number>(() =>
    this.selectedItems().reduce(
      (acc: number, i: CartItem) => acc + i.selectedVariant.price * i.quantity,
      0
    )
  );

  readonly total = computed<number>(() => this.subtotal());

  // --- Selección ---

  isSelected(item: CartItem): boolean {
    return this.selectedVariantIds().has(item.selectedVariant.id);
  }

  get allAvailableSelected(): boolean {
    const available = this.availableItems();
    if (available.length === 0) return false;
    return available.every((i: CartItem) =>
      this.selectedVariantIds().has(i.selectedVariant.id)
    );
  }

  get someSelected(): boolean {
    return this.selectedItems().length > 0 && !this.allAvailableSelected;
  }

  toggleItem(item: CartItem): void {
    if (item.selectedVariant.stock === 0) return;
    const current = new Set(this.selectedVariantIds());
    if (current.has(item.selectedVariant.id)) {
      current.delete(item.selectedVariant.id);
    } else {
      current.add(item.selectedVariant.id);
    }
    this.selectedVariantIds.set(current);
  }

  toggleAll(): void {
    if (this.allAvailableSelected) {
      this.selectedVariantIds.set(new Set());
    } else {
      const allIds = new Set<number>(
        this.availableItems().map((i: CartItem) => i.selectedVariant.id)
      );
      this.selectedVariantIds.set(allIds);
    }
  }

  // --- Acciones ---

  updateQuantity(item: CartItem, change: number): void {
    this.cartService.updateQuantity(item, change);
  }

  removeItem(item: CartItem): void {
    const current = new Set(this.selectedVariantIds());
    current.delete(item.selectedVariant.id);
    this.selectedVariantIds.set(current);
    this.cartService.removeItem(item);
  }

  generateProformaPDF(): void {
    const items = this.selectedItems();
    if (items.length === 0) return;
    const shipping = this.subtotal() > 30 ? 0 : 5;
    this.pdfGenerator.generateProforma(items, this.subtotal(), shipping, this.total());
  }

  goToPay(): void {
    const items = this.selectedItems();
    if (items.length === 0) return;

    const lineas = items
      .map((i: CartItem) =>
        `• ${i.product.name} (${i.selectedVariant.toneName}) x${i.quantity} — S/. ${(i.selectedVariant.price * i.quantity).toFixed(2)}`
      )
      .join('\n');

    const mensaje = `Hola! 👋 Quiero hacer este pedido:\n\n${lineas}\n\n*Total: S/. ${this.total().toFixed(2)}*`;
    const url = `https://api.whatsapp.com/send?phone=${this.numero}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }
}