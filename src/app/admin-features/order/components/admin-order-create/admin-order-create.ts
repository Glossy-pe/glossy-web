import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap, catchError } from 'rxjs';
import { OrderService } from '../../services/order.service';
import { OrderItemRequest, OrderRequest } from '../../models/order.model';
import { environment } from '../../../../../environments/environment';

interface VariantImageResponse {
  id: number;
  variantId: number;
  url: string;
  position: number;
  mainImage: boolean;
}

interface VariantResponseFull {
  id: number;
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  stock: number;
  position: number;
  active: boolean;
  images: VariantImageResponse[];
  separated: boolean;
  packed: boolean;
}

interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  active: boolean;
  categoryId: number;
  variants: VariantResponseFull[];
}

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
}

interface CartItem {
  productVariantId: number;
  productId: number;
  quantity: number;
  paidQuantity: number;       // ✅
  amountPaid: number | null;  // ✅
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  productName: string;
  stock: number;
  imageUrl: string | null;
  separatedQuantity: number;
  packedQuantity: number;
}

export enum OrderStatus {
  QUOTE = 'QUOTE',
  CREATED = 'CREATED',
  CREADO = 'CREADO',
  ACUMULANDO = 'ACUMULANDO',
  PENDIENTE_PACKAGE = 'PENDIENTE_PACKAGE',
  PENDIENTE_ENVIO = 'PENDIENTE_ENVIO',
  ENVIADO = 'ENVIADO',
  PAID = 'PAID'
}

@Component({
  selector: 'app-admin-order-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-order-create.html',
})
export class AdminOrderCreate {

  // ── Status ───────────────────────────────────────────────────────────────────
  currentStatus = signal<OrderStatus>(OrderStatus.QUOTE); // ✅ default QUOTE
  orderStatusOptions = Object.values(OrderStatus);


  private http = inject(HttpClient);
  private orderService = inject(OrderService);
  private router = inject(Router);

  private apiUrl = `${environment.apiUrl}/products`;
  private search$ = new Subject<string>();

  // ── Búsqueda ─────────────────────────────────────────────────────────────────
  searchTerm = signal('');
  searchResults = signal<ProductResponseFull[]>([]);
  isSearching = signal(false);
  selectedProduct = signal<ProductResponseFull | null>(null);
  selectedVariant = signal<VariantResponseFull | null>(null);
  quantity = signal(1);
  stockError = signal('');

  // ── Carrito ──────────────────────────────────────────────────────────────────
  cart = signal<CartItem[]>([]);

  // ── Cliente ──────────────────────────────────────────────────────────────────
  customerName = signal('');
  customerAddress = signal('');

  // ── UI ───────────────────────────────────────────────────────────────────────
  isSaving = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────────
  availableStock = computed(() => {
    const variant = this.selectedVariant();
    if (!variant) return 0;
    const inCart = this.cart().find(i => i.productVariantId === variant.id);
    return variant.stock - (inCart?.quantity ?? 0);
  });

