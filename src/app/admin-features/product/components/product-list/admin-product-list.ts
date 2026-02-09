import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';


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
}

interface ProductVariantResponse {
  id: number;
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

@Component({
  selector: 'app-admin-product-list',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './admin-product-list.html',
  styleUrl: './admin-product-list.scss',
})
export class AdminProductList {

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private apiUrl = environment.apiUrl;

  // --- Estado Principal ---
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  labelFilter = signal<string>('');
  showCreateForm = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  selectedProduct = signal<ProductResponse | null>(null);

  // --- Estados de Edición ---
  isEditingBasic = signal<boolean>(false);

  // --- Listas temporales para creación ---
  tempVariants = signal<any[]>([]);
  tempImages = signal<any[]>([]);

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

  // Getter para el control de nombre en edición para usar en la plantilla
  get basicEditNameControl() {
    return this.basicEditForm.get('name') as FormControl;
  }

  variantForm: FormGroup = this.fb.group({
    toneName: ['', Validators.required],
    toneCode: ['#F1E3C1', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]]
  });

  imageForm: FormGroup = this.fb.group({
    url: ['', [Validators.required]],
    position: [1, Validators.required],
    mainImage: [false]
  });

  // --- Formularios internos UI ---
  showVariantForm = signal<boolean>(false);
  showImageForm = signal<boolean>(false);

  // --- Derivados ---
  filteredProducts = computed(() => {
    const filter = this.labelFilter().toLowerCase();
    if (!filter) return this.products();
    return this.products().filter(p => p.label?.toLowerCase().includes(filter));
  });

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  // --- Operaciones API ---

  loadProducts() {
    this.http.get<ProductResponse[]>(`${this.apiUrl}/products`)
      .pipe(catchError(() => of([])))
      .subscribe(data => this.products.set(data));
  }

  loadCategories() {
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`)
      .subscribe(data => this.categories.set(data));
  }

  saveProduct() {
    if (this.productForm.invalid) return;
    this.isSaving.set(true);

    this.http.post<ProductResponse>(`${this.apiUrl}/products`, this.productForm.value)
      .pipe(
        switchMap(newProd => {
          const variantCalls = this.tempVariants().map(v => 
            this.http.post(`${this.apiUrl}/products/${newProd.id}/variants`, v)
          );
          const imageCalls = this.tempImages().map(i => 
            this.http.post(`${this.apiUrl}/products/${newProd.id}/images`, i)
          );
          if (variantCalls.length === 0 && imageCalls.length === 0) return of(newProd);
          return forkJoin([...variantCalls, ...imageCalls]).pipe(
            switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${newProd.id}`))
          );
        }),
        finalize(() => this.isSaving.set(false)),
        catchError(() => of(null))
      )
      .subscribe(finalProd => {
        if (finalProd) {
          this.products.update(prev => [finalProd, ...prev]);
          this.resetForm();
          this.selectProduct(finalProd);
        }
      });
  }

  /**
   * ACTUALIZAR PRODUCTO (PUT)
   */
  updateProduct() {
    const prod = this.selectedProduct();
    if (!prod || this.basicEditForm.invalid) return;

    this.http.put<ProductResponse>(`${this.apiUrl}/products/${prod.id}`, this.basicEditForm.value)
      .subscribe({
        next: (updated) => {
          this.updateProductInList(updated);
          this.selectedProduct.set(updated);
          this.isEditingBasic.set(false);
        },
        error: (err) => console.error("Error al actualizar producto", err)
      });
  }

  /**
   * ELIMINAR PRODUCTO (DELETE)
   */
  deleteProduct(id: number) {
    // Al ser una acción crítica en un entorno Canvas, 
    // se ejecuta la petición DELETE y se actualiza el estado local.
    this.http.delete(`${this.apiUrl}/products/${id}`)
      .subscribe({
        next: () => {
          this.products.update(list => list.filter(p => p.id !== id));
          if (this.selectedProduct()?.id === id) {
            this.selectedProduct.set(null);
          }
        },
        error: (err) => console.error("Error al eliminar producto", err)
      });
  }

  addVariant() {
    const prod = this.selectedProduct();
    if (!prod || this.variantForm.invalid) return;
    this.http.post<ProductResponse>(`${this.apiUrl}/products/${prod.id}/variants`, this.variantForm.value)
      .subscribe(updatedProd => {
        this.updateProductInList(updatedProd);
        this.selectedProduct.set(updatedProd);
        this.showVariantForm.set(false);
        this.variantForm.reset({ toneCode: '#F1E3C1', price: 0, stock: 0 });
      });
  }

  addImage() {
    const prod = this.selectedProduct();
    if (!prod || this.imageForm.invalid) return;
    this.http.post<ProductResponse>(`${this.apiUrl}/products/${prod.id}/images`, this.imageForm.value)
      .subscribe(updatedProd => {
        this.updateProductInList(updatedProd);
        this.selectedProduct.set(updatedProd);
        this.showImageForm.set(false);
        this.imageForm.reset({ position: 1, mainImage: false });
      });
  }

  // --- Lógica de UI ---

  startEditBasic() {
    const prod = this.selectedProduct();
    if (prod) {
      this.basicEditForm.patchValue({
        name: prod.name,
        description: prod.description,
        fullDescription: prod.fullDescription,
        active: prod.active,
        label: prod.label,
        categoryId: prod.categoryId
      });
      this.isEditingBasic.set(true);
    }
  }

  cancelEditBasic() {
    this.isEditingBasic.set(false);
  }

  addVariantToList(name: string, code: string, priceStr: string) {
    const price = parseFloat(priceStr);
    if (!name || isNaN(price)) return;
    this.tempVariants.update(v => [...v, { toneName: name, toneCode: code || '#F1E3C1', price, stock: 10 }]);
  }

  removeVariantFromList(index: number) {
    this.tempVariants.update(v => v.filter((_, i) => i !== index));
  }

  addImageToList(url: string, isMain: boolean) {
    if (!url) return;
    this.tempImages.update(imgs => [...imgs, { url, position: imgs.length + 1, mainImage: isMain }]);
  }

  removeImageFromList(index: number) {
    this.tempImages.update(imgs => imgs.filter((_, i) => i !== index));
  }

  resetForm() {
    this.showCreateForm.set(false);
    this.productForm.reset({ active: true });
    this.tempVariants.set([]);
    this.tempImages.set([]);
  }

  updateFilter(event: Event) {
    this.labelFilter.set((event.target as HTMLInputElement).value);
  }

  selectProduct(product: ProductResponse) {
    this.selectedProduct.set(product);
    this.isEditingBasic.set(false);
    this.showVariantForm.set(false);
    this.showImageForm.set(false);
  }

  getMainImage(product: ProductResponse): string | null {
    return product.images.find(img => img.mainImage)?.url || null;
  }

  getCategoryName(id: number): string {
    return this.categories().find(c => c.id === id)?.name || 'Sin Categoría';
  }

  private updateProductInList(updated: ProductResponse) {
    this.products.update(list => list.map(p => p.id === updated.id ? updated : p));
  }

  toggleAddVariant() { this.showVariantForm.update(v => !v); }
  toggleAddImage() { this.showImageForm.update(v => !v); }
}
