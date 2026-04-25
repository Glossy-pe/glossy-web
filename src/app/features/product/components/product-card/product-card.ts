import { Component, type OnInit, type OnDestroy, Input, ViewChild, type ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { Router } from '@angular/router';
import { map, Observable, startWith, Subscription } from 'rxjs';
import { ProductImage } from '../../models/product-image.model';
import { environment } from '../../../../../environments/environment';
import { VariantImageResponse } from '../../models/variant-image-response.model';
import { ProductResponseFull } from '../../models/product-response-full.model';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard implements OnInit, OnDestroy{
  @Input() productResponseFull?: ProductResponseFull;

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  private subscription?: Subscription;
  apiImageServer = environment.apiImageServer;

  currentImageIndex: Record<number, number> = {};
  hoveringControls: Record<number, boolean> = {};
  errorMessage = '';

  constructor(
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.resetState();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  resetState(): void {
    this.errorMessage = '';
    this.currentImageIndex = {};
    this.hoveringControls = {};
  }


  // --- Manejo de Imágenes ---
  handleImageError(event: any) {
    event.target.src = 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image';
  }

  // getProductImages(productResponse: ProductResponse): VariantImageResponse[] {
  //   if (productResponse.images && productResponse.images.length > 0) {
  //     return productResponse.images;
  //   }
  //   return [{
  //     id: 0,
  //     mainImage: true,
  //     productId: 0,
  //     url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image'
  //   }];
  // }

  getMainImage(productResponseFull: ProductResponseFull): VariantImageResponse {
  // 1. Primero buscar en imágenes generales del producto
  const productImages = productResponseFull.images ?? [];
  if (productImages.length > 0) {
    const mainProductImage = productImages.find(img => img.mainImage) ?? productImages[0];
    return {
      id: mainProductImage.id,
      variantId: 0,
      url: mainProductImage.url,
      position: mainProductImage.position ?? 0,
      mainImage: mainProductImage.mainImage ?? true
    };
  }

  // 2. Fallback: imagen principal de variante
  const variantImage = productResponseFull.variants
    ?.flatMap(v => v.images || [])
    ?.find(img => img.mainImage);

  return variantImage ?? {
    id: 0,
    variantId: 0,
    url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image',
    position: 1,
    mainImage: true
  };
}

  viewProductDetail(productResponseFull: ProductResponseFull) {
    this.router.navigate(['/products', productResponseFull.slug]);
  }

  // --- Helpers de Precios y Stock ---
  getProductPriceRange(productResponseFull: ProductResponseFull): string {
    const variants = productResponseFull.variants || [];

    if (variants.length === 0) return 'N/A';

    const prices = variants.map(v => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return min === max
      ? `S/. ${min.toFixed(2)}`
      : `S/. ${min.toFixed(2)} - S/. ${max.toFixed(2)}`;
  }

  getFirstProductPrice(productResponseFull: ProductResponseFull): string {
    const variants = productResponseFull.variants || [];

    if (variants.length === 0) return 'N/A';

    const minVariant = variants.reduce((prev, curr) =>
      curr.price < prev.price ? curr : prev
    );

    const price = minVariant.price * 1.15; // tu margen

    return `S/. ${price.toFixed(2)}`;
  }

  getTotalStock(productResponseFull: ProductResponseFull): number {
    if (!productResponseFull.variants || productResponseFull.variants.length === 0) return 0;
    return productResponseFull.variants.reduce((sum, v) => sum + v.stock, 0);
  }

  hasLowStock(productResponseFull: ProductResponseFull): boolean {
    const total = this.getTotalStock(productResponseFull);
    return total > 0 && total < 10;
  }

  hasNotStock(productResponseFull: ProductResponseFull): boolean {
    const total = this.getTotalStock(productResponseFull);
    return total == 0;
  }

}
