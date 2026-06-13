import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { ProductRequest } from '../../models/product-request.model';
import { ProductResponse } from '../../models/product-response.model';
import { VariantList } from '../../../variants/components/variant-list/variant-list';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, VariantList, ProductCard],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  @ViewChild(ProductCard) productCard!: ProductCard;

  product = signal<ProductResponse | null>(null);
  form = signal<ProductRequest>({
    name: 'Nuevo producto',
    description: 'Descripción breve del producto',
    fullDescription: 'Descripción completa del producto...',
    label: 'Nuevo',
    active: false,
    categoryId: 0,
  });

  isLoading = signal(false);
  isDeleting = signal(false);
  hasError = signal(false);
  isCreateMode = signal(false);
  showCreateWarning = signal(false);
  showDeleteConfirm = signal(false);

  private productId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.isCreateMode.set(this.route.snapshot.url.some(segment => segment.path === 'create'));
    this.showCreateWarning.set(this.isCreateMode());

    if (!this.isCreateMode() && this.productId) {
      this.loadProduct();
    }
  }

  loadProduct(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService
      .getById(this.productId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (p) => {
          this.product.set(p);
        },
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  confirmCreate(): void {
    this.showCreateWarning.set(false);
  }

  cancelCreate(): void {
    this.router.navigate(['/manager/products']);
  }


  confirmDelete(): void { this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); }

  deleteProduct(): void {
    this.isDeleting.set(true);

    this.productService
      .delete(this.productId)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/manager/products']),
        error: (err) => console.error(err),
      });
  }

  goBack(): void {
    this.router.navigate(['/manager/products']);
  }

  onSave(form: ProductRequest): void {
  this.productCard.markSaving(true);

  this.productService
    .update(this.productId, form)
    .pipe(finalize(() => this.productCard.markSaving(false)))
    .subscribe({
      next: (saved) => {
        this.product.set(saved);
        this.productCard.confirmSaved();
      },
      error: (err) => console.error(err),
    });
}

updateField<K extends keyof ProductRequest>(key: K, value: ProductRequest[K]): void {
  this.form.update((f) => ({ ...f, [key]: value }));
}

saveCreate(): void {
  this.productService
    .create(this.form())
    .subscribe({
      next: (saved) => this.router.navigate(['/manager/products', saved.id]),
      error: (err) => console.error(err),
    });
}
}