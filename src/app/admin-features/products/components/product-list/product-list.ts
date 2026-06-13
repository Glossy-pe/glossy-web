import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { ProductResponse } from '../../models/product-response.model';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit {
  products = signal<ProductResponse[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService
      .getAllProducts()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.products.set(response);
        },
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  goToDetail(id: number): void {
    this.router.navigate(['/admin/products', id]);
  }
}