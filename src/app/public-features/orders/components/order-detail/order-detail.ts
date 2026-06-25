import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { OrderResponseFull } from '../../models/order-response-full.model';
import { OrderItemResponseFull } from '../../../order-items/models/order-item-response-full.model';
import { finalize } from 'rxjs';
import { OrderItemCard } from "../../../order-items/components/order-item-card/order-item-card";
import { AuthService } from '../../../../manager-features/authentication/services/auth.service';

interface LightboxImage {
  url: string;
  type: 'image' | 'video';
}

@Component({
  selector: 'app-order-detail',
  imports: [CommonModule, OrderItemCard],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {

  
  order = signal<OrderResponseFull | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  isExpired = signal(false);

  isLightboxOpen = signal(false);
  lastUpdated = signal<Date | null>(null);
  selectedImageIndex = signal(0);
  lightboxImages = signal<LightboxImage[]>([]);

  activeImage = computed<LightboxImage>(() =>
    this.lightboxImages()[this.selectedImageIndex()] ?? { url: '', type: 'image' }
  );

  sortedItems = computed<OrderItemResponseFull[]>(() =>
    [...(this.order()?.items ?? [])].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
  );

  paidItems = computed<OrderItemResponseFull[]>(() =>
    this.sortedItems().filter(item => item.paidQuantity >= item.quantity)
  );

  unpaidItems = computed<OrderItemResponseFull[]>(() =>
    this.sortedItems().filter(item => item.paidQuantity < item.quantity)
  );

constructor(
  private route: ActivatedRoute,
  private router: Router,
  private orderService: OrderService,
  public authService: AuthService  // ← agregar
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
          this.lastUpdated.set(new Date()); // 👈
        },
        error: () => this.hasError.set(true),
      });
  }

  // Imagen principal del producto (fallback a variante)
  getMainImage(item: OrderItemResponseFull): string | null {
    const productImg = item.product?.images?.find(i => i.mainImage) ?? item.product?.images?.[0];
    if (productImg) return productImg.url;
    const variantImg = item.variant?.images?.find(i => i.mainImage) ?? item.variant?.images?.[0];
    return variantImg?.url ?? null;
  }

  getProductName(item: OrderItemResponseFull): string {
    return item.product?.name ?? item.variant?.toneName ?? '';
  }

  // Lightbox
  openLightbox(item: OrderItemResponseFull, startIndex = 0): void {
    const productImages: LightboxImage[] = (item.product?.images ?? [])
      .map(i => ({ url: i.url, type: i.resourceType === 'video' ? 'video' : 'image' as 'image' | 'video' }));

    const variantImages: LightboxImage[] = (item.variant?.images ?? [])
      .map(i => ({ url: i.url, type: i.resourceType === 'video' ? 'video' : 'image' as 'image' | 'video' }));

    const all = [...productImages, ...variantImages];
    if (!all.length) return;

    this.lightboxImages.set(all);
    this.selectedImageIndex.set(startIndex);
    this.isLightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  prevImage(): void {
    this.selectedImageIndex.update(i =>
      i === 0 ? this.lightboxImages().length - 1 : i - 1
    );
  }

  nextImage(): void {
    this.selectedImageIndex.update(i =>
      i === this.lightboxImages().length - 1 ? 0 : i + 1
    );
  }

  getPaidAmount(item: OrderItemResponseFull): number {
    return (item.unitPrice ?? 0) * item.paidQuantity;
  }

  getPendingAmount(item: OrderItemResponseFull): number {
    return (item.unitPrice ?? 0) * (item.quantity - item.paidQuantity);
  }

  totalPaid = computed<number>(() =>
    (this.order()?.items ?? []).reduce((sum, item) => sum + this.getPaidAmount(item), 0)
  );

  totalPending = computed<number>(() =>
    (this.order()?.items ?? []).reduce((sum, item) => sum + this.getPendingAmount(item), 0)
  );

navigateToProduct(item: OrderItemResponseFull): void {
  const productId = item.product?.id ?? item.variant?.productId;
  if (!productId) return;
  const queryParams = item.variant?.toneName
    ? { tono: encodeURIComponent(item.variant.toneName) }
    : {};
  this.router.navigate(['/guest/products', productId], { queryParams });
}

refresh(): void {
  const token = this.route.snapshot.paramMap.get('token');
  if (token) this.load(token);
}

goToManagerOrder(): void {
  this.router.navigate(['/manager/orders', this.order()!.id]);
}
}