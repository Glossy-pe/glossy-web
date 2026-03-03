import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderResponse, OrderRequest } from '../../models/order.model';
import { ProductService } from '../../../../features/product/services/product.service';
import { Product } from '../../../../features/product/models/product.model';
import { ProductVariant } from '../../../../features/product/models/product-variant.model';
import { catchError, map, Observable, of } from 'rxjs';
import { PdfGeneratorService } from '../../../../features/cart/services/pdf-generator.service';

interface CartItem {
  productVariantId: number;
  productId: number;
  quantity: number;
  toneName: string;
  toneCode: string;
  price: number;
  productName: string;
  stock: number;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order-detail.html',
})
export class AdminOrderDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private pdfService = inject(PdfGeneratorService);

  order = signal<OrderResponse | null>(null);
  currentStatus = signal<OrderStatus>(OrderStatus.CREATED);
  isLoading = signal(true);

  // Edit mode
  isEditing = signal(false);
  isSaving = signal(false);

  // Customer fields
  customerName = signal('');
  customerAddress = signal('');

  // Product search
  products = signal<Product[]>([]);
  isLoadingProducts = signal(false);
  searchTerm = signal('');
  selectedProduct = signal<Product | null>(null);
  selectedVariant = signal<ProductVariant | null>(null);
  quantity = signal(1);
  stockError = signal('');

  // Cart (edit state)
  cart = signal<CartItem[]>([]);

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(term));
  });

  availableStock = computed(() => {
    const variant = this.selectedVariant();
    if (!variant) return 0;
    const inCart = this.cart().find(i => i.productVariantId === variant.id);
    return variant.stock - (inCart?.quantity ?? 0);
  });

  cartTotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  canSave = computed(() =>
    this.cart().length > 0 &&
    this.customerName().trim().length > 0 &&
    this.customerAddress().trim().length > 0 &&
    !this.isSaving()
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadOrder(Number(id));
  }

  loadOrder(id: number) {
    this.orderService.getById(id).pipe(
      catchError(() => {
        this.router.navigate(['/admin/orders']);
        return of(null);
      })
    ).subscribe(data => {
      this.order.set(data);
      this.isLoading.set(false);
    });
  }

  get totalUnits(): number {
    return this.order()?.orderItems.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
  }

  get subtotal(): number {
    return this.order()?.orderItems.reduce(
      (acc, item) => acc + item.productVariant.price * item.quantity, 0
    ) ?? 0;
  }

  goBack() {
    this.router.navigate(['/admin/orders']);
  }

  downloadPdf() {
    const order = this.order();
    if (order) this.pdfService.generateOrderPdf(order);
  }

  // ─── Edit Mode ───────────────────────────────────────────

  enterEditMode() {
    const order = this.order();
    if (!order) return;

    this.customerName.set(order.customerName);
    this.customerAddress.set(order.customerAddress);
    this.currentStatus.set(order.status as OrderStatus);

    // Map existing order items → cart
    this.cart.set(order.orderItems.map(item => ({
      productVariantId: item.productVariant.id,
      productId: item.productVariant.productId,
      quantity: item.quantity,
      toneName: item.productVariant.toneName,
      toneCode: item.productVariant.toneCode,
      price: item.productVariant.price,
      productName: item.productVariant.productName,
      stock: item.productVariant.stock
    })));

    // Load products if not loaded yet
    if (this.products().length === 0) {
      this.isLoadingProducts.set(true);
      this.productService.getProducts().subscribe({
        next: (data) => {
          this.products.set(data);
          this.isLoadingProducts.set(false);
        },
        error: () => this.isLoadingProducts.set(false)
      });
    }

    this.isEditing.set(true);
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
    this.searchTerm.set('');
    this.stockError.set('');
  }

  selectProduct(product: Product) {
    this.selectedProduct.set(product);
    this.selectedVariant.set(null);
    this.quantity.set(1);
    this.stockError.set('');
    this.searchTerm.set('');
  }

  selectVariant(variant: ProductVariant) {
    this.selectedVariant.set(variant);
    this.quantity.set(1);
    this.stockError.set('');
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
      this.stockError.set(`Stock insuficiente. Máximo disponible: ${this.availableStock()}`);
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
        productId: variant.productId,
        quantity: this.quantity(),
        toneName: variant.toneName,
        toneCode: variant.toneCode,
        price: variant.price,
        productName: product.name,
        stock: variant.stock,
      }]);
    }

    this.selectedProduct.set(null);
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
      createdAt: order.createdAt,
      orderItems: this.cart().map(i => ({
        productVariantId: i.productVariantId,
        quantity: i.quantity
      }))
    };

    this.orderService.update(order.id, request).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.isEditing.set(false);
        this.isSaving.set(false);
      },
      error: () => {
        alert('Error al actualizar la orden');
        this.isSaving.set(false);
      }
    });
  }

  orderStatusOptions = Object.values(OrderStatus);

  getProductImage(productId: number): Observable<string | null> {
    return this.productService.getProductById(productId).pipe(
      map(product => product.images?.[0]?.url ?? null)
    );
  }
}