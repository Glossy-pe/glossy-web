import { CommonModule } from '@angular/common';
import {
  Component,
  signal,
  computed,
  inject,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductResponseFull } from '../../../products/models/product-response-full.model';
import { ProductService } from '../../../products/services/product.service';
import { VariantResponseFull } from '../../../variants/models/variant-response.full.mode';
import { HostListener } from '@angular/core';

// Ajusta estas rutas a la ubicación real de este componente en tu proyecto


export interface BoxItem {
  id: number; // día del calendario (1..24)
  dayLabel: string;
  isWord: boolean;
  orientation?: 'vertical' | 'horizontal';
  iconType: 'ribbon' | 'cherry' | 'snowflake' | 'bell' | 'bear' | 'star' | 'crown';
  colorBg: string;
  panel: 'left' | 'right';
  col: number; // columna inicial (base 1)
  row: number; // fila inicial (base 1)
  w: number; // columnas que ocupa
  h: number; // filas que ocupa
  isIncognito: boolean;
  mysteryHint?: string;
  product?: ProductResponseFull | null; // solo panel izquierdo
}

type ImageLike = {
  url: string;
  position: number;
  mainImage: boolean;
  resourceType: string;
};

function sortedImages(images?: ImageLike[]): ImageLike[] {
  return [...(images ?? [])]
    .filter((i) => i.resourceType !== 'video')
    .sort((a, b) => a.position - b.position);
}

function pickMainImage(images?: ImageLike[]): string | null {
  const list = sortedImages(images);
  return (list.find((i) => i.mainImage) ?? list[0])?.url ?? null;
}



@Component({
  selector: 'app-advent-calendar',
  imports: [CommonModule],
  templateUrl: './advent-calendar.html',
  styleUrl: './advent-calendar.scss',
})
export class AdventCalendar implements OnInit, AfterViewInit, OnDestroy {
  private readonly productService = inject(ProductService);

  @ViewChild('snowCanvas') snowCanvas!: ElementRef<HTMLCanvasElement>;

  /**
   * IDs de producto del panel izquierdo: exactamente 12, uno por día.
   * La posición en el array es el día: el primero es el día 1, el segundo el día 2, etc.
   * Por ahora todos son 309 a modo de prueba; reemplaza cada número por el ID real.
   * Si repites un ID, se pide una sola vez al backend y se reutiliza.
   */
  private readonly leftProductIds: number[] = [
    9, // día 1
    4, // día 2
    17, // día 3
    55, // día 4
    13, // día 5
    312, // día 6
    98, // día 7
    311, // día 8
    7, // día 9
    292, // día 10
    261, // día 11
    58, // día 12
  ];

  // ── Estado ─────────────────────────────────────────────
  loading = signal<boolean>(true);
  loadError = signal<boolean>(false);
  productsBySlot = signal<Record<number, ProductResponseFull>>({});

  openedIds = signal<Set<number>>(new Set<number>());
  /** Variante confirmada por día */
  selectedVariants = signal<Record<number, VariantResponseFull>>({});
  /** Variante en selección dentro del modal (aún sin guardar) */
  tempVariant = signal<Record<number, VariantResponseFull>>({});
  /** Imagen grande que se muestra en el modal */
  previewImage = signal<string | null>(null);

  activeModal = signal<BoxItem | null>(null);
  showOrderDrawer = signal<boolean>(false);

  private audioCtx: AudioContext | null = null;
  private animFrameId: number | null = null;

  /** Imagen mostrada a pantalla completa (lightbox) */
  fullImage = signal<string | null>(null);

  openedCount = computed(() => this.openedIds().size);
  selectedCount = computed(() => Object.keys(this.selectedVariants()).length);