  total = computed(() =>
    this.cart().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  costTotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cost * item.quantity, 0)
  );

  canSave = computed(() =>
    this.cart().length > 0 &&
    this.customerName().trim().length > 0 &&
    this.customerAddress().trim().length > 0 &&
    !this.isSaving()
  );

  constructor() {
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.searchResults.set([]);
          return of(null);
        }
        this.isSearching.set(true);
        return this.http.get<PageResponse<ProductResponseFull>>(
          `${this.apiUrl}/full/search?q=${encodeURIComponent(term)}&size=20`
        ).pipe(catchError(() => of(null)));
      })
    ).subscribe(res => {
      this.isSearching.set(false);
      if (res) this.searchResults.set(res.content);
    });
  }

  // ── Búsqueda ─────────────────────────────────────────────────────────────────

  onSearchInput(term: string) {
    this.searchTerm.set(term);
    this.selectedProduct.set(null);   // ← agregar esta línea
    this.selectedVariant.set(null);   // ← y esta
    this.search$.next(term);
    if (!term.trim()) this.selectedProduct.set(null);
  }

  selectProduct(product: ProductResponseFull) {
    this.selectedProduct.set(product);
    this.selectedVariant.set(null);
    this.quantity.set(1);
    this.stockError.set('');
    // ✅ No limpiar searchTerm ni searchResults aquí
  }

  selectVariant(variant: VariantResponseFull) {
    this.selectedVariant.set(variant);
    this.quantity.set(1);
    this.stockError.set('');
  }

  resetSearch() {
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
    this.stockError.set('');
    this.quantity.set(1);
  }

  getMainImageFromVariant(variant: VariantResponseFull | undefined | null): string | null {
    if (!variant) return null;
    return variant.images?.find(i => i.mainImage)?.url ?? variant.images?.[0]?.url ?? null;
  }

  // ── Carrito ──────────────────────────────────────────────────────────────────

  setQuantity(value: number) {
    const max = this.availableStock();
    if (value < 1) return;
    if (value > max) {
      this.stockError.set(`Stock insuficiente. Máximo disponible: ${max}`);
      this.quantity.set(max);
      return;
    }
    this.stockError.set('');
    this.quantity.set(value);
  }

  addToCart() {
    const variant = this.selectedVariant();
    const product = this.selectedProduct();

    if (!variant || !product) return;

    if (this.quantity() > this.availableStock()) {
      this.stockError.set(`Stock insuficiente. Máximo: ${this.availableStock()}`);
      return;
    }

    const imageUrl = this.getMainImageFromVariant(variant);
    const existing = this.cart().find(i => i.productVariantId === variant.id);

    if (existing) {
      this.cart.update(items =>
        items.map(i => {
          if (i.productVariantId !== variant.id) return i;
          const newQty = i.quantity + this.quantity();
          return {
            ...i,
            quantity: newQty,
            paidQuantity: newQty,                                      // ✅
            amountPaid: parseFloat((i.price * newQty).toFixed(2))     // ✅
          };
        })
      );
    }

    else {
      const totalPrice = parseFloat((variant.price * this.quantity()).toFixed(2));


      this.cart.update(items => [...items, {
        productVariantId: variant.id,
        productId: product.id,
        quantity: this.quantity(),
        paidQuantity: 0,
        amountPaid: 0,
        toneName: variant.toneName,
        toneCode: variant.toneCode,
        cost: variant.cost,
        price: variant.price,
        productName: product.name,
        stock: variant.stock,
        separatedQuantity: 0,
        packedQuantity: 0,
        imageUrl
      }]);
    }

    // Solo limpia variante y cantidad — producto sigue seleccionado
    this.selectedVariant.set(null);
    this.quantity.set(1);
    this.stockError.set('');
  }
  updateCartQuantity(variantId: number, qty: number) {
    const item = this.cart().find(i => i.productVariantId === variantId);
    if (!item || qty < 1) return;
    if (qty > item.stock) qty = item.stock;
    this.cart.update(items =>
      items.map(i => i.productVariantId === variantId ? {
        ...i,
        quantity: qty,
        paidQuantity: qty,                                    // ✅ actualiza al nuevo total
        amountPaid: parseFloat((i.price * qty).toFixed(2))   // ✅
      } : i)
    );
  }

  removeFromCart(variantId: number) {
    this.cart.update(items => items.filter(i => i.productVariantId !== variantId));
  }

  // ── Guardar ──────────────────────────────────────────────────────────────────

  saveOrder() {
    if (!this.canSave()) return;
    this.isSaving.set(true);

    const request: OrderRequest = {
      customerName: this.customerName(),
      customerAddress: this.customerAddress(),
      status: this.currentStatus(), // ✅ usa el signal
      total: this.total(),
      costTotal: this.costTotal(),
      createdAt: new Date().toISOString(),
      orderItems: this.cart().map(i => ({
        productVariantId: i.productVariantId,
        quantity: i.quantity,
        paidQuantity: i.paidQuantity,  // conserva lo que ya había pagado
        amountPaid: i.amountPaid,
        separatedQuantity: i.separatedQuantity,
        packedQuantity: i.packedQuantity,
      }))
    };

    this.orderService.create(request).subscribe({
      next: (order) => this.router.navigate(['/admin/orders', order.id]),
      error: () => {
        alert('Error al crear la orden');
        this.isSaving.set(false);
      }
    });
  }

  goBack() { this.router.navigate(['/admin/orders']); }

  getProductImage(product: ProductResponseFull): string | null {
    const img = product.variants?.flatMap(v => v.images || []).find(i => i.mainImage)
      ?? product.variants?.[0]?.images?.[0];
    return img?.url ?? null;
  }

  // ── Computed pago ────────────────────────────────────────────────────────────
  totalPaid = computed(() =>
    this.cart().reduce((acc, i) => acc + (i.amountPaid ?? 0), 0)
  );

  totalPending = computed(() =>
    this.cart().reduce((acc, i) => acc + this.getPendingAmount(i), 0)
  );

  // ── Helpers pago ─────────────────────────────────────────────────────────────
  getTotalPrice(item: CartItem): number {
    return item.price * item.quantity;
  }

  getPendingAmount(item: CartItem): number {
    return this.getTotalPrice(item) - (item.amountPaid ?? 0);
  }

  isFullyPaid(item: CartItem): boolean {
    if (item.amountPaid == null) return false;
    return item.amountPaid >= this.getTotalPrice(item);
  }

  updatePaidQuantity(variantId: number, qty: number) {
    this.cart.update(items =>
      items.map(i => {
        if (i.productVariantId !== variantId) return i;
        const clamped = Math.max(0, Math.min(qty, i.quantity));
        return { ...i, paidQuantity: clamped, amountPaid: parseFloat((i.price * clamped).toFixed(2)) };
      })
    );
  }

  updateAmountPaid(variantId: number, amount: number) {
    this.cart.update(items =>
      items.map(i => {
        if (i.productVariantId !== variantId) return i;
        const clamped = Math.max(0, Math.min(amount, this.getTotalPrice(i)));
        return { ...i, amountPaid: clamped, paidQuantity: Math.floor(clamped / i.price) };
      })
    );
  }

  getPaidRatio(item: CartItem): number {
    if (!item.amountPaid) return 0;
    return Math.min(item.amountPaid / this.getTotalPrice(item), 1);
  }

  togglePaid(variantId: number) {
    this.cart.update(items =>
      items.map(i => {
        if (i.productVariantId !== variantId) return i;
        const fullyPaid = this.isFullyPaid(i);
        return {
          ...i,
          paidQuantity: fullyPaid ? 0 : i.quantity,
          amountPaid: fullyPaid ? 0 : parseFloat(this.getTotalPrice(i).toFixed(2))
        };
      })
    );
  }

  toggleSeparated(variantId: number) {
    this.cart.update(items =>
      items.map(i => i.productVariantId === variantId ? { ...i, separatedQuantity: !i.separatedQuantity ? i.quantity : 0 } : i)
    );
  }

  togglePacked(variantId: number) {
    this.cart.update(items =>
      items.map(i => i.productVariantId === variantId
        ? { ...i, packedQuantity: !i.packedQuantity ? i.quantity : 0 }
        : i
      )
    );
  }


  updateSeparatedQuantity(variantId: number, qty: number) {
  this.cart.update(items =>
    items.map(i => {
      if (i.productVariantId !== variantId) return i;
      const clamped = Math.max(0, Math.min(qty, i.quantity));
      return { ...i, separatedQuantity: clamped };
    })
  );
}

