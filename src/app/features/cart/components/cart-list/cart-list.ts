import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { environment } from '../../../../../environments/environment';
import { CartItem } from '../models/cart-item.model';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProductResponseFull } from '../../../product/models/product-response-full.model';

export interface GiftSelection {
  product: ProductResponseFull;
  variantId: number;
}

export interface GiftModalState {
  open: boolean;
  tier: 'basic' | 'medio' | 'pro' | null;
  product: ProductResponseFull | null;
  previewVariantId: number | null;
}

@Component({
  selector: 'app-cart-list',
  imports: [CommonModule],
  templateUrl: './cart-list.html',
  styleUrl: './cart-list.scss',
})
export class CartList implements OnInit {
  numero = "51996629113";
  apiImageServer = environment.apiImageServer;
  private apiUrl = environment.apiUrl;

  selectedVariantIds = signal<Set<number>>(new Set());

  // ── Regalos ───────────────────────────────────────────────────────────────
  giftProductsBasic = signal<ProductResponseFull[]>([]);
  giftProductsMedio = signal<ProductResponseFull[]>([]);
  giftProductsPro   = signal<ProductResponseFull[]>([]);

  selectedGiftBasic = signal<GiftSelection | null>(null);
  selectedGiftMedio = signal<GiftSelection | null>(null);
  selectedGiftPro   = signal<GiftSelection | null>(null);

  // ── Modal ─────────────────────────────────────────────────────────────────
  modal = signal<GiftModalState>({
    open: false, tier: null, product: null, previewVariantId: null
  });

  constructor(
    public readonly cartService: CartService,
    private pdfGenerator: PdfGeneratorService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.loadGiftProducts();
  }

  private loadGiftProducts() {
    this.http.get<any[]>(`${this.apiUrl}/labels`).subscribe(labels => {
      const basic = labels.find(l => l.name === 'REGALOS BASICO');
      const medio = labels.find(l => l.name === 'REGALOS MEDIO');
      const pro   = labels.find(l => l.name === 'REGALOS PRO');
      if (basic) this.loadGiftsByLabel(basic.id, 'basic');
      if (medio) this.loadGiftsByLabel(medio.id, 'medio');
      if (pro)   this.loadGiftsByLabel(pro.id,   'pro');
    });
  }

