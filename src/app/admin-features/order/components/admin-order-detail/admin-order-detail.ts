import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { OrderResponse, OrderRequest, OrderItem } from '../../models/order.model';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { PdfGeneratorService } from '../../../../features/cart/services/pdf-generator.service';
import { environment } from '../../../../../environments/environment';
import { ProductService } from '../../../../features/product/services/product.service';
import { ProductResponseFull } from '../../../../features/product/models/product-response-full.model';
import { VariantResponseFull } from '../../../../features/product/models/variant-response-full.model';

interface CartItem {
  productVariantId: number;
  productId: number;
  quantity: number;
  paidQuantity: number;       // ✅ nuevo
  amountPaid: number | null;  // ✅ nuevo
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
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-order-detail.html',
})
export class AdminOrderDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  // private http = inject(HttpClient);
  private orderService = inject(OrderService);
  private pdfService = inject(PdfGeneratorService);

  // private apiUrl = `${environment.apiUrl}/products`;
  private search$ = new Subject<string>();
  private productService = inject(ProductService);

  // ── Estado principal ─────────────────────────────────────────────────────────
  order = signal<OrderResponse | null>(null);
  currentStatus = signal<OrderStatus>(OrderStatus.CREATED);
  isLoading = signal(true);
  isEditing = signal(false);
  isSaving = signal(false);

  // ── Datos cliente ────────────────────────────────────────────────────────────
  customerName = signal('');
  customerAddress = signal('');

  // ── Búsqueda de productos ────────────────────────────────────────────────────
  searchTerm = signal('');
  searchResults = signal<ProductResponseFull[]>([]);
  isSearching = signal(false);
  selectedProduct = signal<ProductResponseFull | null>(null);
  selectedVariant = signal<VariantResponseFull | null>(null);
  quantity = signal(1);
  stockError = signal('');

  // ── Carrito ──────────────────────────────────────────────────────────────────
  cart = signal<CartItem[]>([]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  availableStock = computed(() => {
    const variant = this.selectedVariant();
    if (!variant) return 0;

    // Solo restar si el item fue AGREGADO NUEVO en esta edición
    // no si ya existía en la orden original
    const inCart = this.cart().find(i => i.productVariantId === variant.id);
    const isOriginalItem = this.order()?.orderItems
      .some(oi => oi.productVariant.id === variant.id) ?? false;

    if (isOriginalItem) {
      // Ya estaba en la orden: el stock del backend ya contempla esa reserva
      // solo restamos si aumentamos la cantidad respecto a la original
      const originalQty = this.order()?.orderItems
        .find(oi => oi.productVariant.id === variant.id)?.quantity ?? 0;
      const currentQty = inCart?.quantity ?? 0;
      const extraQty = Math.max(0, currentQty - originalQty);
      return variant.stock - extraQty;
    }

    // Item nuevo: restar lo que hay en carrito normalmente
    return variant.stock - (inCart?.quantity ?? 0);
  });

  cartTotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  cartCostTotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cost * item.quantity, 0)
  );

  canSave = computed(() =>
    this.cart().length > 0 &&
    this.customerName().trim().length > 0 &&
    this.customerAddress().trim().length > 0 &&
    !this.isSaving()
  );

  orderStatusOptions = Object.values(OrderStatus);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadOrder(Number(id));

    // Búsqueda con debounce
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.searchResults.set([]);
          return of(null);
        }
        this.isSearching.set(true);
        return this.productService.searchProductsFull(term).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe(res => {
      this.isSearching.set(false);
      if (res) this.searchResults.set(res.content.filter(p => p.active));
    });
  }

  // ── Carga orden ──────────────────────────────────────────────────────────────

  loadOrder(id: number) {
    this.orderService.getById(id).pipe(
      catchError(() => { this.router.navigate(['/admin/orders']); return of(null); })
    ).subscribe(data => {
      this.order.set(data);
      this.isLoading.set(false);
    });
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get totalUnits(): number {
    return this.order()?.orderItems.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
  }

  get subtotal(): number {
    return this.order()?.orderItems.reduce(
      (acc, item) => acc + item.productVariant.price * item.quantity, 0
    ) ?? 0;
  }

  get subCostTotal(): number {
    return this.order()?.orderItems.reduce(
      (acc, item) => acc + item.productVariant.cost * item.quantity, 0
    ) ?? 0;
  }

  // ── Navegación ───────────────────────────────────────────────────────────────

  goBack() { this.router.navigate(['/admin/orders']); }

  downloadPdf() {
    const order = this.order();
    if (order) this.pdfService.generateOrderPdf(order);
  }

  // ── Modo edición ─────────────────────────────────────────────────────────────

  enterEditMode() {
    const order = this.order();
    if (!order) return;

    this.customerName.set(order.customerName);
    this.customerAddress.set(order.customerAddress);
    this.currentStatus.set(order.status as OrderStatus);

    this.cart.set(order.orderItems.map(item => ({
      productVariantId: item.productVariant.id,
      productId: item.productVariant.productId,
      quantity: item.quantity,
      paidQuantity: item.paidQuantity ?? item.quantity,                           // ✅ default pagado todo
      amountPaid: item.amountPaid ?? 0,
      toneName: item.productVariant.toneName,
      toneCode: item.productVariant.toneCode,
      cost: item.productVariant.cost,
      price: item.productVariant.price,
      productName: item.productVariant.productName,
      stock: item.productVariant.stock,
      imageUrl: item.productVariant.mainImageUrl ?? null,
      separatedQuantity: item.separatedQuantity ?? 0,
      packedQuantity:    item.packedQuantity ?? 0,
    })));

    this.isEditing.set(true);
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.resetSearch();
  }

  // ── Búsqueda de productos ────────────────────────────────────────────────────

  onSearchInput(term: string) {
    this.searchTerm.set(term);
    this.selectedProduct.set(null);   // ← agregar esta línea
    this.selectedVariant.set(null);   // ← y esta
    this.search$.next(term);
    if (!term.trim()) this.selectedProduct.set(null);
  }

  resetSearch() {
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
    this.stockError.set('');
    this.quantity.set(1);
  }

  selectProduct(product: ProductResponseFull) {
    this.selectedProduct.set(product);
    this.selectedVariant.set(null);
    this.quantity.set(1);
    this.stockError.set('');
    // ❌ No limpiar searchTerm ni searchResults
  }

  selectVariant(variant: VariantResponseFull) {
    this.selectedVariant.set(variant);
    this.quantity.set(1);
    this.stockError.set('');
    this.searchResults.set([]); // cerrar dropdown al elegir variante
  }

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
        imageUrl: variant.images?.find(i => i.mainImage)?.url ?? variant.images?.[0]?.url ?? null,
        separatedQuantity: 0,
        packedQuantity: 0,
      }]);
    }

    // Solo limpiar variante y cantidad — producto sigue visible
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

  // ── Guardar orden ────────────────────────────────────────────────────────────

  saveOrder() {
    if (!this.canSave()) return;
    const order = this.order();
    if (!order) return;

    this.isSaving.set(true);

    const request: OrderRequest = {
      customerName: this.customerName(),
      customerAddress: this.customerAddress(),
      status: this.currentStatus(),
      total: this.cartTotal(),
      costTotal: this.cartCostTotal(),
      createdAt: order.createdAt,
      orderItems: this.cart().map(i => ({
        productVariantId: i.productVariantId,
        quantity: i.quantity,
        paidQuantity: i.paidQuantity,
        amountPaid: i.amountPaid,
        separatedQuantity: i.separatedQuantity,
        packedQuantity: i.packedQuantity,
      }))
    };

    this.orderService.update(order.id, request).subscribe({
      next: (updated) => {
        this.order.set(updated); // mainImageUrl ya viene en la respuesta
        this.isEditing.set(false);
        this.isSaving.set(false);
      },
      error: () => {
        alert('Error al actualizar la orden');
        this.isSaving.set(false);
      }
    });
  }

  // ── Helper imagen variante ───────────────────────────────────────────────────
  getMainImageFromVariant(variant: VariantResponseFull): string | null {
    return variant.images?.find(i => i.mainImage)?.url ?? variant.images?.[0]?.url ?? null;
  }

