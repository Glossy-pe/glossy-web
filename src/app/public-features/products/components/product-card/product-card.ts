import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { ProductService } from '../../services/product.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  @Input({ required: true }) product!: ProductResponseFull;

  confirmingDelete = signal(false);
  isDeleting = signal(false);
  deleteError = signal<string | null>(null);

  constructor(private router: Router) {}

  goToDetail(id: number): void {
    this.router.navigate(['/guest/products', id]);
  }

  // ── Imagen principal del producto ──────────────────────────────
  get mainImageUrl(): string | null {
    const images = this.product?.images ?? [];
    if (images.length === 0) return null;

    return images.find(img => img.mainImage)?.url ?? images[0].url;
  }

  toneGradient(): string {
    const colors = (this.product.variants ?? [])
      .map(v => v.toneCode)
      .filter((c): c is string => !!c)
      .slice(0, 6);

    if (colors.length === 0) return 'linear-gradient(90deg, #F9A8D4, #DB2777)';
    if (colors.length === 1) return colors[0];

    const step = 100 / colors.length;
    const stops = colors
      .map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`)
      .join(', ');
    return `linear-gradient(90deg, ${stops})`;
  }
}