  // ── Layout del panel izquierdo (solo estructura; el contenido viene del backend) ──
  // Grilla de 6 columnas × 8 filas = 48 celdas. Las 12 cajas suman exactamente 48 y no
  // se solapan, así que encajan sin huecos. col/row = inicio (base 1), w/h = tamaño.
  // Si cambias un tamaño, mantén la suma en 48 (y sin solapes) para no dejar espacios.
  // La numeración sigue el orden de lectura (izquierda → derecha, arriba → abajo).
  private readonly leftLayout: Omit<BoxItem, 'product'>[] = [
    { id: 1, dayLabel: '1', isWord: false, iconType: 'bell', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 1, row: 1, w: 3, h: 2, isIncognito: false },
    { id: 2, dayLabel: '2', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 4, row: 1, w: 2, h: 1, isIncognito: false },
    { id: 3, dayLabel: 'tres', isWord: true, orientation: 'vertical', iconType: 'snowflake', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 6, row: 1, w: 1, h: 2, isIncognito: false },
    { id: 4, dayLabel: '4', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 4, row: 2, w: 2, h: 1, isIncognito: false },
    { id: 5, dayLabel: '5', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 1, row: 3, w: 2, h: 3, isIncognito: false },
    { id: 6, dayLabel: 'seis', isWord: true, iconType: 'cherry', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 3, row: 3, w: 2, h: 2, isIncognito: false },
    { id: 7, dayLabel: '7', isWord: false, iconType: 'bear', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 5, row: 3, w: 2, h: 1, isIncognito: false },
    { id: 8, dayLabel: 'ocho', isWord: true, iconType: 'star', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 5, row: 4, w: 2, h: 2, isIncognito: false },
    { id: 9, dayLabel: '9', isWord: false, iconType: 'snowflake', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 3, row: 5, w: 2, h: 1, isIncognito: false },
    { id: 10, dayLabel: '10', isWord: false, iconType: 'cherry', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 1, row: 6, w: 3, h: 2, isIncognito: false },
    { id: 11, dayLabel: '11', isWord: false, iconType: 'crown', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 4, row: 6, w: 3, h: 3, isIncognito: false },
    { id: 12, dayLabel: '12', isWord: false, iconType: 'cherry', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 1, row: 8, w: 3, h: 1, isIncognito: false },
  ];