separationStatus = computed(() => {
  const items = this.order()?.orderItems;
  if (!items?.length) return 'none';
  const fullySepped = items.filter(i => i.separatedQuantity >= i.quantity).length;
  if (fullySepped === 0) return 'none';
  if (fullySepped === items.length) return 'all';
  return 'partial';
});

cartSeparationStatus = computed(() => {
  const items = this.cart();
  if (!items.length) return 'none';
  const fullySepped = items.filter(i => i.separatedQuantity >= i.quantity).length;
  if (fullySepped === 0) return 'none';
  if (fullySepped === items.length) return 'all';
  return 'partial';
});

  toggleSeparated(variantId: number) {
  this.cart.update(items =>
    items.map(i => {
      if (i.productVariantId !== variantId) return i;
      const fullySepped = i.separatedQuantity >= i.quantity;
      return { ...i, separatedQuantity: fullySepped ? 0 : i.quantity };
    })
  );
}

markAllSeparated() {
  this.cart.update(items => items.map(i => ({ ...i, separatedQuantity: i.quantity })));
}

  getProductImage(product: ProductResponseFull): string | null {
    if (product.images?.length) return product.images[0].url;
    const img = product.variants?.flatMap(v => v.images || []).find(i => i.mainImage)
      ?? product.variants?.[0]?.images?.[0];
    return img?.url ?? null;
  }


