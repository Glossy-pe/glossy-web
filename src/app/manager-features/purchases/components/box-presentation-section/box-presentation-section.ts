import { Component, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { BoxPresentationService } from '../../services/box-presentation.service';
import { BoxPresentationResponse, SaleTemplateResponse } from '../../models/box-presentation.model';

interface EditorRow {
  variantId: number;
  toneName: string;
  toneCode: string;
  unitPrice: number;
  selected: boolean;
  quantity: number;
}

@Component({
  selector: 'app-box-presentation-section',
  imports: [CommonModule, FormsModule],
  templateUrl: './box-presentation-section.html',
})
export class BoxPresentationSection {
  productId = input.required<number>();

  // Presentación
  presentation = signal<BoxPresentationResponse | null>(null);
  totalUnits   = signal<number | null>(null);
  savingPres   = signal(false);
  presError    = signal('');

  // Plantillas
  templates = signal<SaleTemplateResponse[]>([]);
  variants  = signal<{ id: number; toneName: string; toneCode: string; price: number }[]>([]);

  // Editor de plantilla: null = cerrado, 'new' = nueva, number = id en edición
  editing   = signal<'new' | number | null>(null);
  tplName   = signal('');
  tplUnitPrice = signal<number | null>(null);
  tplActive = signal(true);
  rows      = signal<EditorRow[]>([]);
  savingTpl = signal(false);
  tplError  = signal('');

  // Derivados del editor
  selectedRows   = computed(() => this.rows().filter(r => r.selected));
  editorUnits    = computed(() => this.selectedRows().reduce((s, r) => s + (r.quantity || 0), 0));
  editorReference = computed(() => this.selectedRows().reduce((s, r) => s + (r.quantity || 0) * r.unitPrice, 0));
  editorTotal    = computed(() => (this.tplUnitPrice() ?? 0) * this.editorUnits());
  editorDiscount = computed(() => this.editorReference() - this.editorTotal());

  editorPercent  = computed(() =>
    this.editorReference() > 0 ? (this.editorDiscount() * 100) / this.editorReference() : 0);
  canSaveTpl = computed(() =>
  this.tplName().trim().length > 0 &&
  this.tplUnitPrice() !== null && this.tplUnitPrice()! >= 0 &&
  this.selectedRows().length > 0 &&
  this.selectedRows().every(r => Number.isInteger(r.quantity) && r.quantity >= 1) &&
  !this.savingTpl()
);

  constructor(private service: BoxPresentationService) {
    effect(() => this.load(this.productId()));
  }

  // ── Carga ────────────────────────────────────────────────────────
  private load(productId: number): void {
    this.presentation.set(null);
    this.editing.set(null);

    this.service.getPresentation(productId).subscribe({
      next: p => { this.presentation.set(p); this.totalUnits.set(p.totalUnits); },
      error: () => { this.presentation.set(null); this.totalUnits.set(null); }, // 404: aún no definida
    });
    this.service.getVariants(productId).subscribe(vs =>
      this.variants.set(
        vs.filter(v => v.active !== false && !v.deleted)
          .map(v => ({ id: v.id, toneName: v.toneName, toneCode: v.toneCode, price: Number(v.price) || 0 }))
      ));
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.service.getTemplates(this.productId()).subscribe(t => this.templates.set(t));
  }

  // ── Presentación ─────────────────────────────────────────────────
  savePresentation(): void {
    const total = this.totalUnits();
    if (total === null || total < 1) return;
    this.savingPres.set(true);
    this.presError.set('');
    this.service.savePresentation(this.productId(), total)
      .pipe(finalize(() => this.savingPres.set(false)))
      .subscribe({
        next: p => this.presentation.set(p),
        error: err => this.presError.set(err?.error?.message ?? 'No se pudo guardar la presentación.'),
      });
  }

  // ── Plantillas ───────────────────────────────────────────────────
  private buildRows(selected: Map<number, number>): EditorRow[] {
    return this.variants().map(v => ({
      variantId: v.id, toneName: v.toneName, toneCode: v.toneCode, unitPrice: v.price,
      selected: selected.has(v.id), quantity: selected.get(v.id) ?? 1,
    }));
  }

  newTemplate(): void {
    this.editing.set('new');
    this.tplName.set('');
    this.tplUnitPrice.set(null);
    this.tplActive.set(true);
    this.tplError.set('');
    this.rows.set(this.buildRows(new Map()));
  }

  editTemplate(t: SaleTemplateResponse): void {
    this.editing.set(t.id);
    this.tplName.set(t.name);
    this.tplUnitPrice.set(t.unitPrice);
    this.tplActive.set(t.active);
    this.tplError.set('');
    this.rows.set(this.buildRows(new Map(t.items.map(i => [i.variantId, i.quantity]))));
  }

  cancelEdit(): void { this.editing.set(null); }

  patchRow(variantId: number, patch: Partial<EditorRow>): void {
    this.rows.update(list => list.map(r => r.variantId === variantId ? { ...r, ...patch } : r));
  }

  selectAll(): void {
    this.rows.update(list => list.map(r => ({ ...r, selected: true })));
  }

  saveTemplate(): void {
    if (!this.canSaveTpl()) return;
    const body = {
      name: this.tplName().trim(),
      unitPrice: this.tplUnitPrice()!,
      active: this.tplActive(),
      items: this.selectedRows().map(r => ({ variantId: r.variantId, quantity: r.quantity })),
    };
    const id = this.editing();
    const call$ = id === 'new'
      ? this.service.createTemplate({ ...body, productId: this.productId() })
      : this.service.updateTemplate(id as number, body);

    this.savingTpl.set(true);
    this.tplError.set('');
    call$.pipe(finalize(() => this.savingTpl.set(false))).subscribe({
      next: () => { this.editing.set(null); this.loadTemplates(); },
      error: err => this.tplError.set(err?.error?.message ?? 'No se pudo guardar la plantilla.'),
    });
  }

  deactivate(t: SaleTemplateResponse): void {
    this.service.deactivateTemplate(t.id).subscribe(() => this.loadTemplates());
  }
}