import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap, map, catchError, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface VariantImageResponse {
  id: number;
  variantId: number;
  url: string;
  position: number;
  mainImage: boolean;
}

// Agregar interfaz
interface ProductImageResponse {
  id: number;
  productId: number;
  url: string;
}

// Actualizar ProductResponseFull
interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  label: string;
  active: boolean;
  categoryId: number;
  variants: VariantResponseFull[];
  labels: LabelResponse[];
  images: ProductImageResponse[]; // 👈 agregar
}

interface VariantResponseFull {
  id: number;
  toneName: string;
  toneCode: string;
  cost: number;
  price: number;
  stock: number;
  position: number;
  active: boolean;
  images: VariantImageResponse[];
}

interface ProductResponseFull {
  id: number;
  name: string;
  description: string;
  fullDescription: string;
  label: string;
  active: boolean;
  categoryId: number;
  variants: VariantResponseFull[];
  labels: LabelResponse[]; // 👈 agrega
}

interface CategoryResponse { id: number; name: string; }
interface LabelResponse    { id: number; name: string; }
interface ImageUploadResponse { id: number; category: string; }

@Component({
  selector: 'app-admin-product-detail',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-product-detail.html',
  styleUrl: './admin-product-detail.scss',
})
export class AdminProductDetail implements OnInit {
  private http   = inject(HttpClient);
  private fb     = inject(FormBuilder);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);


  uploadingProductImage = signal(false);
  selectedProductFile   = signal<File | null>(null);
  productImageInput: HTMLInputElement | null = null;

  private apiUrl       = environment.apiUrl;
  private imageApiBase = environment.apiImageServer;

  // ── Estado ───────────────────────────────────────────────────────────────────
  productId      = signal<number | null>(null);
  product        = signal<ProductResponseFull | null>(null);
  categories     = signal<CategoryResponse[]>([]);
  labels         = signal<LabelResponse[]>([]);
  selectedLabels = signal<number[]>([]);

  isLoading      = signal(true);
  isSaving       = signal(false);
  isEditingBasic = signal(false);

  // ── Variantes ────────────────────────────────────────────────────────────────
  showVariantForm  = signal(false);
  isSavingVariant  = signal(false);
  editingVariant   = signal<VariantResponseFull | null>(null);

  newVariant = { toneName: '', toneCode: '#6366f1', cost: 0, price: 0, stock: 0, position: 1 };

  // ── Imágenes por variante ────────────────────────────────────────────────────
  uploadingVariantId  = signal<number | null>(null);
  selectedFiles: { [variantId: number]: File } = {};

  // ── Formulario producto ──────────────────────────────────────────────────────
  productForm: FormGroup = this.fb.group({
    name:            ['', Validators.required],
    description:     [''],
    fullDescription: [''],
    active:          [true],
    categoryId:      [null, Validators.required]
  });

  ngOnInit() {
    this.loadCategories();
    this.loadLabels();
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.productId.set(id);
        this.loadProduct(id);
      }
    });
  }

  // ── Carga ────────────────────────────────────────────────────────────────────

  loadProduct(id: number) {
  this.isLoading.set(true);
  this.http.get<ProductResponseFull>(`${this.apiUrl}/products/full/${id}`).pipe(
    finalize(() => this.isLoading.set(false)),
    catchError(err => { console.error(err); alert('Error al cargar el producto'); return of(null); })
  ).subscribe(data => {
    if (data) {
      this.product.set(data);
      this.productForm.patchValue(data);
      this.selectedLabels.set(data.labels?.map(l => l.id) ?? []); // 👈 agrega
    }
  });
}

  loadCategories() {
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`).pipe(
      catchError(() => of([]))
    ).subscribe(data => this.categories.set(data));
  }

  loadLabels() {
    this.http.get<LabelResponse[]>(`${this.apiUrl}/labels`).pipe(
      catchError(() => of([]))
    ).subscribe(data => this.labels.set(data));
  }

  // ── Producto básico ──────────────────────────────────────────────────────────

  updateProduct() {
    if (this.productForm.invalid) { alert('Completa los campos obligatorios'); return; }
    this.isSaving.set(true);
    this.productForm.disable();

    const body = { ...this.productForm.getRawValue() };

    this.http.put<ProductResponseFull>(`${this.apiUrl}/products/${this.productId()}`, body).pipe(
      finalize(() => { this.isSaving.set(false); this.productForm.enable(); }),
      catchError(err => { console.error(err); alert('Error al actualizar'); return of(null); })
    ).subscribe(res => {
      if (res) {
        // Mantener variantes del estado local (PUT básico no las devuelve)
        this.product.update(p => ({ ...res, variants: p?.variants || [] }));
        this.saveLabels();
        this.isEditingBasic.set(false);
      }
    });
  }

  saveLabels() {
    const id = this.productId();
    if (!id) return;
    this.http.put(`${this.apiUrl}/products/${id}/labels`, this.selectedLabels()).pipe(
      catchError(err => { console.error(err); alert('Error al guardar labels'); return of(null); })
    ).subscribe();
  }

  deleteProduct() {
    if (!confirm('¿Eliminar este producto de forma permanente?')) return;
    this.http.delete(`${this.apiUrl}/products/${this.productId()}`).pipe(
      catchError(err => { console.error(err); alert('Error al eliminar'); return of(null); })
    ).subscribe(() => this.router.navigate(['/admin/products']));
  }

  // ── Variantes ────────────────────────────────────────────────────────────────

  addVariant() {
    if (!this.newVariant.toneName || !this.newVariant.price) {
      alert('Nombre y precio son obligatorios');
      return;
    }
    this.isSavingVariant.set(true);

    const body = { ...this.newVariant, productId: this.productId() };

    this.http.post<VariantResponseFull>(`${this.apiUrl}/variants`, body).pipe(
      finalize(() => this.isSavingVariant.set(false)),
      catchError(err => { console.error(err); alert('Error al crear variante'); return of(null); })
    ).subscribe(variant => {
      if (variant) {
        this.product.update(p => p
          ? { ...p, variants: [...p.variants, { ...variant, images: [] }] }
          : p
        );
        this.newVariant = { toneName: '', toneCode: '#6366f1', cost: 0, price: 0, stock: 0, position: 1 };
        this.showVariantForm.set(false);
      }
    });
  }

  startEditVariant(variant: VariantResponseFull) {
    this.editingVariant.set({ ...variant });
    this.showVariantForm.set(false);
  }

  cancelEditVariant() {
    this.editingVariant.set(null);
  }

  saveEditVariant() {
    const v = this.editingVariant();
    if (!v) return;
    if (!v.toneName || !v.price) { alert('Nombre y precio son obligatorios'); return; }

    this.isSavingVariant.set(true);

    const body = {
      productId: this.productId(),
      toneName:  v.toneName,
      toneCode:  v.toneCode,
      price:     v.price,
      cost:      v.cost,
      stock:     v.stock,
      position:  v.position,
      active:    v.active
    };

    this.http.put<VariantResponseFull>(`${this.apiUrl}/variants/${v.id}`, body).pipe(
      finalize(() => this.isSavingVariant.set(false)),
      catchError(err => { console.error(err); alert('Error al actualizar variante'); return of(null); })
    ).subscribe(updated => {
      if (updated) {
        this.product.update(p => p
          ? { ...p, variants: p.variants.map(pv => pv.id === updated.id ? { ...updated, images: pv.images } : pv) }
          : p
        );
        this.editingVariant.set(null);
      }
    });
  }

  deleteVariant(variantId: number) {
    if (!confirm('¿Eliminar esta variante?')) return;
    this.http.delete(`${this.apiUrl}/variants/${variantId}`).pipe(
      catchError(err => { console.error(err); alert('Error al eliminar variante'); return of(null); })
    ).subscribe(() => {
      this.product.update(p => p
        ? { ...p, variants: p.variants.filter(v => v.id !== variantId) }
        : p
      );
    });
  }

  // ── Imágenes de variante ─────────────────────────────────────────────────────

  onFileSelected(event: Event, variantId: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedFiles[variantId] = file;
  }

  uploadVariantImage(variant: VariantResponseFull) {
    const file = this.selectedFiles[variant.id];
    if (!file) return;

    this.uploadingVariantId.set(variant.id);
    const formData = new FormData();
    formData.append('category', 'products');
    formData.append('file', file);

    this.http.post<ImageUploadResponse>(`${this.imageApiBase}/images`, formData).pipe(
      switchMap(res => {
        const hasMain = variant.images?.some(i => i.mainImage);
        const body = {
          variantId: variant.id,
          url:       `${this.imageApiBase}/images/${res.id}/file`,
          position:  (variant.images?.length || 0) + 1,
          mainImage: !hasMain
        };
        return this.http.post<VariantImageResponse>(`${this.apiUrl}/variant-images`, body);
      }),
      finalize(() => this.uploadingVariantId.set(null)),
      catchError(err => { console.error(err); alert('Error al subir imagen'); return of(null); })
    ).subscribe(img => {
      if (img) {
        this.product.update(p => p ? {
          ...p,
          variants: p.variants.map(v =>
            v.id === variant.id ? { ...v, images: [...(v.images || []), img] } : v
          )
        } : p);
        delete this.selectedFiles[variant.id];
      }
    });
  }

  setMainImage(variantId: number, image: VariantImageResponse) {
    const body = { variantId, url: image.url, position: image.position, mainImage: true };
    this.http.put<VariantImageResponse>(`${this.apiUrl}/variant-images/${image.id}`, body).pipe(
      catchError(err => { console.error(err); return of(null); })
    ).subscribe(updated => {
      if (updated) {
        this.product.update(p => p ? {
          ...p,
          variants: p.variants.map(v =>
            v.id === variantId
              ? { ...v, images: v.images.map(i => ({ ...i, mainImage: i.id === image.id })) }
              : v
          )
        } : p);
      }
    });
  }

  deleteVariantImage(variantId: number, imageId: number) {
    if (!confirm('¿Eliminar imagen?')) return;
    this.http.delete(`${this.apiUrl}/variant-images/${imageId}`).pipe(
      catchError(err => { console.error(err); alert('Error al eliminar imagen'); return of(null); })
    ).subscribe(() => {
      this.product.update(p => p ? {
        ...p,
        variants: p.variants.map(v =>
          v.id === variantId ? { ...v, images: v.images.filter(i => i.id !== imageId) } : v
        )
      } : p);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  toggleLabel(id: number) {
    this.selectedLabels.update(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]);
  }
  isLabelSelected(id: number) { return this.selectedLabels().includes(id); }
  goBack() { this.router.navigate(['/admin/products']); }

  sortedVariants = computed(() =>
  [...(this.product()?.variants ?? [])].sort((a, b) => {
    const posA = a.position ?? Infinity;
    const posB = b.position ?? Infinity;
    return posA - posB;
  })
);

// ── Imágenes del producto ────────────────────────────────────────────────────

onProductFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) this.selectedProductFile.set(file);
}

uploadProductImage() {
  const file = this.selectedProductFile();
  if (!file) return;

  this.uploadingProductImage.set(true);
  const formData = new FormData();
  formData.append('category', 'products');
  formData.append('file', file);

  this.http.post<ImageUploadResponse>(`${this.imageApiBase}/images`, formData).pipe(
    switchMap(res => {
      const body = [{ url: `${this.imageApiBase}/images/${res.id}/file` }];
      return this.http.post<ProductImageResponse[]>(
        `${this.apiUrl}/products/${this.productId()}/images`, body
      );
    }),
    finalize(() => this.uploadingProductImage.set(false)),
    catchError(err => { console.error(err); alert('Error al subir imagen'); return of(null); })
  ).subscribe(imgs => {
    if (imgs) {
      this.product.update(p => p
        ? { ...p, images: [...(p.images || []), ...imgs] }
        : p
      );
      this.selectedProductFile.set(null);
    }
  });
}

deleteProductImage(imageId: number) {
  if (!confirm('¿Eliminar imagen del producto?')) return;
  this.http.delete(`${this.apiUrl}/products/${this.productId()}/images/${imageId}`).pipe(
    catchError(err => { console.error(err); alert('Error al eliminar imagen'); return of(null); })
  ).subscribe(() => {
    this.product.update(p => p
      ? { ...p, images: p.images.filter(i => i.id !== imageId) }
      : p
    );
  });
}
}