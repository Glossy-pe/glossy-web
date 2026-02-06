import { Component, OnInit, OnDestroy, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Product} from '../../models/product.model';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, startWith, Subscription, tap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Category } from '../../../category/models/category.model';
import { CategoryService } from '../../../category/services/category.service';
import { ProductImage } from '../../models/product-image.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit, OnDestroy {

  // Input opcional para recibir el label
  @Input() label?: string;

  private subscription?: Subscription;
  apiImageServer= environment.apiImageServer;

  products$!: Observable<Product[]>;
  categories$!: Observable<Category[]>
  isLoading$!: Observable<boolean>;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.categories$ = this.categoryService.getCategories();
    this.resetState();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    // this.isLoading$ = false;
  }

  searchTerm: string = '';
  selectedCategory: number | null = null;

  // Estado para controlar el índice de la imagen actual de cada producto
  currentImageIndex: { [productId: number]: number } = {};

  // Estado para evitar el efecto de zoom en la imagen cuando se hace hover sobre las flechas
  hoveringControls: { [productId: number]: boolean } = {};

  errorMessage: string = '';

  resetState(): void {
    this.errorMessage = '';
    this.currentImageIndex = {};
    this.hoveringControls = {};
  }

  loadProducts(): void {
    // Ahora pasas el label al servicio
    const products$ = this.productService.getProducts(this.label);
    this.products$ = products$;
    this.isLoading$ = products$.pipe(
      map(() => false),
      startWith(true)
    );
  }

  get filteredProducts(): Product[] {
    let productos: Product[] = new Array();
    return productos;
    // return this.products.filter(product => {
    //   const matchesCategory = this.selectedCategory === null || product.categoryId === this.selectedCategory;
    //   const matchesSearch = product.name.toLowerCase().includes(this.searchTerm.toLowerCase());
    //   return matchesCategory && matchesSearch;
    // });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
  }

  setCategory(categoryId: number | null): void {
    this.selectedCategory = categoryId;
  }

  handleImageError(event: any) {
    event.target.src = 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image';
  }

  // --- Helper para manejar imágenes ---
  getProductImages(product: Product): ProductImage[] {
    // La API devuelve un array de imágenes directamente
    if (product.images && product.images.length > 0) {
      return product.images;
    }

    let tempProductImage: ProductImage = {
      id: 0,
      mainImage: true,
      productId: 0,
      url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image'
    };

    // Fallback si no hay imágenes
    return [tempProductImage];
  }

  // --- Lógica del Carrusel ---
  nextImage(event: Event, product: Product) {
    event.stopPropagation();
    event.preventDefault();

    const images = this.getProductImages(product);
    const currentIndex = this.currentImageIndex[product.id] || 0;
    const totalImages = images.length;

    this.currentImageIndex[product.id] = (currentIndex + 1) % totalImages;
  }

  prevImage(event: Event, product: Product) {
    event.stopPropagation();
    event.preventDefault();

    const images = this.getProductImages(product);
    const currentIndex = this.currentImageIndex[product.id] || 0;
    const totalImages = images.length;

    this.currentImageIndex[product.id] = (currentIndex - 1 + totalImages) % totalImages;
  }

  // Controla el estado del hover sobre los controles para evitar zoom en la imagen
  setHoverControl(productId: number, isHovering: boolean) {
    this.hoveringControls[productId] = isHovering;
  }

  isHoveringControls(productId: number): boolean {
    return !!this.hoveringControls[productId];
  }

  viewProductDetail(product: Product) {
    this.router.navigate(['/products', product.id]);
  }

  // --- Helpers para obtener info del producto ---
  getProductPriceRange(product: Product): string {
    if (!product.variants || product.variants.length === 0) {
      // Si no hay variantes, usar basePrice
      return product.basePrice ? `$${product.basePrice.toFixed(2)}` : 'N/A';
    }

    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return `$${minPrice.toFixed(2)}`;
    }
    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
  }

  getTotalStock(product: Product): number {
    if (!product.variants || product.variants.length === 0) {
      return 0;
    }
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