  // ── Panel derecho (días 13–24, incógnitos) · misma grilla 6×8 ──
  private readonly rightLayout: BoxItem[] = [
    { id: 13, dayLabel: 'trece', isWord: true, iconType: 'bell', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 1, row: 1, w: 2, h: 2, isIncognito: true, mysteryHint: 'Bruma refrescante para sellar tu piel.' },
    { id: 14, dayLabel: '14', isWord: false, iconType: 'bear', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 3, row: 1, w: 2, h: 1, isIncognito: true, mysteryHint: 'Un trazo mágico para definir la mirada más tierna.' },
    { id: 15, dayLabel: 'quince', isWord: true, iconType: 'star', colorBg: 'bg-[#F7EBEF]', panel: 'right', col: 5, row: 1, w: 2, h: 3, isIncognito: true, mysteryHint: 'Inspirado en la textura del rocío matutino coreano.' },
    { id: 16, dayLabel: '16', isWord: false, iconType: 'cherry', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 3, row: 2, w: 2, h: 2, isIncognito: true, mysteryHint: 'Nubes de terciopelo para tus mejillas.' },
    { id: 17, dayLabel: '17', isWord: false, iconType: 'cherry', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 1, row: 3, w: 2, h: 1, isIncognito: true, mysteryHint: 'El acabado aterciopelado perfecto.' },
    { id: 18, dayLabel: 'dieciocho', isWord: true, orientation: 'vertical', iconType: 'star', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 1, row: 4, w: 1, h: 3, isIncognito: true, mysteryHint: 'Cerdas suaves de alta precisión.' },
    { id: 19, dayLabel: '19', isWord: false, iconType: 'snowflake', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 2, row: 4, w: 2, h: 2, isIncognito: true, mysteryHint: 'Esponjosidad para tu rutina de maquillaje.' },
    { id: 20, dayLabel: '20', isWord: false, iconType: 'bell', colorBg: 'bg-[#F7EBEF]', panel: 'right', col: 4, row: 4, w: 3, h: 1, isIncognito: true, mysteryHint: 'Pequeñas estrellas prensadas para tus párpados.' },
    { id: 21, dayLabel: '21', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 4, row: 5, w: 2, h: 2, isIncognito: true, mysteryHint: 'Suaves destellos para acariciar tus pómulos.' },
    { id: 22, dayLabel: '22', isWord: false, iconType: 'bear', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 6, row: 5, w: 1, h: 2, isIncognito: true, mysteryHint: 'Sabor y dulzura de frutas invernales para tus labios.' },
    { id: 23, dayLabel: '23', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#F7EBEF]', panel: 'right', col: 2, row: 6, w: 2, h: 1, isIncognito: true, mysteryHint: 'Un detalle de coleccionista para tu tocador.' },
    { id: 24, dayLabel: '24', isWord: false, iconType: 'crown', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 1, row: 7, w: 6, h: 2, isIncognito: true, mysteryHint: '¡La pieza central barroca para tu look de navidad!' },
  ];

  leftPanelItems = computed<BoxItem[]>(() => {
    const bySlot = this.productsBySlot();
    return this.leftLayout
      .map((slot) => ({ ...slot, product: bySlot[slot.id] ?? null }))
      .sort((a, b) => a.id - b.id);
  });
  rightPanelItems = computed<BoxItem[]>(() => [...this.rightLayout].sort((a, b) => a.id - b.id));

  // ── Helpers de la grilla (usados en el template) ──
  /** Posición explícita: row-start / col-start / row-end / col-end */
  gridArea(item: BoxItem): string {
    return `${item.row} / ${item.col} / span ${item.h} / span ${item.w}`;
  }

  /** Cajas de una sola fila: se maquetan en horizontal para que quepa el contenido */
  isCompact(item: BoxItem): boolean {
    return item.h === 1;
  }

  openFullImage(url: string | null) {
    if (url) this.fullImage.set(url);
  }

  closeFullImage() {
    this.fullImage.set(null);
  }

  /** Cajas grandes: números y sellos más grandes */
  isLarge(item: BoxItem): boolean {
    return item.w * item.h >= 6;
  }

  /** Dirección del contenido de la caja según su forma */
  layoutClass(item: BoxItem): string {
    return this.isCompact(item) ? 'flex-row justify-center gap-2' : 'flex-col justify-between';
  }

  /** Tamaño del sello dorado del panel incógnito */
  sealClass(item: BoxItem): string {
    if (this.isCompact(item)) return 'w-5 h-5 text-[10px]';
    if (this.isLarge(item)) return 'w-9 h-9 text-base';
    return 'w-6 h-6 sm:w-7 sm:h-7 text-xs';
  }

  /** Imágenes que se muestran como miniaturas en el modal:
   *  las de la variante elegida (si tiene) o, si no, las del producto. */
  galleryImages = computed<string[]>(() => {
    const slot = this.activeModal();
    const product = slot?.product;
    if (!slot || !product) return [];
    const variant = this.tempVariant()[slot.id];
    const variantImgs = sortedImages(variant?.images).map((i) => i.url);
    if (variantImgs.length) return variantImgs;
    return sortedImages(product.images).map((i) => i.url);
  });

  // ── Ciclo de vida ──────────────────────────────────────
  ngOnInit() {
    this.loadProducts();
  }

  ngAfterViewInit() {
    this.initSnowCanvas();
  }

  ngOnDestroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  // ── Carga de productos ─────────────────────────────────
  private loadProducts() {
    // Se piden solo los IDs únicos (hoy: una sola petición al 309) y luego se reparten por día.
    const uniqueIds = [...new Set(this.leftProductIds)];

    forkJoin(
      uniqueIds.map((id) =>
        this.productService.getById(id).pipe(catchError(() => of(null)))
      )
    ).subscribe((results) => {
      const byId = new Map<number, ProductResponseFull>();
      results.forEach((p, i) => {
        if (p) byId.set(uniqueIds[i], p);
      });

      const bySlot: Record<number, ProductResponseFull> = {};
      this.leftProductIds.forEach((pid, i) => {
        const p = byId.get(pid);
        if (p) bySlot[i + 1] = p; // día = índice + 1
      });

      this.productsBySlot.set(bySlot);
      this.loadError.set(byId.size === 0);
      this.loading.set(false);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.fullImage()) {
      this.closeFullImage();
    } else if (this.activeModal()) {
      this.closeModal();
    }
  }

  // ── Helpers de datos / imágenes (usados en el template) ──
  activeVariants(product: ProductResponseFull): VariantResponseFull[] {
    return [...(product.variants ?? [])]
      .filter((v) => v.active && v.stock > 0)
      .sort((a, b) => a.position - b.position);
  }

  productImage(product?: ProductResponseFull | null): string | null {
    return product ? pickMainImage(product.images) : null;
  }

  variantImage(variant: VariantResponseFull, product: ProductResponseFull): string | null {
    return pickMainImage(variant.images) ?? pickMainImage(product.images);
  }

  /** Imagen para la caja ya abierta: la de la variante elegida o la del producto */
  openedBoxImage(item: BoxItem): string | null {
    const product = item.product;
    if (!product) return null;
    const chosen = this.selectedVariants()[item.id];
    return chosen ? this.variantImage(chosen, product) : this.productImage(product);
  }

  isColorCode(code?: string): boolean {
    return !!code && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(code.trim());
  }

  isOpened(id: number): boolean {
    return this.openedIds().has(id);
  }

  getSavedVariant(id: number): VariantResponseFull | undefined {
    return this.selectedVariants()[id];
  }

  // ── Interacción ────────────────────────────────────────
  handleBoxClick(item: BoxItem) {
    // Si el producto aún no cargó (o falló), no abrimos nada en el panel izquierdo
    if (!item.isIncognito && !item.product) return;

    this.playChimeSound();

    if (!item.isIncognito) {
      const current = new Set(this.openedIds());
      current.add(item.id);
      this.openedIds.set(current);

      // Precargar la selección previa (si existe) y la imagen principal
      const saved = this.selectedVariants()[item.id];
      if (saved) {
        this.tempVariant.set({ ...this.tempVariant(), [item.id]: saved });
        this.previewImage.set(this.variantImage(saved, item.product!));
      } else {
        this.previewImage.set(this.productImage(item.product));
      }
    }

    this.activeModal.set(item);
  }

  selectVariant(slotId: number, variant: VariantResponseFull, product: ProductResponseFull) {
    this.tempVariant.set({ ...this.tempVariant(), [slotId]: variant });
    this.previewImage.set(this.variantImage(variant, product));
  }

  setPreview(url: string) {
    this.previewImage.set(url);
  }

  saveVariantAndClose(slotId: number) {
    const chosen = this.tempVariant()[slotId];
    if (chosen) {
      this.selectedVariants.set({ ...this.selectedVariants(), [slotId]: chosen });
    }
    this.closeModal();
  }

  closeModal() {
    this.activeModal.set(null);
    this.previewImage.set(null);
    this.fullImage.set(null);
  }

  openOrderDrawer() {
    this.showOrderDrawer.set(true);
  }

  whatsappUrl = computed(() => {
    let msg = `¡Hola! 🌸 Quisiera consultar sobre el *Calendario de Adviento Glossy 2026*.\n\n`;
    msg += `💄 *Mis Tonos Elegidos (Días 01 al 12):*\n`;

    const chosen = this.selectedVariants();
    this.leftPanelItems().forEach((item) => {
      const v = chosen[item.id];
      const tone = v ? `${v.toneName}${v.toneCode ? ' (' + v.toneCode + ')' : ''}` : 'Tono Estándar';
      msg += `• Día ${item.id} (${item.product?.name ?? 'Producto'}): ${tone}\n`;
    });

    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  });

  resetCalendar() {
    this.openedIds.set(new Set());
    this.selectedVariants.set({});
    this.tempVariant.set({});
  }

  // ── Audio ──────────────────────────────────────────────
  private playChimeSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(987.77, this.audioCtx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    } catch (e) {
      // Audio fallback
    }
  }

  // ── Nieve ──────────────────────────────────────────────
  private initSnowCanvas() {
    if (!this.snowCanvas) return;
    const canvas = this.snowCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const flakes = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.8,
      d: Math.random() * 0.7 + 0.3,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(184, 91, 117, 0.25)';
      ctx.beginPath();
      flakes.forEach((f) => {
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        f.y += f.d;
        f.x += Math.sin(f.y / 30) * 0.4;
        if (f.y > height) {
          f.y = 0;
          f.x = Math.random() * width;
        }
      });
      ctx.fill();

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }
}