  private loadGiftsByLabel(labelId: number, tier: 'basic' | 'medio' | 'pro') {
    this.http.get<any>(`${this.apiUrl}/products/full?labelId=${labelId}&size=50`).subscribe(res => {
      const products: ProductResponseFull[] = res.content ?? [];
      if (tier === 'basic') this.giftProductsBasic.set(products);
      if (tier === 'medio') this.giftProductsMedio.set(products);
      if (tier === 'pro')   this.giftProductsPro.set(products);
    });
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  openGiftModal(tier: 'basic' | 'medio' | 'pro', product: ProductResponseFull) {
    if (!this.isLevelUnlocked(tier) || !this.hasAnyStock(product)) return;
    const firstVariant = product.variants?.find(v => v.stock > 0);
    this.modal.set({
      open: true,
      tier,
      product,
      previewVariantId: firstVariant?.id ?? null
    });
  }

  closeModal() {
    this.modal.update(m => ({ ...m, open: false }));
  }

  setPreviewVariant(variantId: number) {
    this.modal.update(m => ({ ...m, previewVariantId: variantId }));
  }

  confirmGiftSelection() {
    const m = this.modal();
    if (!m.tier || !m.product || !m.previewVariantId) return;
    const selection: GiftSelection = { product: m.product, variantId: m.previewVariantId };

    if (m.tier === 'basic') this.selectedGiftBasic.set(selection);
    if (m.tier === 'medio') this.selectedGiftMedio.set(selection);
    if (m.tier === 'pro')   this.selectedGiftPro.set(selection);

    this.closeModal();
  }

  removeGift(tier: 'basic' | 'medio' | 'pro') {
    if (tier === 'basic') this.selectedGiftBasic.set(null);
    if (tier === 'medio') this.selectedGiftMedio.set(null);
    if (tier === 'pro')   this.selectedGiftPro.set(null);
  }

  getModalPreviewImage(): string {
    const m = this.modal();
    if (!m.product || !m.previewVariantId) return '';
    const variant = m.product.variants?.find(v => v.id === m.previewVariantId);
    if (!variant?.images?.length) return 'https://placehold.co/400x400/F3F4F6/9CA3AF?text=🎁';
    const main = variant.images.find(i => i.mainImage) ?? variant.images[0];
    return main.url;
  }

  getModalPreviewVariant() {
    const m = this.modal();
    if (!m.product || !m.previewVariantId) return null;
    return m.product.variants?.find(v => v.id === m.previewVariantId) ?? null;
  }

  // ── Gift helpers ──────────────────────────────────────────────────────────

  hasAnyStock(product: ProductResponseFull): boolean {
    return product.variants?.some(v => v.stock > 0) ?? false;
  }

  getAvailableVariants(product: ProductResponseFull) {
    return product.variants?.filter(v => v.stock > 0) ?? [];
  }

  getGiftImage(product: ProductResponseFull): string {
    const variant = product.variants?.find(v => v.stock > 0) ?? product.variants?.[0];
    if (!variant?.images?.length) return 'https://placehold.co/200x200/F3F4F6/9CA3AF?text=🎁';
    const main = variant.images.find(i => i.mainImage) ?? variant.images[0];
    return main.url;
  }

  getSelectedGift(tier: 'basic' | 'medio' | 'pro'): GiftSelection | null {
    if (tier === 'basic') return this.selectedGiftBasic();
    if (tier === 'medio') return this.selectedGiftMedio();
    return this.selectedGiftPro();
  }

  getGiftProducts(tier: 'basic' | 'medio' | 'pro'): ProductResponseFull[] {
    if (tier === 'basic') return this.giftProductsBasic();
    if (tier === 'medio') return this.giftProductsMedio();
    return this.giftProductsPro();
  }

  isGiftSelected(tier: 'basic' | 'medio' | 'pro', productId: number): boolean {
    return this.getSelectedGift(tier)?.product.id === productId;
  }

  getVariantById(product: ProductResponseFull, variantId: number) {
    return product.variants?.find(v => v.id === variantId);
  }

  getVariantName(product: ProductResponseFull, variantId: number): string {
    return this.getVariantById(product, variantId)?.toneName ?? '';
  }

  readonly selectedGifts = computed<GiftSelection[]>(() =>
    [this.selectedGiftBasic(), this.selectedGiftMedio(), this.selectedGiftPro()]
      .filter(Boolean) as GiftSelection[]
  );

  // ── Niveles ───────────────────────────────────────────────────────────────

  readonly giftTier = computed<'none' | 'basic' | 'medio' | 'pro'>(() => {
    const t = this.subtotal();
    if (t >= 50) return 'pro';
    if (t >= 30) return 'medio';
    if (t >  0)  return 'basic';
    return 'none';
  });

  isLevelUnlocked(level: 'basic' | 'medio' | 'pro'): boolean {
    const tier = this.giftTier();
    if (level === 'basic') return tier !== 'none';
    if (level === 'medio') return tier === 'medio' || tier === 'pro';
    return tier === 'pro';
  }

  amountToUnlock(level: 'medio' | 'pro'): string {
    const diff = level === 'medio' ? 30 - this.subtotal() : 50 - this.subtotal();
    return diff > 0 ? diff.toFixed(2) : '0.00';
  }

  // ── Cart computed ─────────────────────────────────────────────────────────

  readonly cartItems = computed<CartItem[]>(() => this.cartService.resolvedItems());
  readonly totalItems = computed<number>(() => this.cartService.totalItems());

  readonly availableItems = computed<CartItem[]>(() =>
    this.cartItems().filter(i => i.selectedVariant.stock > 0)
  );

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
    const gifts = this.selectedGifts();
    const giftLineas = gifts.length
      ? '\n\n🎁 *Regalos elegidos:*\n' + gifts.map(g =>
          `• ${g.product.name} — ${this.getVariantName(g.product, g.variantId)} (regalo gratuito 🎁)`
        ).join('\n')
      : '';
    const mensaje = `Hola! 👋 Quiero hacer este pedido:\n\n${lineas}${giftLineas}\n\n*Total: S/. ${this.total().toFixed(2)}*`;
    window.open(`https://api.whatsapp.com/send?phone=${this.numero}&text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }
}