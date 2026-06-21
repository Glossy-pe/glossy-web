import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { VariantService } from '../../services/variant.service';
import { VariantResponse } from '../../models/variant-response';
import { VariantRequest } from '../../models/variant.request';

@Component({
  selector: 'app-variant-list',
  imports: [CommonModule],
  templateUrl: './variant-list.html',
  styleUrl: './variant-list.scss',
})
export class VariantList implements OnInit {
  @Input({ required: true }) productId!: number;

  variants = signal<VariantResponse[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  isDeleting = signal(false);
  variantToDelete = signal<VariantResponse | null>(null);

  // ── Modal creación ───────────────────────────────────────────────
    showModal   = signal(false);
    isCreating  = signal(false);
    createError = signal('');
    createForm  = signal<VariantRequest>({
      toneName: '', toneCode: '', cost: 0,
      price: 0, stock: 0, position: 0, active: true, productId: this.productId,
    });

  constructor(
    private variantService: VariantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadVariants();
  }

  sortedVariants = computed(() =>
    [...this.variants()].sort((a, b) => {
      // sin posición asignada → al final (no usar `?? 0`,
      // porque pisaría a las que sí tienen position === 0)
      const posA = a.position ?? Number.MAX_SAFE_INTEGER;
      const posB = b.position ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    })
  );

  loadVariants(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.variantService
      .getByProductId(this.productId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.variants.set(data),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  // goToCreate(): void {
  //   this.router.navigate(['/manager/products', this.productId, 'variants', 'new']);
  // }

  goToDetail(variantId: number): void {
    this.router.navigate(['/manager/products', this.productId, 'variants', variantId]);
  }

  openDeleteConfirm(variant: VariantResponse): void {
    this.variantToDelete.set(variant);
  }

  cancelDelete(): void {
    this.variantToDelete.set(null);
  }

  deleteVariant(): void {
    const variant = this.variantToDelete();
    if (!variant) return;

    this.isDeleting.set(true);

    this.variantService
      .delete(variant.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.variants.update((list) => list.filter((v) => v.id !== variant.id));
          this.variantToDelete.set(null);
        },
        error: (err) => console.error(err),
      });
  }


  // ── Modal ────────────────────────────────────────────────────────
    openModal(): void {
      this.createForm.set({
        toneName: 'DEFAULT', toneCode: 'DEFAULT', cost: 0,
        price: 0, stock: 0, position: 0, active: true, productId: this.productId
      });
      this.createError.set('');
      this.showModal.set(true);
    }
  
    closeModal(): void {
      this.showModal.set(false);
    }
  
    saveVariant(): void {
      this.isCreating.set(true);
      this.createError.set('');
      this.variantService.create(this.createForm())
        .pipe(finalize(() => this.isCreating.set(false)))
        .subscribe({
          next: res => { this.closeModal(); this.goToDetail(res.id); },
          error: err => {
            console.error(err);
            this.createError.set('No se pudo crear la variante. Intenta nuevamente.');
          },
        });
    }
  
    patchForm(patch: Partial<VariantRequest>): void {
      this.createForm.update(v => ({ ...v, ...patch }));
    }
}