import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../../../features/product/services/product.service';
import { OrderService } from '../../services/order.service';
import { Product } from '../../../../features/product/models/product.model';
import { ProductVariant } from '../../../../features/product/models/product-variant.model';
import { OrderItemRequest, OrderRequest } from '../../models/order.model';

interface CartItem {
  productVariantId: number;
  quantity: number;
  toneName: string;
  toneCode: string;
  price: number;
  productName: string;
  stock: number;
}

@Component({
  selector: 'app-admin-order-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order-create.html',
})
export class AdminOrderCreate implements OnInit {

  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  cart = signal<CartItem[]>([]);

  isLoadingProducts = signal(true);
  isSaving = signal(false);

  searchTerm = signal('');
  selectedProduct = signal<Product | null>(null);
  selectedVariant = signal<ProductVariant | null>(null);
  quantity = signal(1);
  stockError = signal('');
  customerName = signal('');
  customerAddress = signal('');

  // Productos filtrados por búsqueda
  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(term)
    );
  });

  // Stock disponible real (descontando lo que ya está en carrito)
  availableStock = computed(() => {
    const variant = this.selectedVariant();
    if (!variant) return 0;
    const inCart = this.cart().find(i => i.productVariantId === variant.id);
    return variant.stock - (inCart?.quantity ?? 0);
  });

  total = computed(() =>
    this.cart().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  canSave = computed(() =>
    this.cart().length > 0 &&
    this.customerName().trim().length > 0 &&
    this.customerAddress().trim().length > 0 &&
    !this.isSaving()
  );

  ngOnInit() {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isLoadingProducts.set(false);
      },
      error: () => this.isLoadingProducts.set(false)
    });
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
        quantity: this.quantity(),
        toneName: variant.toneName,
        toneCode: variant.toneCode,
        price: variant.price,
        productName: product.name,
        stock: variant.stock
      }]);
    }

    this.selectedProduct.set(null);
    this.selectedVariant.set(null);
    this.quantity.set(1);
    this.stockError.set('');
  }

  updateCartQuantity(variantId: number, qty: number) {
    const item = this.cart().find(i => i.productVariantId === variantId);
    if (!item) return;
    if (qty < 1) return;
    if (qty > item.stock) {
      qty = item.stock;
    }
    this.cart.update(items =>
      items.map(i => i.productVariantId === variantId ? { ...i, quantity: qty } : i)
    );
  }

  removeFromCart(variantId: number) {
    this.cart.update(items => items.filter(i => i.productVariantId !== variantId));
  }

  saveOrder() {
    if (!this.canSave()) return;
    this.isSaving.set(true);

    const request: OrderRequest = {
      customerName: this.customerName(),
      customerAddress: this.customerAddress(),
      status: 'CREATED',
      total: this.total(),
      createdAt: new Date().toISOString(),
      orderItems: this.cart().map(i => ({
        productVariantId: i.productVariantId,
        quantity: i.quantity
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

  goBack() {
    this.router.navigate(['/admin/orders']);
  }
}