import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { environment } from '../../../../../environments/environment';
import { CartItem } from '../models/cart-item.model';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProductResponseFull } from '../../../product/models/product-response-full.model';
import { VariantResponseFull } from '../../../product/models/variant-response-full.model';

@Component({
  selector: 'app-cart-list',
  imports: [CommonModule],
  templateUrl: './cart-list.html',
  styleUrl: './cart-list.scss',
})
export class CartList implements OnInit {
  
  numero = "51996629113";
  apiImageServer = environment.apiImageServer;

  constructor(
    public readonly cartService: CartService,
    private pdfGenerator: PdfGeneratorService,
    private router: Router,
    private http: HttpClient,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {}

  readonly cartItems = computed<CartItem[]>(() => this.cartService.resolvedItems());
  readonly totalItems = computed<number>(() => this.cartService.totalItems());

  readonly availableItems = computed<CartItem[]>(() =>
    this.cartItems().filter(i => i.selectedVariant.stock > 0)
  );

  selectedVariantIds = signal<Set<number>>(new Set());

  readonly selectedItems = computed<CartItem[]>(() =>
    this.cartItems().filter(i =>
      i.selectedVariant.stock > 0 &&
      this.selectedVariantIds().has(i.selectedVariant.id)
    )
  );

  readonly subtotal = computed<number>(() =>
    this.selectedItems().reduce((acc, i) => acc + i.selectedVariant.price * i.quantity, 0)
  );

  readonly total = computed<number>(() => this.subtotal());

  isSelected(item: CartItem): boolean {
    return this.selectedVariantIds().has(item.selectedVariant.id);
  }

  get allAvailableSelected(): boolean {
    const available = this.availableItems();
    if (available.length === 0) return false;
    return available.every(i => this.selectedVariantIds().has(i.selectedVariant.id));
  }

  toggleItem(item: CartItem): void {
    if (item.selectedVariant.stock === 0) return;
    const current = new Set(this.selectedVariantIds());
    current.has(item.selectedVariant.id)
      ? current.delete(item.selectedVariant.id)
      : current.add(item.selectedVariant.id);
    this.selectedVariantIds.set(current);
  }

  toggleAll(): void {
    if (this.allAvailableSelected) {
      this.selectedVariantIds.set(new Set());
    } else {
      this.selectedVariantIds.set(new Set(this.availableItems().map(i => i.selectedVariant.id)));
    }
  }

  updateQuantity(item: CartItem, change: number): void {
    this.cartService.updateQuantity(item, change);
  }

  removeItem(item: CartItem): void {
    const current = new Set(this.selectedVariantIds());
    current.delete(item.selectedVariant.id);
    this.selectedVariantIds.set(current);
    this.cartService.removeItem(item);
  }

  getItemImage(item: CartItem): string {
    const images = item.selectedVariant.images;
    if (!images?.length) return 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image';
    const main = images.find(img => img.mainImage) ?? images[0];
    return main.url;
  }

  generateProformaPDF(): void {
    const items = this.selectedItems();
    if (items.length === 0) return;
    this.pdfGenerator.generateProforma(items, this.subtotal(), this.total());
  }

  goToPay(): void {
    const items = this.selectedItems();
    if (items.length === 0) return;
    const lineas = items.map(i =>
      `• ${i.product.name} (${i.selectedVariant.toneName}) x${i.quantity} — S/. ${(i.selectedVariant.price * i.quantity).toFixed(2)}`
    ).join('\n');
    const mensaje = `Hola! 👋 Quiero hacer este pedido:\n\n${lineas}\n\n*Total: S/. ${this.total().toFixed(2)}*`;
    window.open(`https://api.whatsapp.com/send?phone=${this.numero}&text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }

  goToItem(item: CartItem): void {
  this.router.navigate(['/products', item.product.slug], {
    queryParams: { tono: encodeURIComponent(item.selectedVariant.toneName) }
  });
}
}