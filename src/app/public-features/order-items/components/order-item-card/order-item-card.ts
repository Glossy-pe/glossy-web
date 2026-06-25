import { Component, computed, Input, Output, signal } from '@angular/core';
import { OrderItemResponseFull } from '../../../order-items/models/order-item-response-full.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventEmitter } from 'stream';

interface LightboxImage {
  url: string;
  type: 'image' | 'video';
}

@Component({
  selector: 'app-order-item-card',
  imports: [CommonModule],
  templateUrl: './order-item-card.html',
  styleUrl: './order-item-card.scss',
})
export class OrderItemCard {

  @Input() item!: OrderItemResponseFull;

  lightboxImages = signal<LightboxImage[]>([]);
  isLightboxOpen = signal(false);
  lastUpdated = signal<Date | null>(null);
  selectedImageIndex = signal(0);

  activeImage = computed<LightboxImage>(() =>
    this.lightboxImages()[this.selectedImageIndex()] ?? { url: '', type: 'image' }
  );
  
  constructor(
    private router: Router,
  ) { }

  getMainImage(item: OrderItemResponseFull): string | null {
    const productImg = item.product?.images?.find(i => i.mainImage) ?? item.product?.images?.[0];
    if (productImg) return productImg.url;
    const variantImg = item.variant?.images?.find(i => i.mainImage) ?? item.variant?.images?.[0];
    return variantImg?.url ?? null;
  }


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

  navigateToProduct(item: OrderItemResponseFull): void {
    const productId = item.product?.id ?? item.variant?.productId;
    if (!productId) return;
    const queryParams = item.variant?.toneName
      ? { tono: encodeURIComponent(item.variant.toneName) }
      : {};
    this.router.navigate(['/guest/products', productId], { queryParams });
  }

  getProductName(item: OrderItemResponseFull): string {
    return item.product?.name ?? item.variant?.toneName ?? '';
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
}
