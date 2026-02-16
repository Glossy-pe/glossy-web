import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap, map, forkJoin, of, catchError } from 'rxjs';
import { environment } from '../../../../../environments/environment';

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

interface LabelResponse {
  id: number;
  name: string;
}

interface ProductResponseV2 {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  images: ProductImage[];
  active: boolean;
  categoryId: number;
  variants: ProductVariant[];
  labels: LabelResponse[];
}

interface CategoryResponse {
  id: number;
  name: string;
}

interface ImageUploadResponse {
  id: number;
  category: string;
}

@Component({
  selector: 'app-admin-product-detail',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  providers: [CurrencyPipe],
  templateUrl: './admin-product-detail.html',
  styleUrl: './admin-product-detail.scss',
})
export class AdminProductDetail implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private apiUrl = environment.apiUrl;
  private imageApiBase = environment.apiImageServer;

  productId = signal<number | null>(null);
  product = signal<ProductResponseV2 | null>(null);
  categories = signal<CategoryResponse[]>([]);
  labels = signal<LabelResponse[]>([]);
  selectedLabels = signal<number[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isEditingBasic = signal<boolean>(false);
  showVariantForm = signal<boolean>(false);
  showImageForm = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);

  newVariant = { toneName: '', toneCode: '#6366f1', price: 0, stock: 0 };
  selectedFile: File | null = null;
  selectedFileName = signal<string>('');
  imagePreview = signal<string>('');

  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    fullDescription: [''],
    active: [true],
    categoryId: [null, [Validators.required]]
  });

  ngOnInit() {
    this.loadCategories();
    this.loadLabels();
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
    this.http.get<ProductResponseV2>(`${this.apiUrl}/products/${id}`)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError(err => {
          console.error('Error cargando producto:', err);
          alert('Error al cargar el producto');
          return of(null);
        })
      )
      .subscribe(data => {
        if (data) {
          this.product.set(data);
          this.productForm.patchValue(data);
          this.selectedLabels.set(data.labels?.map(l => l.id) || []);
        }
      });
  }

  loadCategories() {
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`)
      .pipe(
        catchError(err => {
          console.error('Error cargando categorías:', err);
          return of([]);
        })
      )
      .subscribe(data => this.categories.set(data));
  }

  loadLabels() {
    this.http.get<LabelResponse[]>(`${this.apiUrl}/labels`)
      .pipe(
        catchError(err => {
          console.error('Error cargando labels:', err);
          return of([]);
        })
      )
      .subscribe(data => this.labels.set(data));
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

  updateProduct() {
    if (this.productForm.invalid) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    this.isSaving.set(true);
    this.productForm.disable();

    const currentProduct = this.product();
    if (!currentProduct) return;

    const updateRequest = {
      ...this.productForm.getRawValue(),
      images: currentProduct.images.map(img => ({
        url: img.url,
        position: img.position,
        mainImage: img.mainImage
      })),
      variants: currentProduct.variants.map(v => ({
        toneName: v.toneName,
        toneCode: v.toneCode,
        price: v.price,
        stock: v.stock
      })),
      labelsIds: this.selectedLabels()
    };

    this.http.put<ProductResponseV2>(`${this.apiUrl}/products/${this.productId()}`, updateRequest)
      .pipe(
        finalize(() => {
          this.isSaving.set(false);
          this.productForm.enable();
        }),
        catchError(err => {
          console.error('Error actualizando producto:', err);
          alert('Error al actualizar el producto');
          return of(null);
        })
      )
      .subscribe(res => {
        if (res) {
          this.product.set(res);
          this.isEditingBasic.set(false);
          alert('Producto actualizado exitosamente');
        }
      });
  }

  saveVariant() {
    if (!this.newVariant.toneName || !this.newVariant.price) {
      alert('Por favor completa el nombre y precio de la variante');
      return;
    }

    this.isSaving.set(true);
    
    const currentProduct = this.product();
    if (!currentProduct) return;

    const updatedVariants = [
      ...currentProduct.variants.map(v => ({
        toneName: v.toneName,
        toneCode: v.toneCode,
        price: v.price,
        stock: v.stock
      })),
      {
        toneName: this.newVariant.toneName,
        toneCode: this.newVariant.toneCode,
        price: this.newVariant.price,
        stock: this.newVariant.stock
      }
    ];

    const updateRequest = {
      ...this.productForm.getRawValue(),
      images: currentProduct.images.map(img => ({
        url: img.url,
        position: img.position,
        mainImage: img.mainImage
      })),
      variants: updatedVariants,
      labelsIds: this.selectedLabels()
    };

    this.http.put<ProductResponseV2>(`${this.apiUrl}/products/${this.productId()}`, updateRequest)
      .pipe(
        finalize(() => {
          this.isSaving.set(false);
          this.showVariantForm.set(false);
        }),
        catchError(err => {
          console.error('Error guardando variante:', err);
          alert('Error al guardar la variante');
          return of(null);
        })
      )
      .subscribe(res => {
        if (res) {
          this.product.set(res);
          this.newVariant = { toneName: '', toneCode: '#6366f1', price: 0, stock: 0 };
          alert('Variante agregada exitosamente');
        }
      });
  }

  deleteVariant(index: number) {
    if (!confirm('¿Eliminar esta variante?')) return;

    const currentProduct = this.product();
    if (!currentProduct) return;

    const updatedVariants = currentProduct.variants
      .filter((_, i) => i !== index)
      .map(v => ({
        toneName: v.toneName,
        toneCode: v.toneCode,
        price: v.price,
        stock: v.stock
      }));

    const updateRequest = {
      ...this.productForm.getRawValue(),
      images: currentProduct.images.map(img => ({
        url: img.url,
        position: img.position,
        mainImage: img.mainImage
      })),
      variants: updatedVariants,
      labelsIds: this.selectedLabels()
    };

    this.http.put<ProductResponseV2>(`${this.apiUrl}/products/${this.productId()}`, updateRequest)
      .pipe(
        catchError(err => {
          console.error('Error eliminando variante:', err);
          alert('Error al eliminar la variante');
          return of(null);
        })
      )
      .subscribe(res => {
        if (res) {
          this.product.set(res);
          alert('Variante eliminada exitosamente');
        }
      });
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

  uploadImage() {
    if (!this.selectedFile) return;
    
    this.isUploadingImage.set(true);
    
    const formData = new FormData();
    formData.append('category', 'products');
    formData.append('file', this.selectedFile);

    this.http.post<ImageUploadResponse>(`${this.imageApiBase}/images`, formData).pipe(
      map(res => `${this.imageApiBase}/images/${res.id}/file`),
      switchMap(url => {
        const currentProduct = this.product();
        if (!currentProduct) return of(null);

        const updatedImages = [
          ...currentProduct.images.map(img => ({
            url: img.url,
            position: img.position,
            mainImage: img.mainImage
          })),
          {
            url: url,
            position: currentProduct.images.length + 1,
            mainImage: currentProduct.images.length === 0
          }
        ];

        const updateRequest = {
          ...this.productForm.getRawValue(),
          images: updatedImages,
          variants: currentProduct.variants.map(v => ({
            toneName: v.toneName,
            toneCode: v.toneCode,
            price: v.price,
            stock: v.stock
          })),
          labelsIds: this.selectedLabels()
        };

        return this.http.put<ProductResponseV2>(`${this.apiUrl}/products/${this.productId()}`, updateRequest);
      }),
      finalize(() => {
        this.isUploadingImage.set(false);
        this.selectedFile = null;
        this.selectedFileName.set('');
        this.imagePreview.set('');
      }),
      catchError(err => {
        console.error('Error subiendo imagen:', err);
        alert('Error al subir la imagen');
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        this.product.set(res);
        alert('Imagen agregada exitosamente');
      }
    });
  }

  setImageAsMain(index: number) {
    const currentProduct = this.product();
    if (!currentProduct) return;

    const updatedImages = currentProduct.images.map((img, i) => ({
      url: img.url,
      position: img.position,
      mainImage: i === index
    }));

    const updateRequest = {
      ...this.productForm.getRawValue(),
      images: updatedImages,
      variants: currentProduct.variants.map(v => ({
        toneName: v.toneName,
        toneCode: v.toneCode,
        price: v.price,
        stock: v.stock
      })),
      labelsIds: this.selectedLabels()
    };

    this.http.put<ProductResponseV2>(`${this.apiUrl}/products/${this.productId()}`, updateRequest)
      .pipe(
        catchError(err => {
          console.error('Error actualizando imagen principal:', err);
          alert('Error al actualizar la imagen principal');
          return of(null);
        })
      )
      .subscribe(res => {
        if (res) {
          this.product.set(res);
        }
      });
  }

  deleteImage(index: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;

    const currentProduct = this.product();
    if (!currentProduct) return;

    const updatedImages = currentProduct.images
      .filter((_, i) => i !== index)
      .map((img, i) => ({
        url: img.url,
        position: i + 1,
        mainImage: i === 0 && currentProduct.images[index].mainImage ? true : img.mainImage
      }));

    const updateRequest = {
      ...this.productForm.getRawValue(),
      images: updatedImages,
      variants: currentProduct.variants.map(v => ({
        toneName: v.toneName,
        toneCode: v.toneCode,
        price: v.price,
        stock: v.stock
      })),
      labelsIds: this.selectedLabels()
    };

    this.http.put<ProductResponseV2>(`${this.apiUrl}/products/${this.productId()}`, updateRequest)
      .pipe(
        catchError(err => {
          console.error('Error eliminando imagen:', err);
          alert('Error al eliminar la imagen');
          return of(null);
        })
      )
      .subscribe(res => {
        if (res) {
          this.product.set(res);
          alert('Imagen eliminada exitosamente');
        }
      });
  }

  deleteProduct() {
    if (!confirm('¿Seguro que deseas eliminar este producto de forma permanente?')) return;
    
    this.http.delete(`${this.apiUrl}/products/${this.productId()}`)
      .pipe(
        catchError(err => {
          console.error('Error eliminando producto:', err);
          alert('Error al eliminar el producto');
          return of(null);
        })
      )
      .subscribe(res => {
        if (res !== null) {
          this.router.navigate(['/admin/products']);
        }
      });
  }

  goBack() {
    this.router.navigate(['/admin/products']);
  }
}