import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { Router } from '@angular/router';
import { map, Observable, startWith, Subscription } from 'rxjs';
import { ProductImage } from '../../models/product-image.model';
import { environment } from '../../../../../environments/environment';
import {ProductCard} from '../product-card/product-card';

@Component({
  selector: 'app-product-carrusel',
  imports: [CommonModule, ProductCard],
  templateUrl: './product-carrusel.html',
  styleUrl: './product-carrusel.scss',
})
export class ProductCarrusel  implements OnInit, OnDestroy {
  @Input() labelId?: string = "1";
  @Input() labelName?: string = "Productos";

  // Referencia al contenedor del slider para hacer scroll
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  private subscription?: Subscription;
  apiImageServer = environment.apiImageServer;

  products$!: Observable<Product[]>;
  isLoading$!: Observable<boolean>;

  // Estado para controlar índice de imagen y hover
  currentImageIndex: Record<number, number> = {};
  hoveringControls: Record<number, boolean> = {};
  errorMessage = '';

  constructor(
    private productService: ProductService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.resetState();
    this.loadProducts();
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

  loadProducts(): void {
    const products$ = this.productService.getProducts(this.labelId); // Mantenemos tu lógica original
    this.products$ = products$;
    this.isLoading$ = products$.pipe(
      map(() => false),
      startWith(true)
    );
  }

  // --- Lógica del Scroll Horizontal (Slider) ---
  scrollLeft(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollBy({ left: -340, behavior: 'smooth' });
    }
  }

  scrollRight(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollBy({ left: 340, behavior: 'smooth' });
    }
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

  // --- Lógica del Carrusel Interno de la Card ---
  nextImage(event: Event, product: Product) {
    event.stopPropagation(); // Importante: evita que el click dispare viewProductDetail
    event.preventDefault();

    const images = this.getProductImages(product);
    const currentIndex = this.currentImageIndex[product.id] || 0;
    this.currentImageIndex[product.id] = (currentIndex + 1) % images.length;
  }

  prevImage(event: Event, product: Product) {
    event.stopPropagation();
    event.preventDefault();

    const images = this.getProductImages(product);
    const currentIndex = this.currentImageIndex[product.id] || 0;
    this.currentImageIndex[product.id] = (currentIndex - 1 + images.length) % images.length;
  }

  setHoverControl(productId: number, isHovering: boolean) {
    this.hoveringControls[productId] = isHovering;
  }

  isHoveringControls(productId: number): boolean {
    return !!this.hoveringControls[productId];
  }

  viewProductDetail(product: Product) {
    this.router.navigate(['/products', product.id]);
  }

  // --- Helpers de Precios y Stock ---
  getProductPriceRange(product: Product): string {
    if (!product.variants || product.variants.length === 0) {
      return product.basePrice ? `S/. ${product.basePrice.toFixed(2)}` : 'N/A';
    }
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

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

  isOutOfStock(product: Product): boolean {
    return this.getTotalStock(product) === 0;
  }
}
