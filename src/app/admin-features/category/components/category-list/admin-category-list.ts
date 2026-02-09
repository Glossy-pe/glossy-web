import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { catchError, finalize, of, switchMap, map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

// --- Interfaces basadas en OpenAPI ---

interface CategoryResponse {
  id: number;
  name: string;
  image: string;
}

interface CategoryRequest {
  name: string;
  image: string;
}

interface ImageUploadResponse {
  id: number;
  category: string;
}

@Component({
  selector: 'app-admin-category-list',
imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-category-list.html',
  styleUrl: './admin-category-list.scss',
})
export class AdminCategoryList {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  
  private apiUrl = environment.apiUrl + '/categories';
  private imageApiBase = environment.apiImageServer;

  // --- Estado ---
  categories = signal<CategoryResponse[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  showForm = signal<boolean>(false);
  editingCategory = signal<CategoryResponse | null>(null);

  // Archivos
  selectedFile: File | null = null;
  selectedFileName = signal<string>('');
  previewUrl = signal<string>('');

  // Formulario
  categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    image: [''] // Este campo guardará la URL final devuelta por la Image API
  });

  ngOnInit() {
    this.loadCategories();
  }

  // --- Archivos ---

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName.set(file.name);
      // Revocamos previa para evitar memory leaks
      if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl());
      this.previewUrl.set(URL.createObjectURL(file));
    }
  }

  private uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('category', 'categories');
    formData.append('file', file);
    return this.http.post<ImageUploadResponse>(`${this.imageApiBase}/images`, formData).pipe(
      map(res => `${this.imageApiBase}/images/${res.id}/file`),
      catchError(() => of("https://via.placeholder.com/400?text=Error+Carga"))
    );
  }

  // --- CRUD Operaciones ---

  loadCategories() {
    this.isLoading.set(true);
    this.http.get<CategoryResponse[]>(this.apiUrl)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(data => this.categories.set(data));
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;
    this.isSaving.set(true);

    const editCat = this.editingCategory();

    // Flujo: 1. Si hay archivo, subirlo primero. 2. Luego POST o PATCH a la categoría.
    const fileObs = this.selectedFile 
      ? this.uploadFile(this.selectedFile) 
      : of(editCat ? editCat.image : '');

    fileObs.pipe(
      switchMap(imageUrl => {
        const body: CategoryRequest = {
          name: this.categoryForm.value.name,
          image: imageUrl
        };

        if (editCat) {
          // Actualización parcial mediante PATCH
          return this.http.patch<CategoryResponse>(`${this.apiUrl}/${editCat.id}`, body);
        } else {
          // Creación mediante POST
          return this.http.post<CategoryResponse>(this.apiUrl, body);
        }
      }),
      finalize(() => this.isSaving.set(false)),
      catchError(err => {
        console.error("Error al guardar categoría:", err);
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        if (editCat) {
          this.categories.update(list => list.map(c => c.id === res.id ? res : c));
        } else {
          this.categories.update(list => [...list, res]);
        }
        this.resetForm();
      }
    });
  }

  deleteCategory(id: number) {
    if (!confirm('¿Eliminar esta categoría permanentemente?')) return;
    this.isLoading.set(true);
    this.http.delete(`${this.apiUrl}/${id}`)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(() => {
        this.categories.update(list => list.filter(c => c.id !== id));
      });
  }

  // --- UI Helpers ---

  startEdit(cat: CategoryResponse) {
    this.resetForm();
    this.editingCategory.set(cat);
    this.categoryForm.patchValue({
      name: cat.name,
      image: cat.image
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleForm() {
    if (this.showForm() || this.editingCategory()) this.resetForm();
    else this.showForm.set(true);
  }

  resetForm() {
    this.showForm.set(false);
    this.editingCategory.set(null);
    this.categoryForm.reset();
    if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl());
    this.previewUrl.set('');
    this.selectedFile = null;
    this.selectedFileName.set('');
  }
}
