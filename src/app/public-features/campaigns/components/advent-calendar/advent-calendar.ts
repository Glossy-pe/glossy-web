import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  HostListener,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductResponseFull } from '../../../products/models/product-response-full.model';
import { VariantResponseFull } from '../../../variants/models/variant-response.full.mode';
import { KitService } from '../../../../manager-features/kits/services/kit.service';
import { decodeAdventLink, isAdventLinkExpired } from '../../../../manager-features/kits/utils/advent-link.util';
// Ajusta estas rutas a tu proyecto

const CALENDAR_DAYS = 24;

type Status = 'loading' | 'ready' | 'invalid' | 'expired' | 'unavailable' | 'error';

export interface BoxItem {
  id: number; // día del calendario (1..24) = position del kit
  dayLabel: string;
  isWord: boolean;
  orientation?: 'vertical' | 'horizontal';
  iconType: 'ribbon' | 'cherry' | 'snowflake' | 'bell' | 'bear' | 'star' | 'crown';
  colorBg: string;
  panel: 'left' | 'right';
  col: number;
  row: number;
  w: number;
  h: number;
  mysteryHint?: string;
  isIncognito: boolean; // true = no hay producto en esa posición
  product?: ProductResponseFull | null;
}

type LayoutSlot = Omit<BoxItem, 'product' | 'isIncognito'>;

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
  private readonly kitService = inject(KitService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('snowCanvas') snowCanvas!: ElementRef<HTMLCanvasElement>;

  // ── Estado ─────────────────────────────────────────────
  status = signal<Status>('loading');
  /** Producto por día (position del kit) */
  productsByDay = signal<Record<number, ProductResponseFull>>({});

  openedIds = signal<Set<number>>(new Set<number>());
  selectedVariants = signal<Record<number, VariantResponseFull>>({});
  tempVariant = signal<Record<number, VariantResponseFull>>({});
  previewImage = signal<string | null>(null);
  fullImage = signal<string | null>(null);

  activeModal = signal<BoxItem | null>(null);
  showOrderDrawer = signal<boolean>(false);

  private audioCtx: AudioContext | null = null;
  private animFrameId: number | null = null;
  private resizeHandler: (() => void) | null = null;

  // ── Layout fijo de las 24 cajas (grilla 6×8 por panel) ──
  private readonly layout: LayoutSlot[] = [
    // Panel izquierdo (1–12)
    { id: 1, dayLabel: '1', isWord: false, iconType: 'bell', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 1, row: 1, w: 3, h: 2 },
    { id: 2, dayLabel: '2', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 4, row: 1, w: 2, h: 1 },
    { id: 3, dayLabel: 'tres', isWord: true, orientation: 'vertical', iconType: 'snowflake', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 6, row: 1, w: 1, h: 2 },
    { id: 4, dayLabel: '4', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 4, row: 2, w: 2, h: 1 },
    { id: 5, dayLabel: '5', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 1, row: 3, w: 2, h: 3 },
    { id: 6, dayLabel: 'seis', isWord: true, iconType: 'cherry', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 3, row: 3, w: 2, h: 2 },
    { id: 7, dayLabel: '7', isWord: false, iconType: 'bear', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 5, row: 3, w: 2, h: 1 },
    { id: 8, dayLabel: 'ocho', isWord: true, iconType: 'star', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 5, row: 4, w: 2, h: 2 },
    { id: 9, dayLabel: '9', isWord: false, iconType: 'snowflake', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 3, row: 5, w: 2, h: 1 },
    { id: 10, dayLabel: '10', isWord: false, iconType: 'cherry', colorBg: 'bg-[#FAF5EF]', panel: 'left', col: 1, row: 6, w: 3, h: 2 },
    { id: 11, dayLabel: '11', isWord: false, iconType: 'crown', colorBg: 'bg-[#FFDDE5]', panel: 'left', col: 4, row: 6, w: 3, h: 3 },
    { id: 12, dayLabel: '12', isWord: false, iconType: 'cherry', colorBg: 'bg-[#F7EBEF]', panel: 'left', col: 1, row: 8, w: 3, h: 1 },
    // Panel derecho (13–24)
    { id: 13, dayLabel: 'trece', isWord: true, iconType: 'bell', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 1, row: 1, w: 2, h: 2, mysteryHint: 'Bruma refrescante para sellar tu piel.' },
    { id: 14, dayLabel: '14', isWord: false, iconType: 'bear', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 3, row: 1, w: 2, h: 1, mysteryHint: 'Un trazo mágico para definir la mirada más tierna.' },
    { id: 15, dayLabel: 'quince', isWord: true, iconType: 'star', colorBg: 'bg-[#F7EBEF]', panel: 'right', col: 5, row: 1, w: 2, h: 3, mysteryHint: 'Inspirado en la textura del rocío matutino coreano.' },
    { id: 16, dayLabel: '16', isWord: false, iconType: 'cherry', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 3, row: 2, w: 2, h: 2, mysteryHint: 'Nubes de terciopelo para tus mejillas.' },
    { id: 17, dayLabel: '17', isWord: false, iconType: 'cherry', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 1, row: 3, w: 2, h: 1, mysteryHint: 'El acabado aterciopelado perfecto.' },
    { id: 18, dayLabel: 'dieciocho', isWord: true, orientation: 'vertical', iconType: 'star', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 1, row: 4, w: 1, h: 3, mysteryHint: 'Cerdas suaves de alta precisión.' },
    { id: 19, dayLabel: '19', isWord: false, iconType: 'snowflake', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 2, row: 4, w: 2, h: 2, mysteryHint: 'Esponjosidad para tu rutina de maquillaje.' },
    { id: 20, dayLabel: '20', isWord: false, iconType: 'bell', colorBg: 'bg-[#F7EBEF]', panel: 'right', col: 4, row: 4, w: 3, h: 1, mysteryHint: 'Pequeñas estrellas prensadas para tus párpados.' },
    { id: 21, dayLabel: '21', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#FFDDE5]', panel: 'right', col: 4, row: 5, w: 2, h: 2, mysteryHint: 'Suaves destellos para acariciar tus pómulos.' },
    { id: 22, dayLabel: '22', isWord: false, iconType: 'bear', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 6, row: 5, w: 1, h: 2, mysteryHint: 'Sabor y dulzura de frutas invernales para tus labios.' },
    { id: 23, dayLabel: '23', isWord: false, iconType: 'ribbon', colorBg: 'bg-[#F7EBEF]', panel: 'right', col: 2, row: 6, w: 2, h: 1, mysteryHint: 'Un detalle de coleccionista para tu tocador.' },
    { id: 24, dayLabel: '24', isWord: false, iconType: 'crown', colorBg: 'bg-[#FAF5EF]', panel: 'right', col: 1, row: 7, w: 6, h: 2, mysteryHint: '¡La pieza central barroca para tu look de navidad!' },
  ];

  /** Las 24 cajas con su producto (si existe en esa posición) */
  private readonly allItems = computed<BoxItem[]>(() => {
    const byDay = this.productsByDay();
    return this.layout.map((slot) => {
      const product = byDay[slot.id] ?? null;
      return { ...slot, product, isIncognito: !product };
    });
  });

  leftPanelItems = computed(() => this.allItems().filter((i) => i.panel === 'left'));
  rightPanelItems = computed(() => this.allItems().filter((i) => i.panel === 'right'));

  /** Cajas con producto, en orden de día */
  productItems = computed(() => this.allItems().filter((i) => !!i.product));
  totalProducts = computed(() => this.productItems().length);

  openedCount = computed(() => this.openedIds().size);
  selectedCount = computed(() => Object.keys(this.selectedVariants()).length);
  progressPercent = computed(() => {
    const total = this.totalProducts();
    return total === 0 ? 0 : (this.openedCount() / total) * 100;
  });

  galleryImages = computed<string[]>(() => {
    const slot = this.activeModal();
    const product = slot?.product;
    if (!slot || !product) return [];
    const variant = this.tempVariant()[slot.id];
    const variantImgs = sortedImages(variant?.images).map((i) => i.url);
    if (variantImgs.length) return variantImgs;
    return sortedImages(product.images).map((i) => i.url);
  });

  whatsappUrl = computed(() => {
    let msg = `¡Hola! 🌸 Estos son mis tonos elegidos del *Calendario de Adviento Glossy 2026* (${this.totalProducts()} productos):\n\n`;

    const chosen = this.selectedVariants();
    this.productItems().forEach((item) => {
      const tone = chosen[item.id]?.toneName ?? 'Tono Estándar';
      msg += `• Día ${item.id} · ${item.product?.name ?? 'Producto'}: ${tone}\n`;
    });

    msg += `\n¡Gracias! ✨`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  });

  // ── Helpers de la grilla ──
  gridArea(item: BoxItem): string {
    return `${item.row} / ${item.col} / span ${item.h} / span ${item.w}`;
  }

  isCompact(item: BoxItem): boolean {
    return item.h === 1;
  }

  isLarge(item: BoxItem): boolean {
    return item.w * item.h >= 6;
  }

  layoutClass(item: BoxItem): string {
    return this.isCompact(item) ? 'flex-row justify-center gap-2' : 'flex-col justify-between';
  }

  sealClass(item: BoxItem): string {
    if (this.isCompact(item)) return 'w-5 h-5 text-[10px]';
    if (this.isLarge(item)) return 'w-9 h-9 text-base';
    return 'w-6 h-6 sm:w-7 sm:h-7 text-xs';
  }

  // ── Ciclo de vida ──────────────────────────────────────
  ngOnInit() {
    this.loadFromLink();
  }

  ngAfterViewInit() {
    this.initSnowCanvas();
  }

  ngOnDestroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
  }

  // ── Carga desde el link ────────────────────────────────
  private loadFromLink() {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    const payload = decodeAdventLink(code);

    if (!payload) {
      this.status.set('invalid');
      return;
    }
    if (isAdventLinkExpired(payload)) {
      this.status.set('expired');
      return;
    }

    this.kitService.getPublicKit(payload.kitId).subscribe({
      next: (kit) => {
        const byDay: Record<number, ProductResponseFull> = {};
        for (const item of kit.items ?? []) {
          if (item.product && item.position >= 1 && item.position <= CALENDAR_DAYS) {
            byDay[item.position] = item.product;
          }
        }
        this.productsByDay.set(byDay);
        this.status.set('ready');
      },
      error: (e) => {
        this.status.set(e instanceof HttpErrorResponse && e.status === 404 ? 'unavailable' : 'error');
      },
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

  // ── Helpers de datos / imágenes ──
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

  openedBoxImage(item: BoxItem): string | null {
    return this.productImage(item.product);
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
    this.playChimeSound();

    if (item.product) {
      const current = new Set(this.openedIds());
      current.add(item.id);
      this.openedIds.set(current);

      const saved = this.selectedVariants()[item.id];
      if (saved) {
        this.tempVariant.set({ ...this.tempVariant(), [item.id]: saved });
        this.previewImage.set(this.variantImage(saved, item.product));
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

  openFullImage(url: string | null) {
    if (url) this.fullImage.set(url);
  }

  closeFullImage() {
    this.fullImage.set(null);
  }

  openOrderDrawer() {
    this.showOrderDrawer.set(true);
  }

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

    this.resizeHandler = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', this.resizeHandler);

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