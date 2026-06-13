import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductResponse } from '../../models/product-response.model';
import { ProductRequest } from '../../models/product-request.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  @Input({ required: true }) product!: ProductResponse;
  @Input() showActions = true;
  @Input() createMode = false;

  @Output() save = new EventEmitter<ProductRequest>();
  @Output() delete = new EventEmitter<void>();

  isEditing = signal(false);
  isSaving = signal(false);
  form = signal<ProductRequest | null>(null);

  ngOnInit(): void {
    if (this.createMode) {
      this.form.set({
        name: 'Nuevo producto',
        description: 'Descripción breve del producto',
        fullDescription: 'Descripción completa del producto...',
        label: 'Nuevo',
        active: false,
        categoryId: 0,
      });
      this.isEditing.set(true);
    }
  }

  startEdit(): void {
    this.form.set({
      name: this.product.name,
      description: this.product.description,
      fullDescription: this.product.fullDescription,
      label: this.product.label,
      active: this.product.active,
      categoryId: this.product.categoryId,
    });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.form.set(null);
  }

  updateField<K extends keyof ProductRequest>(key: K, value: ProductRequest[K]): void {
    this.form.update((f) => f ? { ...f, [key]: value } : f);
  }

  submitSave(): void {
    const f = this.form();
    if (!f) return;
    this.save.emit(f);
  }

  markSaving(value: boolean): void {
    this.isSaving.set(value);
  }

  confirmSaved(): void {
    this.isEditing.set(false);
    this.form.set(null);
    this.isSaving.set(false);
  }
}