import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { VariantService } from '../../services/variant.service';
import { VariantResponse } from '../../models/variant-response';

@Component({
  selector: 'app-variant-detail',
  imports: [CommonModule],
  templateUrl: './variant-detail.html',
  styleUrl: './variant-detail.scss',
})
export class VariantDetail implements OnInit {
  variant = signal<VariantResponse | null>(null);
  isLoading = signal(false);
  isDeleting = signal(false);
  hasError = signal(false);
  showDeleteConfirm = signal(false);

  private variantId = 0;
  private productId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private variantService: VariantService
  ) {}

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.variantId = Number(this.route.snapshot.paramMap.get('variantId'));
    if (this.variantId) this.loadVariant();
  }

  loadVariant(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.variantService
      .getById(this.variantId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (v) => this.variant.set(v),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  goToEdit(): void {
    this.router.navigate([
      '/manager/products', this.productId, 'variants', this.variantId, 'edit',
    ]);
  }

  confirmDelete(): void { this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); }

  deleteVariant(): void {
    this.isDeleting.set(true);
    this.variantService
      .delete(this.variantId)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/manager/products', this.productId]),
        error: (err) => console.error(err),
      });
  }

  goBack(): void {
    this.router.navigate(['/manager/products', this.productId]);
  }
}