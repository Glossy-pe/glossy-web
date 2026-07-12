import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { OrderResponseFull } from '../../models/order-response-full.model';
import { OrderItemResponseFull } from '../../../order-items/models/order-item-response-full.model';
import { finalize } from 'rxjs';
import { OrderItemCard } from "../../../order-items/components/order-item-card/order-item-card";
import { AuthService } from '../../../../manager-features/authentication/services/auth.service';
import { OrderCustomerHeader } from '../order-customer-header/order-customer-header';

export interface LightboxImage {
  url: string;
  type: 'image' | 'video';
}

export interface VariantGroup {
  variantId: number | null;
  toneName?: string;
  toneCode?: string;
  quantity: number;
  unitPrice: number;
  currentPrice: number;
  totalAmount: number;
  amountPaid: number;
  isPaid: boolean;
}

export interface ProductGroup {
  productId: number;
  productName: string;
  images: LightboxImage[];
  variants: VariantGroup[];
  totalAmount: number;
  amountPaid: number;
  originalTotal: number;
}

@Component({
  selector: 'app-order-detail',
  imports: [CommonModule, OrderItemCard, OrderCustomerHeader],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {

  order = signal<OrderResponseFull | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  isExpired = signal(false);
  lastUpdated = signal<Date | null>(null);
isCartExpanded = signal(false);
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) { this.hasError.set(true); return; }
    this.load(token);
  }

  load(token: string): void {
    this.isLoading.set(true);
    this.orderService.getFullByToken(token)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (order) => {
          const expired = order.expiresAt != null && new Date(order.expiresAt) < new Date();
          this.isExpired.set(expired);
          this.order.set(order);
          this.lastUpdated.set(new Date());
        },
        error: () => this.hasError.set(true),
      });
  }

  refresh(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) this.load(token);
  }

  goToManagerOrder(): void {
    this.router.navigate(['/manager/orders', this.order()!.id]);
  }

  // --- Agrupación por producto + variante ---

  private getProductName(item: OrderItemResponseFull): string {
    return item.product?.name ?? item.variant?.toneName ?? '';
  }

  private getProductImages(item: OrderItemResponseFull): LightboxImage[] {
    return (item.product?.images ?? [])
      .map(i => ({ url: i.url, type: (i.resourceType === 'video' ? 'video' : 'image') as 'image' | 'video' }));
  }

  private getVariantImages(item: OrderItemResponseFull): LightboxImage[] {
    return (item.variant?.images ?? [])
      .map(i => ({ url: i.url, type: (i.resourceType === 'video' ? 'video' : 'image') as 'image' | 'video' }));
  }

  sortedItems = computed<OrderItemResponseFull[]>(() =>
    [...(this.order()?.items ?? [])].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
  );

  // Agrupa por producto -> variante, calculando monto pagado real por variante
  private variantsByProduct = computed<Map<number, { productName: string; images: LightboxImage[]; variants: VariantGroup[] }>>(() => {
    const map = new Map<number, { productName: string; images: LightboxImage[]; variants: VariantGroup[] }>();

    for (const item of this.sortedItems()) {
      const productId = item.product?.id ?? item.variant?.productId;
      if (productId == null) continue;

      const itemTotal = (item.unitPrice ?? 0) * item.quantity;
      const itemPaid = item.amountPaid ?? 0;

      let entry = map.get(productId);
      if (!entry) {
        entry = { productName: this.getProductName(item), images: this.getProductImages(item), variants: [] };
        map.set(productId, entry);
      }

      const variantId = item.variant?.id ?? -1;
      let variant = entry.variants.find(v => (v.variantId ?? -1) === variantId);
      if (!variant) {
        variant = {
          variantId: item.variant?.id ?? null,
          toneName: item.variant?.toneName,
          toneCode: item.variant?.toneCode,
          quantity: 0,
          unitPrice: item.unitPrice ?? 0,
          currentPrice: item.variant?.price ?? 0,
          totalAmount: 0,
          amountPaid: 0,
          isPaid: false,
        };
        entry.variants.push(variant);
        entry.images.push(...this.getVariantImages(item));
      }

      variant.quantity += item.quantity;
      variant.totalAmount += itemTotal;
      variant.amountPaid += itemPaid;
    }

    for (const entry of map.values()) {
      for (const v of entry.variants) {
        v.isPaid = v.amountPaid >= v.totalAmount;
      }
    }

    return map;
  });

  // Una card por producto, solo con las variantes AÚN NO completas
  unpaidProducts = computed<ProductGroup[]>(() => {
    const result: ProductGroup[] = [];
    this.variantsByProduct().forEach((entry, productId) => {
      const pending = entry.variants.filter(v => !v.isPaid);
      if (!pending.length) return;
      result.push({
        productId,
        productName: entry.productName,
        images: entry.images,
        variants: pending,
        totalAmount: pending.reduce((s, v) => s + v.totalAmount, 0),
        originalTotal: pending.reduce((s, v) => s + v.currentPrice * v.quantity, 0),
        amountPaid: pending.reduce((s, v) => s + v.amountPaid, 0),
      });
    });
    return result;
  });

  // Una card por producto, solo con las variantes YA completas
  paidProducts = computed<ProductGroup[]>(() => {
    const result: ProductGroup[] = [];
    this.variantsByProduct().forEach((entry, productId) => {
      const paid = entry.variants.filter(v => v.isPaid);
      if (!paid.length) return;
      result.push({
        productId,
        productName: entry.productName,
        images: entry.images,
        variants: paid,
        totalAmount: paid.reduce((s, v) => s + v.totalAmount, 0),
        originalTotal: paid.reduce((s, v) => s + v.currentPrice * v.quantity, 0),
        amountPaid: paid.reduce((s, v) => s + v.amountPaid, 0),
      });
    });
    return result;
  });

  totalPaid = computed<number>(() =>
    (this.order()?.items ?? []).reduce((sum, item) => sum + (item.amountPaid ?? 0), 0)
  );

  totalPending = computed<number>(() =>
    (this.order()?.items ?? []).reduce((sum, item) => sum + ((item.unitPrice ?? 0) * item.quantity - (item.amountPaid ?? 0)), 0)
  );

    totalOriginal = computed<number>(() =>
    [...this.unpaidProducts(), ...this.paidProducts()]
      .reduce((sum, g) => sum + g.originalTotal, 0)
  );

  totalDiscount = computed<number>(() => {
    const diff = this.totalOriginal() - (this.order()?.total ?? 0);
    return diff > 0 ? diff : 0;
  });

  toggleCart(): void {
    this.isCartExpanded.update(v => !v);
  }
}