updatePackedQuantity(variantId: number, qty: number) {
  this.cart.update(items =>
    items.map(i => {
      if (i.productVariantId !== variantId) return i;
      const clamped = Math.max(0, Math.min(qty, i.quantity));
      return {
        ...i,
        packedQuantity: clamped,
        separatedQuantity: Math.max(i.separatedQuantity, clamped) // packed no puede superar separated
      };
    })
  );
}

cartPaidStatus = computed(() => {
  const items = this.cart();
  if (!items.length) return 'none';
  const fullyPaid = items.filter(i => this.isFullyPaid(i)).length;
  if (fullyPaid === 0) return 'none';
  if (fullyPaid === items.length) return 'all';
  return 'partial';
});

markAllPaid() {
  this.cart.update(items =>
    items.map(i => ({
      ...i,
      paidQuantity: i.quantity,
      amountPaid: parseFloat(this.getTotalPrice(i).toFixed(2))
    }))
  );
}

cartSeparationStatus = computed(() => {
  const items = this.cart();
  if (!items.length) return 'none';
  const fullySepped = items.filter(i => i.separatedQuantity >= i.quantity).length;
  if (fullySepped === 0) return 'none';
  if (fullySepped === items.length) return 'all';
  return 'partial';
});

markAllSeparated() {
  this.cart.update(items => items.map(i => ({ ...i, separatedQuantity: i.quantity })));
}

cartPackingStatus = computed(() => {
  const items = this.cart();
  if (!items.length) return 'none';
  const fullyPacked = items.filter(i => i.packedQuantity >= i.quantity).length;
  if (fullyPacked === 0) return 'none';
  if (fullyPacked === items.length) return 'all';
  return 'partial';
});


markAllPacked() {
  this.cart.update(items =>
    items.map(i => ({ ...i, packedQuantity: i.quantity, separatedQuantity: i.quantity }))
  );
}
}