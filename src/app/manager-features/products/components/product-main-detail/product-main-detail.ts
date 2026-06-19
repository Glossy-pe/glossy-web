import { Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductResponse } from '../../models/product-response.model';
import { ProductRequest } from '../../models/product-request.model';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../../category/services/category.service';
import { CategoryResponse } from '../../../category/models/category-response.model';

@Component({
  selector: 'app-product-main-detail',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-main-detail.html',
  styleUrl: './product-main-detail.scss',
})
export class ProductMainDetail implements OnInit {
  @Input({ required: true }) productId!: number;

  product = signal<ProductResponse | null>(null);
  categories = signal<CategoryResponse[]>([]);   // 👈
  editMode = signal(false);
  saving = signal(false);

  form!: FormGroup;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,   // 👈
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.loadProduct();
    this.loadCategories();   // 👈
  }

  loadProduct(): void {
    this.productService.getById(this.productId).subscribe(res => {
      this.product.set(res);
    });
  }

  loadCategories(): void {   // 👈
    this.categoryService.getAll().subscribe(res => {
      this.categories.set(res);
    });
  }

  enterEdit(prod: ProductResponse): void {
    this.form = this.fb.group({
      name:            [prod.name,            Validators.required],
      description:     [prod.description],
      fullDescription: [prod.fullDescription],
      label:           [prod.label],
      categoryId:      [prod.categoryId,      [Validators.required, Validators.min(1)]],
      active:          [prod.active],
    });
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
  }

  saveEdit(): void {
    if (this.form.invalid) return;

    const request: ProductRequest = this.form.getRawValue();
    this.saving.set(true);

    this.productService.update(this.productId, request).subscribe({
      next: res => {
        this.product.set(res);
        this.editMode.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  // 👈 helper para mostrar el nombre de la categoría en modo lectura
  getCategoryName(categoryId: number): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? '—';
  }
}