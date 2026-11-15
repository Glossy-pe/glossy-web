import { ChangeDetectionStrategy, Component, HostListener, Input, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { PaymentProof, PaymentProofService } from '../../services/payment-proof.service';

const MAX_WIDTH = 600;
const QUALITY = 0.6;

@Component({
  selector: 'app-order-payment-proofs',
  imports: [DatePipe],
  templateUrl: './order-payment-proofs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPaymentProofs implements OnInit {
  private readonly service = inject(PaymentProofService);

  @Input({ required: true }) orderId!: number;

  readonly open = signal(false);
  readonly proofs = signal<PaymentProof[]>([]);
  readonly uploading = signal(false);
  readonly dragging = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<PaymentProof | null>(null);

  ngOnInit(): void {
    this.service.getAll(this.orderId).subscribe({
      next: (p) => this.proofs.set(p),
      error: () => this.error.set('No se pudieron cargar los comprobantes.'),
    });
  }

  // Ctrl+V: solo actúa si la sección está abierta y el portapapeles trae imágenes
  @HostListener('document:paste', ['$event'])
  onPaste(e: ClipboardEvent): void {
    if (!this.open()) return;
    const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    this.upload(files);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    this.upload(Array.from(e.dataTransfer?.files ?? []));
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }

  onPick(input: HTMLInputElement): void {
    this.upload(Array.from(input.files ?? []));
    input.value = '';
  }

  private async upload(files: File[]): Promise<void> {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;

    this.uploading.set(true);
    this.error.set(null);

    try {
      const blobs = await Promise.all(images.map((f) => this.compress(f)));
      const form = new FormData();
      blobs.forEach((b, i) => form.append('files', b, `proof-${Date.now()}-${i}.webp`));

      this.service
        .upload(this.orderId, form)
        .pipe(finalize(() => this.uploading.set(false)))
        .subscribe({
          next: (created) => this.proofs.update((list) => [...created, ...list]),
          error: () => this.error.set('No se pudieron subir las capturas.'),
        });
    } catch {
      this.uploading.set(false);
      this.error.set('No se pudo procesar la imagen.');
    }
  }

  /** Reduce a ~1000 px y convierte a WebP para que cada captura pese unos KB. */
  private async compress(file: File): Promise<Blob> {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bmp.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress'))), 'image/webp', QUALITY),
    );
  }

  remove(proof: PaymentProof): void {
    if (!confirm('¿Eliminar este comprobante?')) return;
    this.service.delete(this.orderId, proof.id).subscribe({
      next: () => {
        this.proofs.update((list) => list.filter((p) => p.id !== proof.id));
        if (this.preview()?.id === proof.id) this.preview.set(null);
      },
      error: () => this.error.set('No se pudo eliminar el comprobante.'),
    });
  }
}