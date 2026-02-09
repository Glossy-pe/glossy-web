import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl, FormsModule } from '@angular/forms';
import { catchError, finalize, of, forkJoin, switchMap, map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

// --- Interfaces basadas en OpenAPI ---

interface ProductResponse {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  images: ProductImageResponse[];
  active: boolean;
  label: string;
  categoryId: number;
  variants: ProductVariantResponse[];
}

interface ProductImageResponse {
  id: number;
  url: string;
  position: number;
  mainImage: boolean;
  productId: number;
}

interface ProductImageRequest {
  url: string;
  position: number;
  mainImage: boolean;
}

interface ProductVariantResponse {
  id: number;
  toneName: string;
  toneCode: string;
  price: number;
  stock: number;
}

interface ProductVariantRequest {
  toneName: string;
  toneCode: string;
  price: number;
  stock: number;
}

interface CategoryResponse {
  id: number;
  name: string;
  image: string;
}

interface ImageUploadResponse {
  id: number;
  category: string;
}

@Component({
  selector: 'app-admin-product-list',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  providers: [CurrencyPipe],
  templateUrl: './admin-product-list.html',
  styleUrl: './admin-product-list.scss',
})

export class AdminProductList implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  
  private apiUrl = environment.apiUrl;
  private imageApiBase = environment.apiImageServer;

  // --- Estado Global ---
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  labelFilter = signal<string>('');
  showCreateForm = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoadingProducts = signal<boolean>(false);
  selectedProduct = signal<ProductResponse | null>(null);

  // --- Archivos ---
  selectedFile: File | null = null;
  selectedFileName = signal<string>('');

  // --- Creación temporal ---
  tempVariants = signal<ProductVariantRequest[]>([]);
  tempImages = signal<any[]>([]); // { file, preview, mainImage }

  // --- Modal UI ---
  isEditingBasic = signal<boolean>(false);
  showVariantFormInModal = signal<boolean>(false);
  showImageFormInModal = signal<boolean>(false);

  newVariant: ProductVariantRequest = { toneName: '', toneCode: '#F1E3C1', price: 0, stock: 0 };

  // --- Formularios ---
  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    fullDescription: [''],
    active: [true],
    label: [''],
    categoryId: [null, [Validators.required]]
  });

  basicEditForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    fullDescription: [''],
    active: [true],
    label: [''],
    categoryId: [null, [Validators.required]]
  });

  get basicEditNameControl() { return this.basicEditForm.get('name') as FormControl; }

  filteredProducts = computed(() => {
    const f = this.labelFilter().toLowerCase();
    if (!f) return this.products();
    return this.products().filter(p => p.name.toLowerCase().includes(f) || p.label?.toLowerCase().includes(f));
  });

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  // --- Operaciones de Archivo ---

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName.set(file.name);
    }
  }

  private uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('category', 'products');
    formData.append('file', file);
    return this.http.post<ImageUploadResponse>(`${this.imageApiBase}/images`, formData).pipe(
      map(res => `${this.imageApiBase}/images/${res.id}/file`),
      catchError(() => of("https://via.placeholder.com/300?text=Error+Carga"))
    );
  }

  // --- Lógica CRUD Productos ---

  loadProducts() {
    this.isLoadingProducts.set(true);
    this.http.get<ProductResponse[]>(`${this.apiUrl}/products`)
      .pipe(finalize(() => this.isLoadingProducts.set(false)))
      .subscribe(data => this.products.set(data));
  }

  loadCategories() {
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`).subscribe(data => this.categories.set(data));
  }

  saveProduct() {
    if (this.productForm.invalid) return;
    this.isSaving.set(true);

    this.http.post<ProductResponse>(`${this.apiUrl}/products`, this.productForm.value).pipe(
      switchMap(prod => {
        const imgTasks = this.tempImages().map(ti => 
          this.uploadFile(ti.file).pipe(
            switchMap(url => this.http.post(`${this.apiUrl}/products/${prod.id}/images`, {
              url, position: 1, mainImage: ti.mainImage
            }))
          )
        );
        const varTasks = this.tempVariants().map(v => this.http.post(`${this.apiUrl}/products/${prod.id}/variants`, v));
        
        const allTasks = [...imgTasks, ...varTasks];
        if (allTasks.length === 0) return of(prod);

        return forkJoin(allTasks).pipe(
          switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${prod.id}`))
        );
      }),
      finalize(() => this.isSaving.set(false)),
      catchError(err => {
        console.error("Error al guardar producto completo", err);
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        this.products.update(list => [res, ...list]);
        this.resetForm();
      }
    });
  }

  updateProductBasic() {
    const p = this.selectedProduct();
    if (!p || this.basicEditForm.invalid) return;
    this.isSaving.set(true);
    
    this.http.put<ProductResponse>(`${this.apiUrl}/products/${p.id}`, this.basicEditForm.value)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe(res => {
        this.updateLocalProduct(res);
        this.selectedProduct.set(res);
        this.isEditingBasic.set(false);
      });
  }

  deleteProduct(id: number) {
    if (!confirm('¿Eliminar producto definitivamente?')) return;
    this.http.delete(`${this.apiUrl}/products/${id}`).subscribe(() => {
      this.products.update(list => list.filter(p => p.id !== id));
      if (this.selectedProduct()?.id === id) this.selectedProduct.set(null);
    });
  }

  // --- CRUD Variantes Modal ---

  saveVariant() {
    const p = this.selectedProduct();
    if (!p) return;
    this.isSaving.set(true);
    this.http.post<ProductVariantResponse>(`${this.apiUrl}/products/${p.id}/variants`, this.newVariant)
      .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)))
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe(res => {
        this.updateLocalProduct(res);
        this.selectedProduct.set(res);
        this.showVariantFormInModal.set(false);
        this.newVariant = { toneName: '', toneCode: '#F1E3C1', price: 0, stock: 0 };
      });
  }

  deleteVariant(vId: number) {
    const p = this.selectedProduct();
    if (!p) return;
    this.isSaving.set(true);
    this.http.delete(`${this.apiUrl}/products/${p.id}/variants/${vId}`)
      .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)))
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe(res => {
        this.updateLocalProduct(res);
        this.selectedProduct.set(res);
      });
  }

  // --- CRUD Imágenes Modal ---

  uploadAndAddImage(isMain: boolean) {
    const p = this.selectedProduct();
    if (!p || !this.selectedFile) return;
    this.isSaving.set(true);
    this.uploadFile(this.selectedFile).pipe(
      switchMap(url => this.http.post(`${this.apiUrl}/products/${p.id}/images`, { url, position: 1, mainImage: isMain })),
      switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)),
      finalize(() => this.isSaving.set(false))
    ).subscribe(res => {
      this.updateLocalProduct(res);
      this.selectedProduct.set(res);
      this.showImageFormInModal.set(false);
      this.selectedFile = null;
      this.selectedFileName.set('');
    });
  }

  setImageAsMain(img: ProductImageResponse) {
    const p = this.selectedProduct();
    if (!p) return;
    this.isSaving.set(true);
    this.http.put(`${this.apiUrl}/products/${p.id}/images/${img.id}`, { ...img, mainImage: true })
      .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)))
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe(res => {
        this.updateLocalProduct(res);
        this.selectedProduct.set(res);
      });
  }

  deleteImage(imgId: number) {
    const p = this.selectedProduct();
    if (!p) return;
    this.isSaving.set(true);
    this.http.delete(`${this.apiUrl}/products/${p.id}/images/${imgId}`)
      .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)))
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe(res => {
        this.updateLocalProduct(res);
        this.selectedProduct.set(res);
      });
  }

  // --- Helpers UI ---

  addVariantToList(name: string, code: string, price: string, stock: string) {
    if (!name || !price || !stock) return;
    this.tempVariants.update(v => [...v, { toneName: name, toneCode: code, price: +price, stock: +stock }]);
  }

  removeVariantFromList(idx: number) { this.tempVariants.update(v => v.filter((_, i) => i !== idx)); }

  addImageToList() {
    if (!this.selectedFile) return;
    const preview = URL.createObjectURL(this.selectedFile);
    const hasMain = this.tempImages().some(img => img.mainImage);
    this.tempImages.update(imgs => [...imgs, { file: this.selectedFile, preview, mainImage: !hasMain }]);
    this.selectedFile = null;
    this.selectedFileName.set('');
  }

  removeImageFromList(idx: number) { 
    const img = this.tempImages()[idx];
    URL.revokeObjectURL(img.preview);
    this.tempImages.update(imgs => {
      const newList = imgs.filter((_, i) => i !== idx);
      if (img.mainImage && newList.length > 0) newList[0].mainImage = true;
      return newList;
    });
  }

  setMainInTemp(idx: number) { this.tempImages.update(imgs => imgs.map((img, i) => ({ ...img, mainImage: i === idx }))); }

  toggleCreateForm() { if (this.showCreateForm()) this.resetForm(); else this.showCreateForm.set(true); }

  resetForm() {
    this.showCreateForm.set(false);
    this.productForm.reset({ active: true });
    this.tempVariants.set([]);
    this.tempImages().forEach(i => URL.revokeObjectURL(i.preview));
    this.tempImages.set([]);
  }

  startEditBasic() {
    if (this.selectedProduct()) {
      this.basicEditForm.patchValue(this.selectedProduct()!);
      this.isEditingBasic.set(true);
    }
  }

  cancelEditBasic() { this.isEditingBasic.set(false); }
  toggleVariantForm() { this.showVariantFormInModal.update(v => !v); }
  toggleImageForm() { this.showImageFormInModal.update(v => !v); }

  updateFilter(e: Event) { this.labelFilter.set((e.target as HTMLInputElement).value); }

  selectProduct(p: ProductResponse) {
    this.selectedProduct.set(p);
    this.isEditingBasic.set(false);
    this.showVariantFormInModal.set(false);
    this.showImageFormInModal.set(false);
  }

  getMainImage(p: ProductResponse) { return p.images.find(i => i.mainImage)?.url; }
  getTotalStock(p: ProductResponse) { return p.variants?.reduce((a, v) => a + v.stock, 0) || 0; }
  getCategoryName(id: number) { return this.categories().find(c => c.id === id)?.name || 'N/A'; }
  private updateLocalProduct(p: ProductResponse) { this.products.update(l => l.map(item => item.id === p.id ? p : item)); }
}