import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface CategoryResponse { id: number; name: string; }
interface LabelResponse    { id: number; name: string; }
interface ProductResponse  { id: number; name: string; }

@Component({
  selector: 'app-admin-product-create',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './admin-product-create.html',
  styleUrl: './admin-product-create.scss',
})

export class AdminProductCreate {
  private http   = inject(HttpClient);
  private fb     = inject(FormBuilder);
  private router = inject(Router);

  private apiUrl = environment.apiUrl;

  categories     = signal<CategoryResponse[]>([]);
  labels         = signal<LabelResponse[]>([]);
  selectedLabels = signal<number[]>([]);
  isSaving       = signal(false);
  isLoadingCats  = signal(true);
  isLoadingLabels= signal(true);

  productForm: FormGroup = this.fb.group({
    name:            ['', Validators.required],
    description:     [''],
    fullDescription: [''],
    active:          [true],
    categoryId:      [null, Validators.required]
  });

  constructor() {
    this.loadCategories();
    this.loadLabels();
  }

  private loadCategories() {
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`).pipe(
      finalize(() => this.isLoadingCats.set(false)),
      catchError(() => of([]))
    ).subscribe(data => this.categories.set(data));
  }

  private loadLabels() {
    this.http.get<LabelResponse[]>(`${this.apiUrl}/labels`).pipe(
      finalize(() => this.isLoadingLabels.set(false)),
      catchError(() => of([]))
    ).subscribe(data => this.labels.set(data));
  }

  toggleLabel(id: number) {
    this.selectedLabels.update(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]);
  }

  isLabelSelected(id: number) { return this.selectedLabels().includes(id); }

  save() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.productForm.disable();

    const body = {
      ...this.productForm.getRawValue(),
      labelsIds: this.selectedLabels()
    };

    this.http.post<ProductResponse>(`${this.apiUrl}/products`, body).pipe(
      finalize(() => { this.isSaving.set(false); this.productForm.enable(); }),
      catchError(err => { console.error(err); alert('Error al crear el producto'); return of(null); })
    ).subscribe(res => {
      if (res) {
        // Navegar al detail para agregar variantes e imágenes
        this.router.navigate([`/admin/products/${res.id}`]);
      }
    });
  }

  goBack() { this.router.navigate(['/admin/products']); }
}
