import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { CartStorage } from '../components/models/cart-storage.model';
import { CartItem } from '../components/models/cart-item.model';
import { Product } from '../../product/models/product.model';
import { ProductService } from '../../product/services/product.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly STORAGE_KEY = 'beauty_cart';
  private readonly STORAGE_VERSION = 'v2';
  private readonly VERSION_KEY = 'beauty_cart_version';
  private platformId = inject(PLATFORM_ID);
  private productService = inject(ProductService);

  // Solo IDs + cantidad en el signal
  private storedItems = signal<CartStorage[]>(this.loadFromStorage());

  // Signal público de CartItems resueltos (async)
  // Se usa en el componente con async pipe o toSignal
  resolvedItems = signal<CartItem[]>([]);

  readonly totalItems = computed(() =>
    this.storedItems().reduce((acc, i) => acc + i.quantity, 0)
  );

  // subtotal y total dependen de resolvedItems
  readonly subtotal = computed(() =>
    this.resolvedItems().reduce(
      (acc, i) => acc + i.selectedVariant.price * i.quantity, 0
    )
  );

  readonly total = computed(() => this.subtotal());

  constructor() {
    // Resolver items al iniciar y cada vez que storedItems cambie
    this.refreshResolvedItems();
  }

  // Llama a la API para resolver productos frescos desde los IDs guardados
  refreshResolvedItems(): void {
    const stored = this.storedItems();
    if (stored.length === 0) {
      this.resolvedItems.set([]);
      return;
    }

    // Obtener IDs únicos de productos
    const uniqueProductIds = [...new Set(stored.map(i => i.productId))];

    // Fetch paralelo de cada producto
    const requests: Observable<Product>[] = uniqueProductIds.map(id =>
      this.productService.getProductById(id)
    );

    forkJoin(requests).subscribe({
      next: (products) => {
        const resolved: CartItem[] = stored
          .map(stored => {
            const product = products.find(p => p.id === stored.productId);
            const variant = product?.variants?.find(v => v.id === stored.variantId);
            if (!product || !variant) return null;
            return { product, selectedVariant: variant, quantity: stored.quantity };
          })
          .filter((item): item is CartItem => item !== null);

        this.resolvedItems.set(resolved);
      },
      error: (err) => {
        console.error('Error resolving cart items:', err);
      }
    });
  }

  addItem(productId: number, variantId: number, quantity = 1): void {
    const current = this.storedItems();
    const existingIndex = current.findIndex(
      i => i.productId === productId && i.variantId === variantId
    );

    if (existingIndex > -1) {
      const updated = current.map((item, idx) =>
        idx === existingIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      this.storedItems.set(updated);
    } else {
      this.storedItems.set([...current, { productId, variantId, quantity }]);
    }

    this.saveToStorage();
    this.refreshResolvedItems(); // re-fetch para tener datos frescos
  }

  updateQuantity(item: CartItem, change: number): void {
    const newQty = item.quantity + change;
    if (newQty < 1) return;

    this.storedItems.update(items =>
      items.map(i =>
        i.productId === item.product.id && i.variantId === item.selectedVariant.id
          ? { ...i, quantity: newQty }
          : i
      )
    );

    // Actualizar también resolvedItems localmente (sin re-fetch innecesario)
    this.resolvedItems.update(items =>
      items.map(i =>
        i.product.id === item.product.id && i.selectedVariant.id === item.selectedVariant.id
          ? { ...i, quantity: newQty }
          : i
      )
    );

    this.saveToStorage();
  }

  removeItem(item: CartItem): void {
    this.storedItems.update(items =>
      items.filter(i =>
        !(i.productId === item.product.id && i.variantId === item.selectedVariant.id)
      )
    );
    this.resolvedItems.update(items =>
      items.filter(i =>
        !(i.product.id === item.product.id && i.selectedVariant.id === item.selectedVariant.id)
      )
    );
    this.saveToStorage();
  }

  clearCart(): void {
    this.storedItems.set([]);
    this.resolvedItems.set([]);
    this.saveToStorage();
  }

  getItemQuantity(productId: number, variantId: number): number {
    return this.storedItems().find(
      i => i.productId === productId && i.variantId === variantId
    )?.quantity ?? 0;
  }

  private loadFromStorage(): CartStorage[] {
    if (!isPlatformBrowser(this.platformId)) return [];

    try {
      const currentVersion = localStorage.getItem(this.VERSION_KEY);

      if (currentVersion !== this.STORAGE_VERSION) {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.setItem(this.VERSION_KEY, this.STORAGE_VERSION);
        return [];
      }

      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];

    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.storedItems()));
    } catch (err) {
      console.error('Error saving cart:', err);
    }
  }
}