import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {
  KitDetailResponse,
  KitItemRequest,
  KitItemResponse,
  ProductSearchResult,
} from '../../models/kit.model';
import { KitService, apiErrorMessage } from '../../services/kit.service';
import { encodeAdventLink } from '../../utils/advent-link.util';

const CALENDAR_DAYS = 24;

type Panel = { mode: 'add' } | { mode: 'edit'; item: KitItemResponse };

@Component({
  selector: 'app-kit-detail',
  imports: [FormsModule, RouterLink],
  templateUrl: './kit-detail.html',
})
export class KitDetail implements OnInit {
  private readonly kitService = inject(KitService);
  private readonly route = inject(ActivatedRoute);
  readonly readonly = signal(this.route.snapshot.queryParamMap.get('modo') === 'ver');


  readonly calendarDays = CALENDAR_DAYS;
  private readonly kitId = Number(this.route.snapshot.paramMap.get('id'));

  kit = signal<KitDetailResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // datos del kit
  kitName = signal('');
  kitActive = signal(true);

  // link
  linkDays = signal(7);
  generatedLink = signal<string | null>(null);
  copied = signal(false);

  // panel agregar / editar
  panel = signal<Panel | null>(null);
  panelError = signal<string | null>(null);
  searchText = signal('');
  results = signal<ProductSearchResult[]>([]);
  selectedProduct = signal<ProductSearchResult | null>(null);
  formPosition = signal<number | null>(null);

  private readonly search$ = new Subject<string>();

  /** Primera posición libre desde 1 (huecos incluidos) */
  private readonly nextFreePosition = computed(() => {
    const used = new Set((this.kit()?.items ?? []).map((i) => i.position));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  });

  readonly canSubmit = computed(() => {
    const p = this.panel();
    const pos = this.formPosition();
    if (!p || !pos || pos < 1) return false;
    return p.mode === 'add' ? !!this.selectedProduct() : true;
  });

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) =>
          q.trim().length < 2
            ? of([] as ProductSearchResult[])
            : this.kitService.searchProducts(q.trim()).pipe(catchError(() => of([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.results.set(r));
  }

  ngOnInit() {
    this.load();
  }

  enableEdit() {
    this.readonly.set(false);
  }

  private load() {
    this.kitService.getById(this.kitId).subscribe({
      next: (kit) => {
        this.kit.set(kit);
        this.kitName.set(kit.name);
        this.kitActive.set(kit.active);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  // ── Kit ──
  saveKit() {
    this.error.set(null);
    this.kitService
      .update(this.kitId, { name: this.kitName().trim(), active: this.kitActive() })
      .subscribe({
        next: (k) => this.kit.update((cur) => (cur ? { ...cur, name: k.name, active: k.active } : cur)),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
  }

  // ── Link ──
  generateLink() {
    const days = Math.max(1, Number(this.linkDays()) || 7);
    const code = encodeAdventLink(this.kitId, days);
this.generatedLink.set(`${window.location.origin}/guest/adviento/${code}`);    this.copied.set(false);
  }

  async copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* si falla, el usuario puede copiar el campo a mano */
    }
  }

  // ── Panel agregar / editar ──
  openAdd() {
    this.resetPanel();
    this.formPosition.set(this.nextFreePosition());
    this.panel.set({ mode: 'add' });
  }

  openEdit(item: KitItemResponse) {
    this.resetPanel();
    this.formPosition.set(item.position);
    this.panel.set({ mode: 'edit', item });
  }

  closePanel() {
    this.panel.set(null);
  }

  private resetPanel() {
    this.panelError.set(null);
    this.searchText.set('');
    this.results.set([]);
    this.selectedProduct.set(null);
  }

  onSearch(text: string) {
    this.searchText.set(text);
    this.search$.next(text);
  }

  selectProduct(product: ProductSearchResult) {
    this.selectedProduct.set(product);
  }

  submitPanel() {
    const p = this.panel();
    const position = this.formPosition();
    if (!p || !position) return;
    this.panelError.set(null);

    if (p.mode === 'add') {
      const product = this.selectedProduct();
      if (!product) return;
      this.kitService.addItem(this.kitId, { productId: product.id, position }).subscribe({
        next: () => this.afterPanelSuccess(),
        error: (e) => this.panelError.set(apiErrorMessage(e)),
      });
      return;
    }

    // Edición: solo lo que cambió
    const request: KitItemRequest = {};
    const product = this.selectedProduct();
    if (product && product.id !== p.item.productId) request.productId = product.id;
    if (position !== p.item.position) request.position = position;

    if (Object.keys(request).length === 0) {
      this.closePanel();
      return;
    }

    this.kitService.updateItem(this.kitId, p.item.id, request).subscribe({
      next: () => this.afterPanelSuccess(),
      error: (e) => this.panelError.set(apiErrorMessage(e)),
    });
  }

  private afterPanelSuccess() {
    this.closePanel();
    this.load();
  }

  removeItem(item: KitItemResponse) {
    const name = item.productName ?? `#${item.productId}`;
    if (!confirm(`¿Quitar "${name}" del kit?`)) return;
    this.error.set(null);
    this.kitService.removeItem(this.kitId, item.id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(apiErrorMessage(e)),
    });
  }
}