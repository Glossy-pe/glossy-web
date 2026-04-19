import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { OrderService } from '../../services/order.service';
import { OrderResponse, OrderRequest } from '../../models/order.model';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { PdfGeneratorService } from '../../../../features/cart/services/pdf-generator.service';
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
}

interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
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
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  productName: string;
  stock: number;
  imageUrl: string | null;
  separated: boolean;
}

export enum OrderStatus {
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
  private http = inject(HttpClient);
  private orderService = inject(OrderService);
  private pdfService = inject(PdfGeneratorService);

  private apiUrl = `${environment.apiUrl}/products`;
  private search$ = new Subject<string>();

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
        return this.http.get<PageResponse<ProductResponseFull>>(
          `${this.apiUrl}/full/search?q=${encodeURIComponent(term)}&size=20`
        ).pipe(catchError(() => of(null)));
      })
    ).subscribe(res => {
      this.isSearching.set(false);
      if (res) this.searchResults.set(res.content);
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
      toneName: item.productVariant.toneName,
      toneCode: item.productVariant.toneCode,
      cost: item.productVariant.cost,
      price: item.productVariant.price,
      productName: item.productVariant.productName,
      stock: item.productVariant.stock,
      imageUrl: item.productVariant.mainImageUrl ?? null,
      separated: item.separated ?? false,
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
        items.map(i => i.productVariantId === variant.id
          ? { ...i, quantity: i.quantity + this.quantity() }
          : i
        )
      );
    } else {
      this.cart.update(items => [...items, {
        productVariantId: variant.id,
        productId: product.id,
        quantity: this.quantity(),
        toneName: variant.toneName,
        toneCode: variant.toneCode,
        cost: variant.cost,
        price: variant.price,
        productName: product.name,
        stock: variant.stock,
        imageUrl: variant.images?.find(i => i.mainImage)?.url ?? variant.images?.[0]?.url ?? null,
        separated: variant.separated
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
      items.map(i => i.productVariantId === variantId ? { ...i, quantity: qty } : i)
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
        separated: i.separated
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
  if (!items || items.length === 0) return 'none';
  const separated = items.filter(i => i.separated === true).length;
  if (separated === 0) return 'none';
  if (separated === items.length) return 'all';
  return 'partial';
});

// Para el modo edición (carrito)
cartSeparationStatus = computed(() => {
  const items = this.cart();
  if (!items.length) return 'none';
  const separated = items.filter(i => i.separated).length;
  if (separated === 0) return 'none';
  if (separated === items.length) return 'all';
  return 'partial';
});

toggleSeparated(variantId: number) {
  this.cart.update(items =>
    items.map(i => i.productVariantId === variantId
      ? { ...i, separated: !i.separated }
      : i
    )
  );
}

markAllSeparated() {
  this.cart.update(items => items.map(i => ({ ...i, separated: true })));
}
}