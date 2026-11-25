import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, catchError, combineLatest, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { VariantResponseFull } from '../../../variants/models/variant-response.full.mode';
import { CfImagePipe } from '../../../../../shared/pipes/cf-image.pipe';
import { IMAGE_SIZES } from '../../../../../shared/utils/image-url';

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
  imports: [CurrencyPipe, CfImagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private productService = inject(ProductService);

  readonly mediumWidth = IMAGE_SIZES.medium;
  readonly miniWidth = IMAGE_SIZES.mini;
  readonly largeWidth = IMAGE_SIZES.large; // nuevo: 1600

  product = signal<ProductResponseFull | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  mediaError = signal(false);

  selectedVariant = signal<VariantResponseFull | null>(null);
  selectedImageIndex = signal(0);
  quantity = signal(1);
  isLightboxOpen = signal(false);
  showToast = signal(false);
  imageLoading = signal(false);

  private lastShownUrl: string | null = null;
  private static readonly LOADING_SPINNER_DELAY_MS = 150;
  private loadingSpinnerTimeout: ReturnType<typeof setTimeout> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private retry$ = new BehaviorSubject<void>(undefined);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.clearLoadingSpinnerTimeout();
    });

    // Un solo pipeline: reacciona al id de la URL y al botón "Reintentar".
    // switchMap cancela la petición anterior si el id cambia.
    combineLatest([
      this.route.paramMap.pipe(map(p => Number(p.get('id'))), distinctUntilChanged()),
      this.retry$,
    ]).pipe(
      filter(([id]) => id > 0),
      tap(() => { this.isLoading.set(true); this.hasError.set(false); }),
      switchMap(([id]) =>
        this.productService.getByIdCached(id).pipe(
          catchError(err => {
            console.error(err);
            this.hasError.set(true);
            this.isLoading.set(false);
            return EMPTY;
          }),
        ),
      ),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.product.set(res);
      this.initializeProduct(res);
      this.isLoading.set(false);
    });
  }

  loadProduct(): void {
    this.retry$.next();
  }

  private initializeProduct(product: ProductResponseFull): void {
    const sorted = this.sortByPosition(product.variants ?? []);
    const tonoFromUrl = this.route.snapshot.queryParamMap.get('tono');

    let variant: VariantResponseFull | undefined;
    if (tonoFromUrl) {
      variant = sorted.find(v => v.toneName?.toLowerCase() === tonoFromUrl.toLowerCase());
    }
    variant ??= sorted.find(v => v.stock > 0) ?? sorted[0];

    this.selectedVariant.set(variant ?? null);
    this.quantity.set(1);
    this.setActiveImageIndex(product.images?.length ?? 0);
  }

  // ── Variantes ────────────────────────────────────────────────────
  selectVariant(variant: VariantResponseFull): void {
    if (this.selectedVariant()?.id === variant.id) return;
    this.selectedVariant.set(variant);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tono: variant.toneName },   // sin encodeURIComponent
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.setActiveImageIndex(this.product()?.images?.length ?? 0);

    if (variant.stock > 0 && this.quantity() > variant.stock) {
      this.quantity.set(variant.stock);
    }
  }

  isVariantSelected(variant: VariantResponseFull): boolean {
    return this.selectedVariant()?.id === variant.id;
  }

  sortedVariants = computed<VariantResponseFull[]>(() => {
    const active = this.sortByPosition(this.product()?.variants ?? []).filter(v => v.active);
    return [...active.filter(v => v.stock > 0), ...active.filter(v => v.stock <= 0)];
  });

  availableCount = computed(() => this.sortedVariants().filter(v => v.stock > 0).length);
  allSoldOut = computed(() => this.sortedVariants().length > 0 && this.availableCount() === 0);

  isSoldOut(variant: VariantResponseFull): boolean {
    return variant.stock <= 0;
  }

  selectFirstAvailable(): void {
    const first = this.sortedVariants().find(v => v.stock > 0);
    if (first) this.selectVariant(first);
  }

  private sortByPosition<T extends { position: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.position - b.position);
  }

  // ── Galería ──────────────────────────────────────────────────────
  galleryImages = computed<GalleryImage[]>(() => {
    const product = this.product();
    const variant = this.selectedVariant();
    const isOutOfStock = (variant?.stock ?? 0) === 0;

    const productImages: GalleryImage[] = this.sortByPosition(product?.images ?? [])
      .filter(img => !!img.url)
      .map(img => ({
        url: img.url,
        // si la variante está agotada y no tiene fotos propias, las del producto se ven en gris
        grayscale: false,
        type: this.resolveType(img.resourceType),
      }));

    const variantImages: GalleryImage[] = this.sortByPosition(variant?.images ?? [])
      .filter(img => !!img.url)
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
    if (this.mediaError()) return PLACEHOLDER_IMAGE;
    const images = this.galleryImages();
    return images[this.selectedImageIndex()] ?? images[0];
  });

  selectImage(index: number): void {
    this.setActiveImageIndex(index);
  }

  private setActiveImageIndex(index: number): void {
    this.clearLoadingSpinnerTimeout();
    this.mediaError.set(false);

    const images = this.galleryImages();
    const safeIndex = index < images.length ? index : 0;
    this.selectedImageIndex.set(safeIndex);

    const targetUrl = images[safeIndex]?.url ?? null;

    if (targetUrl === this.lastShownUrl) {
      this.imageLoading.set(false);
      return;
    }

    this.lastShownUrl = targetUrl;
    this.loadingSpinnerTimeout = setTimeout(() => {
      this.imageLoading.set(true);
      this.loadingSpinnerTimeout = null;
    }, ProductDetail.LOADING_SPINNER_DELAY_MS);
  }

  onMediaLoaded(): void {
    this.clearLoadingSpinnerTimeout();
    this.imageLoading.set(false);
  }

  onMediaError(): void {
    this.clearLoadingSpinnerTimeout();
    this.imageLoading.set(false);
    this.mediaError.set(true);
  }

  private clearLoadingSpinnerTimeout(): void {
    if (this.loadingSpinnerTimeout) {
      clearTimeout(this.loadingSpinnerTimeout);
      this.loadingSpinnerTimeout = null;
    }
  }

  // ── Lightbox ─────────────────────────────────────────────────────
  openLightbox(): void { this.isLightboxOpen.set(true); }
  closeLightbox(): void { this.isLightboxOpen.set(false); }

  nextImage(): void {
    const total = this.galleryImages().length;
    this.setActiveImageIndex((this.selectedImageIndex() + 1) % total);
  }

  prevImage(): void {
    const total = this.galleryImages().length;
    this.setActiveImageIndex((this.selectedImageIndex() - 1 + total) % total);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.isLightboxOpen()) return;
    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === 'ArrowRight') this.nextImage();
    if (event.key === 'ArrowLeft') this.prevImage();
  }

  // ── Cantidad / carrito ───────────────────────────────────────────
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

  addToCart(): void {
    if (!this.canAddToCart()) return;
    // TODO: conectar con CartService
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
    this.location.back();
  }
}