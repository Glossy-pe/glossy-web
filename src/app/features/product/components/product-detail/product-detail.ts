import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { map, Observable, startWith, Subscription, tap } from 'rxjs';
import { CategoryService } from '../../../category/services/category.service';
import { Category } from '../../../category/models/category.model';
import { CartService } from '../../../cart/services/cart.service';
import { environment } from '../../../../../environments/environment';
import { SortByPipe } from "../../../../shared/pipes/sort-by.pipe";
import { ProductResponseFull } from '../../models/product-response-full.model';
import { VariantResponseFull } from '../../models/variant-response-full.model';
import { VariantImageResponse } from '../../models/variant-image-response.model';
import { Location } from '@angular/common';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, SortByPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit, OnDestroy {

  private subscription?: Subscription;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  currentProduct?: ProductResponseFull;
  showToast = false;
  toastMessage = '';
  apiImageServer = environment.apiImageServer;

  activeImageIndex = 0;
  quantity = 1;
  selectedVariant: VariantResponseFull | null = null;

  product$!: Observable<ProductResponseFull>;
  categories$!: Observable<Category[]>;
  isLoading$!: Observable<boolean>;
  errorMessage = '';

  private readonly PLACEHOLDER_IMAGE: VariantImageResponse = {
    id: 0,
    variantId: 0,
    url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image',
    position: 0,
    mainImage: true,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private location: Location
  ) { }

 ngOnInit(): void {
  this.resetState();
  this.categories$ = this.categoryService.getCategories();

  this.route.paramMap.subscribe(params => {
    const slug = params.get('slug');
    if (slug) {
      this.resetState();
      this.loadProduct(slug);
    }
  });
}

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  resetState(): void {
    this.errorMessage = '';
    this.activeImageIndex = 0;
    this.quantity = 1;
    this.selectedVariant = null;
  }

  loadProduct(slug: string): void { // 👈 cambia number por string
  this.errorMessage = '';

  const product$ = this.productService.getProductBySlug(slug).pipe( // 👈
    tap(product => {
      this.currentProduct = product;
      this.initializeProduct(product);
    }),
  );

  this.product$ = product$;
  this.isLoading$ = product$.pipe(
    map(() => false),
    startWith(true)
  );
}

  initializeProduct(product: ProductResponseFull): void {
  if (!product?.variants?.length) return;

  const sorted = [...product.variants].sort((a, b) => {
    const posA = a.position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.position ?? Number.MAX_SAFE_INTEGER;
    return posA - posB;
  });

  const tonoName = this.route.snapshot.queryParamMap.get('tono');
  if (tonoName) {
    const fromUrl = sorted.find(v =>
      v.toneName?.toLowerCase() === decodeURIComponent(tonoName).toLowerCase()
    );
    this.selectedVariant = fromUrl ?? sorted.find(v => v.stock > 0) ?? sorted[0];
  } else {
    this.selectedVariant = sorted.find(v => v.stock > 0) ?? sorted[0];
  }

  // 👇 empieza en la primera imagen de la variante, no del producto
  const productImagesCount = product.images?.length ?? 0;
  this.activeImageIndex = productImagesCount;
}

  selectVariant(variant: VariantResponseFull): void {
  this.selectedVariant = variant;

  // 👇 pone el nombre del tono en la URL
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { tono: encodeURIComponent(variant.toneName) },
    queryParamsHandling: 'merge',
    replaceUrl: true
  });

  const productImagesCount = this.currentProduct?.images?.length ?? 0;
  this.activeImageIndex = productImagesCount;

  if (variant.stock > 0 && this.quantity > variant.stock) {
    this.quantity = variant.stock;
  }
}

  getActiveImages(): (VariantImageResponse & { grayscale?: boolean })[] {
  const result: (VariantImageResponse & { grayscale?: boolean })[] = [];

  // 1. Imágenes generales del producto (nunca grayscale)
  const productImages = this.currentProduct?.images ?? [];
  productImages.forEach(img => {
    result.push({
      id: img.id,
      variantId: 0,
      url: img.url,
      position: 0,
      mainImage: false,
      grayscale: false
    });
  });

  // 2. Imágenes de la variante seleccionada
  const variantImages = this.selectedVariant?.images ?? [];
  const isOutOfStock = (this.selectedVariant?.stock ?? 0) === 0;

  [...variantImages]
    .sort((a, b) => a.position - b.position)
    .forEach(img => result.push({ ...img, grayscale: isOutOfStock }));

  return result.length ? result : [this.PLACEHOLDER_IMAGE];
}

  isVariantSelected(variant: VariantResponseFull): boolean {
    return this.selectedVariant?.id === variant.id;
  }

  canAddToCart(): boolean {
    return !!(this.selectedVariant && this.selectedVariant.stock > 0);
  }

  getCategoryName(categoryId: number, categories: Category[]): string {
    return categories.find(c => c.id === categoryId)?.name ?? 'Sin categoría';
  }

  addToCart(): void {
    if (!this.canAddToCart() || !this.currentProduct || !this.selectedVariant) return;

    this.cartService.addItem(
      this.currentProduct.id,
      this.selectedVariant.id,
      this.quantity
    );

    this.showToast = true;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
      this.toastTimeout = null;
    }, 2500);

    this.quantity = 1;
  }

  dismissToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    this.showToast = false;
  }

  goBack(): void {
  this.location.back();
}
  decreaseQuantity(): void {
    if (this.quantity > 1) this.quantity--;
  }

  increaseQuantity(): void {
    const maxStock = this.selectedVariant?.stock ?? 99;
    if (this.quantity < maxStock) this.quantity++;
  }

  retryLoad(): void {
  const slug = this.route.snapshot.paramMap.get('slug'); // 👈
  if (slug) {
    this.errorMessage = '';
    this.loadProduct(slug); // 👈 ya no necesita Number()
  }
}
}