import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormsModule } from '@angular/forms';
import { catchError, finalize, of, forkJoin, switchMap, map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Router } from '@angular/router';

interface ProductResponseV2 {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  images: ProductImageResponse[];
  active: boolean;
  categoryId: number;
  variants: ProductVariantResponse[];
  labels: LabelResponse[];
}

interface ProductImageResponse {
  id: number;
  url: string;
  position: number;
  mainImage: boolean;
  productId: number;
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

interface LabelResponse {
  id: number;
  name: string;
}

interface ImageUploadResponse {
  id: number;
  category: string;
}

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule, ],
  providers: [CurrencyPipe],
  templateUrl: './admin-product-list.html',
  styleUrl: './admin-product-list.scss'
})
export class AdminProductList implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  private apiUrl = environment.apiUrl;
  private imageApiBase = environment.apiImageServer;

  products = signal<ProductResponseV2[]>([]);
  categories = signal<CategoryResponse[]>([]);
  labels = signal<LabelResponse[]>([]);
  labelFilter = signal<string>('');
  showCreateForm = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoadingProducts = signal<boolean>(false);
  isLoadingCategories = signal<boolean>(false);
  isLoadingLabels = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);

  selectedFile: File | null = null;
  selectedFileName = signal<string>('');
  imagePreview = signal<string>('');
  tempVariants = signal<any[]>([]);
  tempImages = signal<any[]>([]);
  selectedLabels = signal<number[]>([]);

  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    fullDescription: [''],
    active: [true],
    categoryId: [null, [Validators.required]]
  });

  filteredProducts = computed(() => {
    const f = this.labelFilter().toLowerCase();
    const list = this.products();
    if (!f) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(f) ||
      p.labels?.some(l => l.name.toLowerCase().includes(f)) ||
      this.getCategoryName(p.categoryId).toLowerCase().includes(f)
    );
  });

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadLabels();
  }

  private uploadFile(file: File): Observable<string> {
    this.isUploadingImage.set(true);
    const formData = new FormData();
    formData.append('category', 'products');
    formData.append('file', file);

    return this.http.post<ImageUploadResponse>(`${this.imageApiBase}/images`, formData).pipe(
      map(res => `${this.imageApiBase}/images/${res.id}/file`),
      catchError(() => of("https://placehold.co/600x800?text=Sin+Imagen")),
      finalize(() => this.isUploadingImage.set(false))
    );
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName.set(file.name);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  addImageToList() {
    if (!this.selectedFile) return;

    const preview = URL.createObjectURL(this.selectedFile);
    const hasMain = this.tempImages().some(img => img.mainImage);

    this.tempImages.update(imgs => [...imgs, {
      file: this.selectedFile,
      preview,
      mainImage: !hasMain,
      position: imgs.length + 1
    }]);

    this.selectedFile = null;
    this.selectedFileName.set('');
    this.imagePreview.set('');
  }

  removeImageFromList(idx: number) {
    this.tempImages.update(imgs => {
      const newList = imgs.filter((_, i) => i !== idx);
      if (imgs[idx].mainImage && newList.length > 0) newList[0].mainImage = true;
      return newList.map((img, i) => ({ ...img, position: i + 1 }));
    });
  }

  setMainInTemp(idx: number) {
    this.tempImages.update(imgs => imgs.map((img, i) => ({ ...img, mainImage: i === idx })));
  }

  toggleLabel(labelId: number) {
    this.selectedLabels.update(labels => {
      if (labels.includes(labelId)) {
        return labels.filter(id => id !== labelId);
      } else {
        return [...labels, labelId];
      }
    });
  }

  isLabelSelected(labelId: number): boolean {
    return this.selectedLabels().includes(labelId);
  }

  saveProduct() {
    if (this.productForm.invalid) {
      alert('Por favor completa los campos obligatorios: Nombre y Categoría');
      return;
    }

    this.isSaving.set(true);
    this.productForm.disable();

    const imageUploadTasks = this.tempImages().map(ti => this.uploadFile(ti.file));

    if (imageUploadTasks.length === 0) {
      // Sin imágenes, crear producto directamente
      const productRequest = {
        ...this.productForm.getRawValue(),
        images: [],
        variants: this.tempVariants().map(v => ({
          toneName: v.toneName,
          toneCode: v.toneCode,
          price: v.price,
          stock: v.stock
        })),
        labelsIds: this.selectedLabels()
      };

      this.http.post<ProductResponseV2>(`${this.apiUrl}/products`, productRequest).pipe(
        finalize(() => {
          this.isSaving.set(false);
          this.productForm.enable();
        }),
        catchError(err => {
          console.error('Error guardando producto:', err);
          alert('Error al guardar el producto');
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          this.loadProducts();
          this.resetForm();
          alert('Producto creado exitosamente');
        }
      });
    } else {
      // Con imágenes
      forkJoin(imageUploadTasks).pipe(
        switchMap((uploadedUrls: string[]) => {
          const productRequest = {
            ...this.productForm.getRawValue(),
            images: uploadedUrls.map((url, index) => ({
              url: url,
              position: this.tempImages()[index].position,
              mainImage: this.tempImages()[index].mainImage
            })),
            variants: this.tempVariants().map(v => ({
              toneName: v.toneName,
              toneCode: v.toneCode,
              price: v.price,
              stock: v.stock
            })),
            labelsIds: this.selectedLabels()
          };

          return this.http.post<ProductResponseV2>(`${this.apiUrl}/products`, productRequest);
        }),
        finalize(() => {
          this.isSaving.set(false);
          this.productForm.enable();
        }),
        catchError(err => {
          console.error('Error guardando producto:', err);
          alert('Error al guardar el producto');
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          this.loadProducts();
          this.resetForm();
          alert('Producto creado exitosamente');
        }
      });
    }
  }

  deleteProduct(id: number) {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;

    this.http.delete(`${this.apiUrl}/products/${id}`).pipe(
      catchError(err => {
        console.error('Error eliminando producto:', err);
        alert('Error al eliminar el producto');
        return of(null);
      })
    ).subscribe(res => {
      if (res !== null) {
        this.products.update(l => l.filter(p => p.id !== id));
        alert('Producto eliminado exitosamente');
      }
    });
  }

  loadProducts() {
    this.isLoadingProducts.set(true);
    this.http.get<ProductResponseV2[]>(`${this.apiUrl}/products`)
      .pipe(
        finalize(() => this.isLoadingProducts.set(false)),
        catchError(err => {
          console.error('Error cargando productos:', err);
          return of([]);
        })
      )
      .subscribe(data => this.products.set(data));
  }

  loadCategories() {
    this.isLoadingCategories.set(true);
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`)
      .pipe(
        finalize(() => this.isLoadingCategories.set(false)),
        catchError(err => {
          console.error('Error cargando categorías:', err);
          return of([]);
        })
      )
      .subscribe(data => this.categories.set(data));
  }

  loadLabels() {
    this.isLoadingLabels.set(true);
    this.http.get<LabelResponse[]>(`${this.apiUrl}/labels`)
      .pipe(
        finalize(() => this.isLoadingLabels.set(false)),
        catchError(err => {
          console.error('Error cargando labels:', err);
          return of([]);
        })
      )
      .subscribe(data => this.labels.set(data));
  }

  selectProduct(p: ProductResponseV2) {
    this.router.navigate([`/admin/products/${p.id}`]);
  }

  addVariantToList(name: string, code: string, price: string, stock: string) {
    if (!name || !price) {
      alert('Nombre y precio son obligatorios');
      return;
    }

    this.tempVariants.update(v => [...v, {
      toneName: name,
      toneCode: code || '#000000',
      price: +price,
      stock: +stock || 0
    }]);
  }

  removeVariantFromList(idx: number) {
    this.tempVariants.update(v => v.filter((_, i) => i !== idx));
  }

  toggleCreateForm() {
    this.showCreateForm.update(v => !v);
    if (!this.showCreateForm()) this.resetForm();
  }

  resetForm() {
    this.showCreateForm.set(false);
    this.productForm.reset({ active: true });
    this.tempVariants.set([]);
    this.tempImages.set([]);
    this.selectedLabels.set([]);
    this.selectedFile = null;
    this.selectedFileName.set('');
    this.imagePreview.set('');
  }

  updateFilter(e: Event) {
    this.labelFilter.set((e.target as HTMLInputElement).value);
  }

  getMainImage(p: ProductResponseV2) {
    return p.images.find(i => i.mainImage)?.url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23e2e8f0" width="150" height="150"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="14"%3ESin imagen%3C/text%3E%3C/svg%3E';
  }

  getTotalStock(p: ProductResponseV2) {
    return p.variants?.reduce((a, v) => a + v.stock, 0) || 0;
  }

  getCategoryName(id: number) {
    return this.categories().find(c => c.id === id)?.name || 'N/A';
  }
}
