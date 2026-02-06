// src/app/features/cart/services/cart.service.ts
import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from '../../product/models/product.model';
import { ProductVariant } from '../../product/models/product-variant.model';
import { CartItem } from '../components/models/cart-item.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly STORAGE_KEY = 'beauty_cart';
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  // Signal para el estado del carrito
  private cartItems = signal<CartItem[]>([]);

  // Exponemos como readonly
  readonly items = this.cartItems.asReadonly();

  // Computados
  readonly totalItems = computed(() => {
    return this.cartItems().reduce((acc, item) => acc + item.quantity, 0);
  });

  readonly subtotal = computed(() => {
    return this.cartItems().reduce((acc, item) => 
      acc + (item.selectedVariant.price * item.quantity), 0
    );
  });

  readonly total = computed(() => {
    const shipping = this.subtotal() > 50 ? 0 : 5;
    return this.subtotal() + shipping;
  });

  constructor() {
    // Primero verificar la plataforma
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Luego cargar los datos
    this.cartItems.set(this.loadFromStorage());

    // ← AGREGAR: Escuchar cambios en localStorage desde otras pestañas
    if (this.isBrowser) {
      window.addEventListener('storage', (event) => {
        if (event.key === this.STORAGE_KEY) {
          // Recargar el carrito cuando cambie en otra pestaña
          this.cartItems.set(this.loadFromStorage());
          console.log('Cart synced from another tab');
        }
      });
    }
  }

  // Cargar desde localStorage
  private loadFromStorage(): CartItem[] {
    if (!this.isBrowser) {
      return [];
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      return [];
    }
  }

  // Guardar en localStorage
  private saveToStorage(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cartItems()));
      console.log('Cart saved to localStorage:', this.cartItems());
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  // Agregar producto al carrito
  addItem(product: Product, selectedVariant: ProductVariant, quantity: number = 1): void {
    const currentItems = this.cartItems();
    
    const existingItemIndex = currentItems.findIndex(
      item => item.product.id === product.id && 
              item.selectedVariant.id === selectedVariant.id
    );

    if (existingItemIndex > -1) {
      const existingItem = currentItems[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity <= selectedVariant.stock) {
        existingItem.quantity = newQuantity;
        this.cartItems.set([...currentItems]);
      } else {
        if (this.isBrowser) {
          alert(`Solo hay ${selectedVariant.stock} unidades disponibles de ${selectedVariant.toneName}`);
        }
        return; // ← No guardar si excede el stock
      }
    } else {
      const newItem: CartItem = {
        product,
        selectedVariant,
        quantity
      };
      this.cartItems.set([...currentItems, newItem]);
    }

    this.saveToStorage();
  }

  // Actualizar cantidad
  updateQuantity(item: CartItem, change: number): void {
    const currentItems = this.cartItems();
    const index = currentItems.findIndex(
      i => i.product.id === item.product.id && 
           i.selectedVariant.id === item.selectedVariant.id
    );
    
    if (index === -1) return;

    const newQuantity = item.quantity + change;

    if (newQuantity >= 1 && newQuantity <= item.selectedVariant.stock) {
      currentItems[index].quantity = newQuantity;
      this.cartItems.set([...currentItems]);
      this.saveToStorage();
    }
  }

  // Eliminar item
  removeItem(item: CartItem): void {
    this.cartItems.update(items => 
      items.filter(i => 
        !(i.product.id === item.product.id && 
          i.selectedVariant.id === item.selectedVariant.id)
      )
    );
    this.saveToStorage();
  }

  // Limpiar carrito
  clearCart(): void {
    this.cartItems.set([]);
    this.saveToStorage();
  }

  // Obtener cantidad de un producto/variante específica
  getItemQuantity(productId: number, variantId: number): number {
    const item = this.cartItems().find(
      i => i.product.id === productId && i.selectedVariant.id === variantId
    );
    return item ? item.quantity : 0;
  }
}