packingStatus = computed(() => {
  const items = this.order()?.orderItems;
  if (!items?.length) return 'none';
  const fullyPacked = items.filter(i => i.packedQuantity >= i.quantity).length;
  if (fullyPacked === 0) return 'none';
  if (fullyPacked === items.length) return 'all';
  return 'partial';
});

cartPackingStatus = computed(() => {
  const items = this.cart();
  if (!items.length) return 'none';
  const fullyPacked = items.filter(i => i.packedQuantity >= i.quantity).length;
  if (fullyPacked === 0) return 'none';
  if (fullyPacked === items.length) return 'all';
  return 'partial';
});

togglePacked(variantId: number) {
  this.cart.update(items =>
    items.map(i => {
      if (i.productVariantId !== variantId) return i;
      const fullyPacked = i.packedQuantity >= i.quantity;
      return {
        ...i,
        packedQuantity: fullyPacked ? 0 : i.quantity,
        separatedQuantity: !fullyPacked ? i.quantity : i.separatedQuantity // packed implica separado
      };
    })
  );
}

markAllPacked() {
  this.cart.update(items =>
    items.map(i => ({ ...i, packedQuantity: i.quantity, separatedQuantity: i.quantity }))
  );
}

markAllPaid() {
  this.cart.update(items =>
    items.map(i => ({
      ...i,
      paidQuantity: i.quantity,
      amountPaid: parseFloat(this.getTotalPrice(i).toFixed(2))
    }))
  );
}

  getTotalPrice(item: CartItem): number {
    return item.price * item.quantity;
  }

  getPaidRatio(item: CartItem): number {
    if (!item.amountPaid) return 0;
    return Math.min(item.amountPaid / this.getTotalPrice(item), 1);
  }

  isFullyPaid(item: CartItem): boolean {
    return this.getPaidRatio(item) >= 1;
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

  updateAmountPaid(variantId: number, amount: number) {
    this.cart.update(items =>
      items.map(i => {
        if (i.productVariantId !== variantId) return i;
        const clamped = Math.max(0, Math.min(amount, this.getTotalPrice(i)));
        return {
          ...i,
          amountPaid: clamped,
          paidQuantity: clamped >= this.getTotalPrice(i) ? i.quantity : Math.floor(clamped / i.price)
        };
      })
    );
  }

  totalPaid = computed(() =>
    this.cart().reduce((acc, i) => acc + (i.amountPaid ?? 0), 0)
  );

  totalPending = computed(() =>
    this.cart().reduce((acc, i) => acc + (this.getTotalPrice(i) - (i.amountPaid ?? 0)), 0)
  );

  getPaidRatioFromItem(item: OrderItem): number {
    if (!item.amountPaid) return 0;
    const total = item.productVariant.price * item.quantity;
    if (total === 0) return 0;
    return Math.min(item.amountPaid / total, 1);
  }

  totalPaidView = computed(() =>
    this.order()?.orderItems.reduce((acc, i) => acc + (i.amountPaid ?? 0), 0) ?? 0
  );

  totalPendingView = computed(() =>
    this.order()?.orderItems.reduce((acc, i) => {
      const total = i.productVariant.price * i.quantity;
      return acc + (total - (i.amountPaid ?? 0));
    }, 0) ?? 0
  );

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
}