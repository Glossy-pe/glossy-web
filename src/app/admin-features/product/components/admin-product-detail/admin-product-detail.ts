import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap, map } from 'rxjs';


// --- Configuración de Entorno (Ajustar según tu proyecto) ---
const environment = {
  apiUrl: 'http://localhost:8080', 
  apiImageServer: 'http://localhost:8000'
};

// --- Interfaces ---
interface ProductImage {
  id: number;
  url: string;
  position: number;
  mainImage: boolean;
}

interface ProductVariant {
  id: number;
  toneName: string;
  toneCode: string;
  price: number;
  stock: number;
}

interface ProductResponse {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  images: ProductImage[];
  active: boolean;
  label: string;
  categoryId: number;
  variants: ProductVariant[];
}

interface CategoryResponse {
  id: number;
  name: string;
}


@Component({
  selector: 'app-admin-product-detail',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  providers: [CurrencyPipe],
  templateUrl: './admin-product-detail.html',
  styleUrl: './admin-product-detail.scss',
})
export class AdminProductDetail {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private apiUrl = environment.apiUrl;
  private imageApiBase = environment.apiImageServer;

  productId = signal<number | null>(null);
  product = signal<ProductResponse | null>(null);
  categories = signal<CategoryResponse[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isEditingBasic = signal<boolean>(false);
  showVariantForm = signal<boolean>(false);

  newVariant = { toneName: '', toneCode: '#6366f1', price: 0, stock: 0 };
  selectedFile: File | null = null;
  selectedFileName = signal<string>('');

  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    fullDescription: [''],
    label: [''],
    active: [true],
    categoryId: [null, [Validators.required]]
  });

  ngOnInit() {
    this.loadCategories();
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.productId.set(id);
        this.loadProductData(id);
      }
    });
  }

  loadProductData(id: number) {
    this.isLoading.set(true);
    this.http.get<ProductResponse>(`${this.apiUrl}/products/${id}`)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(data => {
        this.product.set(data);
        this.productForm.patchValue(data);
      });
  }

  loadCategories() {
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`)
      .subscribe(data => this.categories.set(data));
  }

  updateProduct() {
    if (this.productForm.invalid) return;
    this.isSaving.set(true);
    this.http.put<ProductResponse>(`${this.apiUrl}/products/${this.productId()}`, this.productForm.value)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe(res => {
        this.product.set(res);
        this.isEditingBasic.set(false);
      });
  }

  saveVariant() {
    if (!this.newVariant.toneName) return;
    this.isSaving.set(true);
    this.http.post<ProductResponse>(`${this.apiUrl}/products/${this.productId()}/variants`, this.newVariant)
      .pipe(
        switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${this.productId()}`)),
        finalize(() => {
          this.isSaving.set(false);
          this.showVariantForm.set(false);
        })
      )
      .subscribe(res => {
        this.product.set(res);
        this.newVariant = { toneName: '', toneCode: '#6366f1', price: 0, stock: 0 };
      });
  }

  deleteVariant(vId: number) {
    if (!confirm('¿Eliminar esta variante?')) return;
    this.http.delete(`${this.apiUrl}/products/${this.productId()}/variants/${vId}`)
      .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${this.productId()}`)))
      .subscribe(res => this.product.set(res));
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName.set(file.name);
    }
  }

  uploadImage() {
    if (!this.selectedFile) return;
    this.isSaving.set(true);
    
    const formData = new FormData();
    formData.append('category', 'products');
    formData.append('file', this.selectedFile);

    this.http.post<{id: number}>(`${this.imageApiBase}/images`, formData).pipe(
      map(res => `${this.imageApiBase}/images/${res.id}/file`),
      switchMap(url => this.http.post(`${this.apiUrl}/products/${this.productId()}/images`, {
        url, position: 1, mainImage: (this.product()?.images.length === 0)
      })),
      switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${this.productId()}`)),
      finalize(() => {
        this.isSaving.set(false);
        this.selectedFile = null;
        this.selectedFileName.set('');
      })
    ).subscribe(res => this.product.set(res));
  }

  setImageAsMain(img: ProductImage) {
    this.http.put(`${this.apiUrl}/products/${this.productId()}/images/${img.id}`, { ...img, mainImage: true })
      .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${this.productId()}`)))
      .subscribe(res => this.product.set(res));
  }

  deleteImage(imgId: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    this.http.delete(`${this.apiUrl}/products/${this.productId()}/images/${imgId}`)
      .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${this.productId()}`)))
      .subscribe(res => this.product.set(res));
  }

  deleteProduct() {
    if (!confirm('¿Seguro que deseas eliminar este producto de forma permanente?')) return;
    this.http.delete(`${this.apiUrl}/products/${this.productId()}`).subscribe(() => {
      this.router.navigate(['/admin/products']);
    });
  }

  goBack() {
    this.router.navigate(['/admin/products']);
  }
}