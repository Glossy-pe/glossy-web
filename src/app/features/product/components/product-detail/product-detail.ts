import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { map, Observable, startWith, Subscription, tap } from 'rxjs';
import { CategoryService } from '../../../category/services/category.service';
import { Category } from '../../../category/models/category.model';
import { ProductVariant } from '../../models/product-variant.model';
import { ProductImage } from '../../models/product-image.model';
import { CartService } from '../../../cart/services/cart.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit, OnDestroy {

  private subscription?: Subscription;
  currentProduct?: Product;

  showToast = false;
toastMessage = '';
  apiImageServer= environment.apiImageServer;

  activeImageIndex = 0;
  quantity = 1;
  selectedVariant: ProductVariant | null = null;

  product$!: Observable<Product>;
  categories$!: Observable<Category[]>
  isLoading$!: Observable<boolean>;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService // ← Inyectar
  ) { }

  ngOnInit(): void {
    this.resetState();
    this.categories$ = this.categoryService.getCategories();

    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(Number(productId));
    } else {
      this.errorMessage = 'ID de producto no válido';
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  resetState(): void {
    this.errorMessage = '';
    this.activeImageIndex = 0;
    this.quantity = 1;
    this.selectedVariant = null;
  }

  loadProduct(id: number): void {
    this.errorMessage = '';

    const product$ = this.productService.getProductById(id).pipe(
      tap(product => {
        this.initializeProduct(product);
        this.currentProduct = product; // ← Guardar referencia
      }),
    );

    this.product$ = product$;

    this.isLoading$ = product$.pipe(
      map(() => false),
      startWith(true)
    );
  }

  initializeProduct(product: Product): void {
    if (product?.variants && product.variants.length > 0) {
      const availableVariant = product.variants.find(v => v.stock > 0);
      this.selectedVariant = availableVariant || product.variants[0];
    }
  }

  selectVariant(variant: ProductVariant): void {
    if (variant.stock > 0) {
      this.selectedVariant = variant;
      if (this.quantity > variant.stock) {
        this.quantity = variant.stock;
      }
    }
  }

  getProductImages(product: Product): ProductImage[] {
    if (!product) return [];
    if (product?.images && product?.images.length > 0) {
      return product?.images;
    }

    const tempProductImage: ProductImage = {
      id: 0,
      mainImage: true,
      productId: 0,
      url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image'
    };

    return [tempProductImage];
  }

  isVariantSelected(variant: ProductVariant): boolean {
    return this.selectedVariant?.id === variant.id;
  }

  canAddToCart(): boolean {
    return !!(this.selectedVariant && this.selectedVariant.stock > 0);
  }

  getTotalStock(product: Product): number {
    if (!product || !product?.variants) return 0;
    return product?.variants.reduce((sum, v) => sum + v.stock, 0);
  }

  getCategoryName(categoryId: number, categories: Category[]): string {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }

addToCart(): void {
  if (!this.canAddToCart() || !this.currentProduct || !this.selectedVariant) {
    console.log('No se puede agregar - sin stock o sin variante seleccionada');
    return;
  }

  this.cartService.addItem(this.currentProduct, this.selectedVariant, this.quantity);

  this.toastMessage = `${this.currentProduct.name} - ${this.selectedVariant.toneName} (x${this.quantity}) agregado al carrito`;
  this.showToast = true;

  setTimeout(() => {
    this.showToast = false;
  }, 2500);

  this.quantity = 1;
}


  goBack(): void {
    this.router.navigate(['/home']);
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  increaseQuantity(): void {
    if (this.selectedVariant && this.quantity < this.selectedVariant.stock) {
      this.quantity++;
    } else if (!this.selectedVariant && this.quantity < 99) {
      this.quantity++;
    }
  }

  retryLoad(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.errorMessage = '';
      this.loadProduct(Number(productId));
    }
  }
}