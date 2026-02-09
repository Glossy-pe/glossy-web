import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface CategoryResponse {
  id: number;
  name: string;
  image: string;
}

interface CategoryRequest {
  name: string;
  image: string;
}

@Component({
  selector: 'app-admin-category-list',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './admin-category-list.html',
  styleUrl: './admin-category-list.scss',
})
export class AdminCategoryList {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private apiUrl = environment.apiUrl+'/categories';

  // --- Estado ---
  categories = signal<CategoryResponse[]>([]);
  showCreateForm = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  editingCategory = signal<CategoryResponse | null>(null);

  // --- Formulario ---
  categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    image: ['', [Validators.required]]
  });

  ngOnInit() {
    this.loadCategories();
  }

  // --- Operaciones API ---

  loadCategories() {
    this.http.get<CategoryResponse[]>(this.apiUrl)
      .pipe(catchError(() => of([])))
      .subscribe(data => this.categories.set(data));
  }

  submitForm() {
    if (this.categoryForm.invalid) return;
    this.isProcessing.set(true);

    const categoryData: CategoryRequest = this.categoryForm.value;
    const editCat = this.editingCategory();

    if (editCat) {
      // ACTUALIZAR (PUT)
      this.http.put<CategoryResponse>(`${this.apiUrl}/${editCat.id}`, categoryData)
        .pipe(finalize(() => this.isProcessing.set(false)))
        .subscribe({
          next: (updated) => {
            this.categories.update(list => list.map(c => c.id === updated.id ? updated : c));
            this.resetForm();
          },
          error: (err) => console.error("Error al actualizar", err)
        });
    } else {
      // CREAR (POST)
      this.http.post<CategoryResponse>(this.apiUrl, categoryData)
        .pipe(finalize(() => this.isProcessing.set(false)))
        .subscribe({
          next: (newCat) => {
            this.categories.update(list => [...list, newCat]);
            this.resetForm();
          },
          error: (err) => console.error("Error al crear", err)
        });
    }
  }

  deleteCategory(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`)
      .subscribe({
        next: () => {
          this.categories.update(list => list.filter(c => c.id !== id));
        },
        error: (err) => console.error("Error al eliminar", err)
      });
  }

  // --- Lógica de UI ---

  toggleCreateForm() {
    if (this.editingCategory()) {
      this.resetForm();
    } else {
      this.showCreateForm.update(v => !v);
    }
  }

  startEdit(category: CategoryResponse) {
    this.editingCategory.set(category);
    this.showCreateForm.set(false);
    this.categoryForm.patchValue({
      name: category.name,
      image: category.image
    });
    // Scroll suave al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm() {
    this.showCreateForm.set(false);
    this.editingCategory.set(null);
    this.categoryForm.reset();
  }

  handleImgError(event: any) {
    event.target.src = 'https://via.placeholder.com/150?text=Error+Imagen';
  }
}
