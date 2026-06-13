import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { ProductResponse } from '../../models/product-response.model';
import { VariantList } from "../../../variants/components/variant-list/variant-list";

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, VariantList],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  product = signal<ProductResponse | null>(null);
  isLoading = signal(false);
  isDeleting = signal(false);
  hasError = signal(false);
  showDeleteConfirm = signal(false);

  private productId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.productId) this.loadProduct();
  }

  loadProduct(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService
      .getById(this.productId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (p) => this.product.set(p),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  goToEdit(): void {
    this.router.navigate(['/admin/products', this.productId, 'edit']);
  }

  confirmDelete(): void { this.showDeleteConfirm.set(true); }
  cancelDelete(): void { this.showDeleteConfirm.set(false); }

  deleteProduct(): void {
    this.isDeleting.set(true);

    this.productService
      .delete(this.productId)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/admin/products']),
        error: (err) => console.error(err),
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/products']);
  }
}