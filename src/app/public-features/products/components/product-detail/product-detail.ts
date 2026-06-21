import { Component, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../../categories/services/category.service';
import { CategoryResponse } from '../../../categories/models/category-response.model';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { VariantResponseFull } from '../../../variants/models/variant-response.full.mode';

interface GalleryImage {
  url: string;
  grayscale: boolean;
  type: 'image' | 'video';
}

const PLACEHOLDER_IMAGE: GalleryImage = {
  url: 'https://placehold.co/400x500/F3F4F6/9CA3AF?text=No+Image',
  grayscale: false,
  type: 'image',
};

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  product   = signal<ProductResponseFull | null>(null);
  isLoading = signal(true);
  hasError  = signal(false);

  categories = signal<CategoryResponse[]>([]);

  selectedVariant    = signal<VariantResponseFull | null>(null);
  selectedImageIndex = signal(0);
  quantity           = signal(1);

  showToast = signal(false);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // ── Lightbox ─────────────────────────────────────────────────────
  isLightboxOpen = signal(false);

  private productId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
  ) {}

  ngOnInit(): void {
    this.categoryService.getAll().subscribe({
      next: cats => this.categories.set(cats),
      error: err => console.error('Error cargando categorías', err),
    });

    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.productId) {
      this.loadProduct();
    }
  }

  ngOnDestroy(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  loadProduct(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService.getById(this.productId).subscribe({
      next: res => {
        this.product.set(res);
        this.initializeProduct(res);
        this.isLoading.set(false);
      },
      error: err => {
        console.error(err);
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private initializeProduct(product: ProductResponseFull): void {
    const sorted = this.sortByPosition(product.variants ?? []);

    const tonoFromUrl = this.route.snapshot.queryParamMap.get('tono');
    let variant: VariantResponseFull | undefined;

    if (tonoFromUrl) {
      variant = sorted.find(v =>
        v.toneName?.toLowerCase() === decodeURIComponent(tonoFromUrl).toLowerCase()
      );
    }
    variant ??= sorted.find(v => v.stock > 0) ?? sorted[0];

    this.selectedVariant.set(variant ?? null);
    this.quantity.set(1);

    // Arranca en la primera imagen propia de la variante, saltando las generales del producto
    this.selectedImageIndex.set(product.images?.length ?? 0);
  }

  // ── Selección de tono ─────────────────────────────────────────────
  selectVariant(variant: VariantResponseFull): void {
    if (this.selectedVariant()?.id === variant.id) return;
    this.selectedVariant.set(variant);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tono: encodeURIComponent(variant.toneName) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.selectedImageIndex.set(this.product()?.images?.length ?? 0);

    if (variant.stock > 0 && this.quantity() > variant.stock) {
      this.quantity.set(variant.stock);
    }
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  isVariantSelected(variant: VariantResponseFull): boolean {
    return this.selectedVariant()?.id === variant.id;
  }

  sortedVariants = computed<VariantResponseFull[]>(() =>
    this.sortByPosition(this.product()?.variants ?? [])
  );

  private sortByPosition<T extends { position: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.position - b.position);
  }

  // ── Galería combinada: imágenes del producto + de la variante ─────
  galleryImages = computed<GalleryImage[]>(() => {
    const product = this.product();
    const variant = this.selectedVariant();
    const isOutOfStock = (variant?.stock ?? 0) === 0;

    const productImages: GalleryImage[] = this.sortByPosition(product?.images ?? [])
      .map(img => ({
        url: img.url,
        grayscale: false,
        type: this.resolveType(img.resourceType),
      }));

    const variantImages: GalleryImage[] = this.sortByPosition(variant?.images ?? [])
      .map(img => ({
        url: img.url,
        grayscale: isOutOfStock,
        type: this.resolveType(img.resourceType),
      }));

    const combined = [...productImages, ...variantImages];
    return combined.length ? combined : [PLACEHOLDER_IMAGE];
  });

  private resolveType(resourceType?: string): 'image' | 'video' {
    return resourceType?.toLowerCase() === 'video' ? 'video' : 'image';
  }

  activeImage = computed<GalleryImage>(() => {
    const images = this.galleryImages();
    return images[this.selectedImageIndex()] ?? images[0];
  });

  // ── Lightbox ─────────────────────────────────────────────────────
  openLightbox(): void {
    this.isLightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  nextImage(): void {
    const total = this.galleryImages().length;
    this.selectedImageIndex.update(i => (i + 1) % total);
  }

  prevImage(): void {
    const total = this.galleryImages().length;
    this.selectedImageIndex.update(i => (i - 1 + total) % total);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.isLightboxOpen()) return;

    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === 'ArrowRight') this.nextImage();
    if (event.key === 'ArrowLeft') this.prevImage();
  }

  // ── Categoría ─────────────────────────────────────────────────────
  categoryName = computed<string>(() => {
    const p = this.product();
    if (!p) return '';
    return this.categories().find(c => c.id === p.categoryId)?.name ?? 'Sin categoría';
  });

  // ── Cantidad / stock ─────────────────────────────────────────────
  currentStock = computed<number>(() => this.selectedVariant()?.stock ?? 0);

  canAddToCart(): boolean {
    return !!(this.selectedVariant() && this.currentStock() > 0);
  }

  decreaseQuantity(): void {
    if (this.quantity() > 1) this.quantity.update(q => q - 1);
  }

  increaseQuantity(): void {
    const max = this.currentStock() || 99;
    if (this.quantity() < max) this.quantity.update(q => q + 1);
  }

  // ── Carrito ──────────────────────────────────────────────────────
  addToCart(): void {
    if (!this.canAddToCart()) return;

    // TODO: conectar con CartService cuando exista
    console.log('Agregar al carrito', {
      productId: this.product()?.id,
      variantId: this.selectedVariant()?.id,
      quantity: this.quantity(),
    });

    this.showToast.set(true);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.showToast.set(false);
      this.toastTimeout = null;
    }, 2500);

    this.quantity.set(1);
  }

  dismissToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    this.showToast.set(false);
  }

  goBack(): void {
    this.router.navigate(['/guest/products']);
  }
}