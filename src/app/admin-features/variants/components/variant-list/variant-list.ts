import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { VariantService } from '../../services/variant.service';
import { VariantResponse } from '../../models/variant-response';

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

  constructor(
    private variantService: VariantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadVariants();
  }

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

  goToCreate(): void {
    this.router.navigate(['/admin/products', this.productId, 'variants', 'new']);
  }

  goToEdit(variantId: number): void {
    this.router.navigate(['/admin/products', this.productId, 'variants', variantId, 'edit']);
  }

  goToDetail(variantId: number): void {
    this.router.navigate(['/admin/products', this.productId, 'variants', variantId, 'detail']);
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
}