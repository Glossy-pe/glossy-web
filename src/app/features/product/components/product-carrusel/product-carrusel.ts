import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Router } from '@angular/router';
import { map, Observable, startWith, Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductCard } from '../product-card/product-card';

import { ProductResponseFull } from '../../models/product-response-full.model';
import { VariantImageResponse } from '../../models/variant-image.model';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { VariantResponseFull } from '../../models/variant-response-full.model';

@Component({
  selector: 'app-product-carrusel',
  imports: [CommonModule, ProductCard],
  templateUrl: './product-carrusel.html',
  styleUrl: './product-carrusel.scss',
})
export class ProductCarrusel implements OnInit, OnDestroy {

  @Input() labelId?: string = "1";
  @Input() labelName?: string = "Productos";

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  private subscription?: Subscription;
  apiImageServer = environment.apiImageServer;

  products$!: Observable<PageResponse<ProductResponseFull>>;
  isLoading$!: Observable<boolean>;

  currentImageIndex: Record<number, number> = {};
  hoveringControls: Record<number, boolean> = {};
  errorMessage = '';

  constructor(
    private productService: ProductService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.resetState();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  resetState(): void {
    this.errorMessage = '';
    this.currentImageIndex = {};
    this.hoveringControls = {};
  }

  loadProducts(): void {
    const products$ = this.productService.getProducts(0, 10);
    this.products$ = products$;

    this.isLoading$ = products$.pipe(
      map(() => false),
      startWith(true)
    );
  }

  // --- SCROLL ---
  scrollLeft(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: -340, behavior: 'smooth' });
  }

  scrollRight(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: 340, behavior: 'smooth' });
  }

  // --- IMÁGENES (desde variants) ---
  getProductImages(product: ProductResponseFull): VariantImageResponse[] {
    const images = product.variants?.flatMap(
      (v: VariantResponseFull) => v.images || []
    ) || [];

    if (images.length > 0) return images;

    return [{
      id: 0,
      variantId: 0,
      url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image',
      position: 0,
      mainImage: true
    }];
  }

  handleImageError(event: any) {
    event.target.src = 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image';
  }

  // --- CAROUSEL INTERNO ---
  nextImage(event: Event, product: ProductResponseFull) {
    event.stopPropagation();
    event.preventDefault();

    const images = this.getProductImages(product);
    const index = this.currentImageIndex[product.id] || 0;

    this.currentImageIndex[product.id] = (index + 1) % images.length;
  }

  prevImage(event: Event, product: ProductResponseFull) {
    event.stopPropagation();
    event.preventDefault();

    const images = this.getProductImages(product);
    const index = this.currentImageIndex[product.id] || 0;

    this.currentImageIndex[product.id] = (index - 1 + images.length) % images.length;
  }

  setHoverControl(productId: number, isHovering: boolean) {
    this.hoveringControls[productId] = isHovering;
  }

  isHoveringControls(productId: number): boolean {
    return !!this.hoveringControls[productId];
  }

  viewProductDetail(product: ProductResponseFull) {
    this.router.navigate(['/products', product.id]);
  }

  // --- PRECIO (desde variantes) ---
  getProductPrice(product: ProductResponseFull): string {
    const variants = product.variants || [];

    if (variants.length === 0) return 'N/A';

    const min = Math.min(
      ...variants.map((v: VariantResponseFull) => v.price)
    );

    return `S/. ${min.toFixed(2)}`;
  }

  // --- STOCK ---
  getTotalStock(product: ProductResponseFull): number {
  const variants = product.variants || [];

    return variants.reduce(
      (sum: number, v: VariantResponseFull) => sum + v.stock,
      0
    );
  }

  hasLowStock(product: ProductResponseFull): boolean {
    const total = this.getTotalStock(product);
    return total > 0 && total < 10;
  }

  isOutOfStock(product: ProductResponseFull): boolean {
    return this.getTotalStock(product) === 0;
  }
}