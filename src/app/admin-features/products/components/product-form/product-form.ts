import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { ProductRequest } from '../../models/product-request.model';
import { ProductResponse } from '../../models/product-response.model';

@Component({
  selector: 'app-product-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm implements OnInit {
  isEditMode = signal(false);
  isLoading = signal(false);
  isSaving = signal(false);
  hasError = signal(false);

  form = signal<ProductRequest>({
    name: '',
    description: '',
    fullDescription: '',
    label: '',
    active: true,
    categoryId: 0,
    slug: '',
  });

  private productId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.productId = Number(idParam);
      this.isEditMode.set(true);
      this.loadProduct();
    }
  }

  loadProduct(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService
      .getById(this.productId!)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (p) => this.patchForm(p),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  submit(): void {
    this.isSaving.set(true);

    const request$ = this.isEditMode()
      ? this.productService.update(this.productId!, this.form())
      : this.productService.create(this.form());

    request$
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (saved) => this.router.navigate(['/admin/products', saved.id]),
        error: (err) => console.error(err),
      });
  }

  cancel(): void {
    if (this.isEditMode()) {
      this.router.navigate(['/admin/products', this.productId]);
    } else {
      this.router.navigate(['/admin/products']);
    }
  }

  updateField<K extends keyof ProductRequest>(key: K, value: ProductRequest[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  private patchForm(p: ProductResponse): void {
    this.form.set({
      name: p.name,
      description: p.description,
      fullDescription: p.fullDescription,
      label: p.label,
      active: p.active,
      categoryId: p.categoryId,
      slug: p.slug,
    });
  }
}