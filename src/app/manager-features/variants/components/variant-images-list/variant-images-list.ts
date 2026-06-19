import { Component, ElementRef, HostListener, Input, signal, ViewChild } from '@angular/core';
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
  @ViewChild('dropZone') dropZoneRef!: ElementRef<HTMLDivElement>;

  images = signal<VariantImageResponse[]>([]);
  confirmDeleteImage = signal<VariantImageResponse | null>(null);
  previewFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  successMessage = signal<string | null>(null);
  isDragOver = signal(false);

  private successTimer: any;

  constructor(private imageService: VariantImageService) {}

  ngOnInit(): void {
    this.load();
  }

  // Escucha paste global en el documento
  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) this.setPreview(file);
        break;
      }
    }
  }

  load(): void {
    this.imageService.getByVariantId(this.variantId).subscribe(res => {
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
    if (file && file.type.startsWith('image/')) this.setPreview(file);
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

    this.imageService.uploadAndCreate(file, this.variantId, nextPosition, isFirst).subscribe({
      next: newImage => {
        this.images.update(imgs => this.sortImages([...imgs, newImage]));
        this.uploading.set(false);
        this.cancelPreview();
        this.showSuccess('Imagen subida exitosamente');
      },
      error: () => this.uploading.set(false),
    });
  }

  setMain(image: VariantImageResponse): void {
    if (image.mainImage) return;
    this.imageService.update(image.id, { ...image, mainImage: true }).subscribe(updated => {
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
        this.showSuccess('Imagen eliminada');
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
