import { Component, type OnInit, type OnDestroy, Input, ViewChild, type ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { Router } from '@angular/router';
import { map, Observable, startWith, Subscription } from 'rxjs';
import { ProductImage } from '../../models/product-image.model';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-product-card',
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard implements OnInit, OnDestroy{
  @Input() product?: Product;

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

  getProductImages(product: Product): ProductImage[] {
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    return [{
      id: 0,
      mainImage: true,
      productId: 0,
      url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image'
    }];
  }

  viewProductDetail(product: Product) {
    this.router.navigate(['/products', product.id]);
  }

  // --- Helpers de Precios y Stock ---
  getProductPriceRange(product: Product): string {
    if (!product.variants || product.variants.length === 0) {
      return product.basePrice ? `$${product.basePrice.toFixed(2)}` : 'N/A';
    }
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return `S/. ${minPrice.toFixed(2)}`;
    }
    return `S/. ${minPrice.toFixed(2)} - S/. ${maxPrice.toFixed(2)}`;
  }

    getFirstProductPrice(product: Product): string {
    if (!product.variants || product.variants.length === 0) {
      return product.basePrice ? `S/. ${product.basePrice.toFixed(2)}` : 'N/A';
    }
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices)*1.15;
    const maxPrice = Math.max(...prices)*1.15;

    if (minPrice === maxPrice) {
      return `S/. ${minPrice.toFixed(2)}`;
    }
    return `S/. ${minPrice.toFixed(2)} - S/. ${maxPrice.toFixed(2)}`;
  }

  getTotalStock(product: Product): number {
    if (!product.variants || product.variants.length === 0) return 0;
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  }

  hasLowStock(product: Product): boolean {
    const total = this.getTotalStock(product);
    return total > 0 && total < 10;
  }

}
