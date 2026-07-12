import { Component, computed, Input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductGroup, LightboxImage } from '../../../orders/components/order-detail/order-detail';

@Component({
  selector: 'app-order-item-card',
  imports: [CommonModule],
  templateUrl: './order-item-card.html',
  styleUrl: './order-item-card.scss',
})
export class OrderItemCard {

  @Input() group!: ProductGroup;

  isLightboxOpen = signal(false);
  selectedImageIndex = signal(0);

  activeImage = computed<LightboxImage>(() =>
    this.group.images[this.selectedImageIndex()] ?? { url: '', type: 'image' }
  );

  constructor(private router: Router) {}

  openLightbox(startIndex = 0): void {
    if (!this.group.images.length) return;
    this.selectedImageIndex.set(startIndex);
    this.isLightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  prevImage(): void {
    this.selectedImageIndex.update(i =>
      i === 0 ? this.group.images.length - 1 : i - 1
    );
  }

  nextImage(): void {
    this.selectedImageIndex.update(i =>
      i === this.group.images.length - 1 ? 0 : i + 1
    );
  }

  navigateToProduct(): void {
    const firstVariant = this.group.variants[0];
    const queryParams = firstVariant?.toneName
      ? { tono: encodeURIComponent(firstVariant.toneName) }
      : {};
    this.router.navigate(['/guest/products', this.group.productId], { queryParams });
  }


  hasProductDiscount(): boolean {
    return this.group.totalAmount < this.group.originalTotal;
  }
  
}