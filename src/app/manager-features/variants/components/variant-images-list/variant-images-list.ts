import { Component, computed, ElementRef, HostListener, Input, signal, ViewChild } from '@angular/core';
import { VariantImageResponse } from '../../models/variant-image-response.model';
import { VariantImageService } from '../../services/variant-image.service';

@Component({
  selector: 'app-variant-images-list',
  imports: [],
  templateUrl: './variant-images-list.html',
  styleUrl: './variant-images-list.scss',
})
export class VariantImagesList {
  @Input({ required: true }) variantId!: number;
  @ViewChild('lightboxVideo') lightboxVideoRef?: ElementRef<HTMLVideoElement>;

  images = signal<VariantImageResponse[]>([]);
  confirmDeleteImage = signal<VariantImageResponse | null>(null);
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

  constructor(private variantImageService: VariantImageService) {}

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
    this.variantImageService.getByVariantId(this.variantId).subscribe(res => {
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

async processImage(
  file: File,
  opts: { maxSize?: number; quality?: number; watermarkText?: string } = {}
): Promise<File> {
  const { maxSize = 1800, quality = 0.92, watermarkText = '@glossy.pe' } = opts;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(bitmap, 0, 0, width, height);

  this.drawWatermarkPattern(ctx, width, height, watermarkText);

  const blob: Blob = await new Promise(resolve =>
    canvas.toBlob(b => resolve(b!), 'image/webp', quality)
  );

  const newName = file.name.replace(/\.\w+$/, '.webp');
  return new File([blob], newName, { type: 'image/webp' });
}

    private drawWatermarkPattern(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    text: string
  ): void {
    const fontSize = Math.max(14, Math.round(width * 0.045));
    ctx.font = `500 ${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(text).width;
    const stepX = textWidth + fontSize * 2.5;
    const stepY = fontSize * 4;
    const angle = -25 * (Math.PI / 180);

    ctx.save();
    ctx.rotate(angle);

    // Cubrimos todo el canvas rotado con margen extra para que no queden huecos
    const diagonal = Math.sqrt(width * width + height * height);
    const startX = -diagonal;
    const endX = diagonal;
    const startY = -diagonal;
    const endY = diagonal;

    for (let y = startY; y < endY; y += stepY) {
      for (let x = startX; x < endX; x += stepX) {
        ctx.fillText(text, x, y);
      }
    }

    ctx.restore();
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

  async confirmUpload(): Promise<void> {
    const file = this.previewFile();
    if (!file) return;

    this.uploading.set(true);

    const processed = this.isVideoFile() ? file : await this.processImage(file);

    const nextPosition = this.images().length + 1;
    const isFirst = this.images().length === 0;

    this.variantImageService.uploadAndCreate(processed, this.variantId, nextPosition, isFirst).subscribe({
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
  openLightbox(img: VariantImageResponse): void {
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
  setMain(image: VariantImageResponse): void {
    if (image.mainImage) return;
    this.variantImageService.update(image.id, { ...image, mainImage: true }).subscribe(updated => {
      this.images.update(imgs =>
        this.sortImages(imgs.map(i => ({ ...i, mainImage: i.id === updated.id })))
      );
      this.showSuccess('Imagen principal actualizada');
    });
  }

  askDelete(image: VariantImageResponse): void {
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

    this.variantImageService.delete(image.id).subscribe({
      next: () => {
        const needsNewMain = image.mainImage && remaining.length > 0;
        if (needsNewMain) {
          const newMain = remaining[0];
          this.variantImageService.update(newMain.id, { ...newMain, mainImage: true }).subscribe(updated => {
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

  private sortImages(imgs: VariantImageResponse[]): VariantImageResponse[] {
    return [...imgs].sort((a, b) => {
      if (a.mainImage && !b.mainImage) return -1;
      if (!a.mainImage && b.mainImage) return 1;
      return a.position - b.position;
    });
  }
}