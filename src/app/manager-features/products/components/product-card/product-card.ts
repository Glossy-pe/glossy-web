import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Router } from '@angular/router';
import { ProductResponseFull } from '../../models/product-response-full.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {

  @Input({ required: true }) product!: ProductResponseFull;
  @Output() deleted = new EventEmitter<number>();

  confirmingDelete = signal(false);
  isDeleting = signal(false);
  deleteError = signal<string | null>(null);

  constructor(
    private productService: ProductService,
    private router: Router,
  ) {}

  goToDetail(id: number): void {
    this.router.navigate(['/manager/products', id]);
  }

  requestDelete(): void {
    this.confirmingDelete.set(true);
    this.deleteError.set(null);
  }

  cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  confirmDelete(): void {
    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.productService.delete(this.product.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.deleted.emit(this.product.id);
      },
      error: () => {
        this.isDeleting.set(false);
        this.confirmingDelete.set(false);
        this.deleteError.set('No se pudo eliminar. Intenta de nuevo.');
      },
    });
  }
  
}