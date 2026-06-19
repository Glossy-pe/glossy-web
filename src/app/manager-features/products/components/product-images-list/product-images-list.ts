import { Component, computed, ElementRef, HostListener, Input, OnInit, signal, ViewChild } from '@angular/core';
import { ProductImageResponse } from '../../models/product-image-response.model';
import { ProductImageService } from '../../services/product-image.service';
import { environment } from '../../../../../environments/environment.prod';

@Component({
  selector: 'app-product-images-list',
  imports: [],
  templateUrl: './product-images-list.html',
  styleUrl: './product-images-list.scss',
})
export class ProductImagesList implements OnInit {

  @Input({ required: true }) productId!: number;
  @ViewChild('lightboxVideo') lightboxVideoRef?: ElementRef<HTMLVideoElement>;

  images = signal<ProductImageResponse[]>([]);
  confirmDeleteImage = signal<ProductImageResponse | null>(null);
  previewFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  successMessage = signal<string | null>(null);
  isDragOver = signal(false);
  lightboxIndex = signal<number | null>(null);

  isVideoFile = computed(() => this.previewFile()?.type.startsWith('video/') ?? false);
  lightboxCurrent = computed(() => {
    const idx = this.lightboxIndex();
    return idx !== null ? this.images()[idx] : null;
  });

  private successTimer: any;

  constructor(private imageService: ProductImageService) {}

  ngOnInit(): void {
    this.load();
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        const file = item.getAsFile();
        if (file) this.setPreview(file);
        break;
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.lightboxIndex() === null) return;
    if (event.key === 'ArrowLeft') this.lightboxPrev();
    if (event.key === 'ArrowRight') this.lightboxNext();
    if (event.key === 'Escape') this.closeLightbox();
  }

  load(): void {
    this.imageService.getByProductId(this.productId).subscribe(res => {
      this.images.set(this.sortImages(res));
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.setPreview(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setPreview(file);
  }

  private setPreview(file: File): void {
    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.previewFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  cancelPreview(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
    this.previewFile.set(null);
    this.previewUrl.set(null);
  }

  confirmUpload(): void {
    const file = this.previewFile();
    if (!file) return;

    this.uploading.set(true);

    const nextPosition = this.images().length + 1;
    const isFirst = this.images().length === 0;

    this.imageService.uploadAndCreate(file, this.productId, nextPosition, isFirst).subscribe({
      next: newImage => {
        this.images.update(imgs => this.sortImages([...imgs, newImage]));
        this.uploading.set(false);
        this.cancelPreview();
        this.showSuccess('Archivo subido exitosamente');
      },
      error: () => this.uploading.set(false),
    });
  }

  // Lightbox
  openLightbox(img: ProductImageResponse): void {
    const idx = this.images().findIndex(i => i.id === img.id);
    if (idx !== -1) this.lightboxIndex.set(idx);
  }

  closeLightbox(): void {
    this.pauseVideo();
    this.lightboxIndex.set(null);
  }

  lightboxPrev(): void {
    const idx = this.lightboxIndex();
    if (idx === null || idx === 0) return;
    this.pauseVideo();
    this.lightboxIndex.set(idx - 1);
  }

  lightboxNext(): void {
    const idx = this.lightboxIndex();
    if (idx === null || idx === this.images().length - 1) return;
    this.pauseVideo();
    this.lightboxIndex.set(idx + 1);
  }

  onLightboxKey(event: KeyboardEvent): void {
    event.stopPropagation();
  }

  private pauseVideo(): void {
    this.lightboxVideoRef?.nativeElement?.pause();
  }

  // Acciones
  setMain(image: ProductImageResponse): void {
    if (image.mainImage) return;
    this.imageService.update(image.id, { ...image, mainImage: true }).subscribe(updated => {
      this.images.update(imgs =>
        this.sortImages(imgs.map(i => ({ ...i, mainImage: i.id === updated.id })))
      );
      this.showSuccess('Imagen principal actualizada');
    });
  }

  askDelete(image: ProductImageResponse): void {
    this.confirmDeleteImage.set(image);
  }

  cancelDelete(): void {
    this.confirmDeleteImage.set(null);
  }

  confirmDelete(): void {
    const image = this.confirmDeleteImage();
    if (!image) return;

    const remaining = this.images().filter(i => i.id !== image.id);
    this.images.set(this.sortImages(remaining));
    this.confirmDeleteImage.set(null);

    if (this.lightboxIndex() !== null) this.closeLightbox();

    this.imageService.delete(image.id).subscribe({
      next: () => {
        const needsNewMain = image.mainImage && remaining.length > 0;
        if (needsNewMain) {
          const newMain = remaining[0];
          this.imageService.update(newMain.id, { ...newMain, mainImage: true }).subscribe(updated => {
            this.images.set(
              this.sortImages(remaining.map(i => ({ ...i, mainImage: i.id === updated.id })))
            );
          });
        }
        this.showSuccess('Archivo eliminado');
      },
      error: () => this.images.update(imgs => this.sortImages([...imgs, image])),
    });
  }

  private showSuccess(msg: string): void {
    clearTimeout(this.successTimer);
    this.successMessage.set(msg);
    this.successTimer = setTimeout(() => this.successMessage.set(null), 3000);
  }

  private sortImages(imgs: ProductImageResponse[]): ProductImageResponse[] {
    return [...imgs].sort((a, b) => {
      if (a.mainImage && !b.mainImage) return -1;
      if (!a.mainImage && b.mainImage) return 1;
      return a.position - b.position;
    });
  }
}