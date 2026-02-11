import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, ViewChild, effect, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl, FormsModule } from '@angular/forms';
import { catchError, finalize, of, forkJoin, switchMap, map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { MATERIAL_IMPORTS } from '../../../../material.imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ProductService } from '../../../../features/product/services/product.service';
import { Product } from '../../../../features/product/models/product.model';
import { Route, Router } from '@angular/router';

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

interface ImageUploadResponse {
  id: number;
  category: string;
}

@Component({
  selector: 'app-admin-product-list',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule, ...MATERIAL_IMPORTS],
  providers: [CurrencyPipe],
  templateUrl: './admin-product-list.html',
  styleUrl: './admin-product-list.scss',
})

export class AdminProductList implements OnInit, AfterViewInit {

  searchName: string = '';
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  displayedColumns: string[] = ['id', 'name', 'image', 'actions'];
  loadedProducts$!: Observable<Product[]>;
  // dataSource = new MatTableDataSource<ProductResponse>();
  // @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    // this.dataSource.paginator = this.paginator;

    // effect(() => {
    //   this.dataSource.data = this.filteredProducts();
    // });
  }

  search() {
    this.pageIndex = 0; // resetear a primera página
    this.loadAllProducts();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAllProducts();
  }
  
  constructor(private productService: ProductService, private router: Router){

  }

  loadAllProducts(){
    const loadedProducts$ = this.productService.getProducts();
    this.loadedProducts$ = loadedProducts$;
  }

  editProduct(productId: Number){
    this.router.navigate([`admin/products/${productId}`]);
  }


  /* SECCION ANTERIOR */

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  
  // Estas URLs deben coincidir con tu entorno
  private apiUrl = environment.apiUrl; 
  private imageApiBase = environment.apiImageServer;

  // --- Estados reactivos (Signals) ---
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  labelFilter = signal<string>('');
  showCreateForm = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoadingProducts = signal<boolean>(false);
  selectedProduct = signal<ProductResponse | null>(null);

  selectedFile: File | null = null;
  selectedFileName = signal<string>('');
  tempVariants = signal<any[]>([]);
  tempImages = signal<any[]>([]); 

  isEditingBasic = signal<boolean>(false);
  showVariantFormInModal = signal<boolean>(false);
  showImageFormInModal = signal<boolean>(false);

  newVariant = { toneName: '', toneCode: '#6366f1', price: 0, stock: 0 };

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
    categoryId: [null, [Validators.required]],
    description: [''],
    fullDescription: [''],
    label: [''],
    active: [true]
  });

  // --- Getters para tipado estricto en el template ---
  get basicEditNameControl(): FormControl { return this.basicEditForm.get('name') as FormControl; }
  get basicEditCategoryControl(): FormControl { return this.basicEditForm.get('categoryId') as FormControl; }

  filteredProducts = computed(() => {
    const f = this.labelFilter().toLowerCase();
    const list = this.products();
    if (!f) return list;
    return list.filter(p => 
      p.name.toLowerCase().includes(f) || 
      p.label?.toLowerCase().includes(f) ||
      this.getCategoryName(p.categoryId).toLowerCase().includes(f)
    );
  });

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadAllProducts();
  }

  // --- Lógica de Archivos ---

  private uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('category', 'products');
    formData.append('file', file);
    // Cambia la URL según el endpoint real de tu servidor de imágenes
    return this.http.post<ImageUploadResponse>(`${this.imageApiBase}/images`, formData).pipe(
      map(res => `${this.imageApiBase}/images/${res.id}/file`),
      catchError(() => of("https://via.placeholder.com/600x800?text=Imagen+No+Disponible"))
    );
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName.set(file.name);
    }
  }

  addImageToList() {
    if (!this.selectedFile) return;
    const preview = URL.createObjectURL(this.selectedFile);
    const hasMain = this.tempImages().some(img => img.mainImage);
    this.tempImages.update(imgs => [...imgs, { file: this.selectedFile, preview, mainImage: !hasMain }]);
    this.selectedFile = null;
    this.selectedFileName.set('');
  }

  removeImageFromList(idx: number) {
    this.tempImages.update(imgs => {
      const newList = imgs.filter((_, i) => i !== idx);
      if (imgs[idx].mainImage && newList.length > 0) newList[0].mainImage = true;
      return newList;
    });
  }

  setMainInTemp(idx: number) {
    this.tempImages.update(imgs => imgs.map((img, i) => ({ ...img, mainImage: i === idx })));
  }

  // --- CRUD Producto Completo ---

  saveProduct() {
    if (this.productForm.invalid) return;
    this.isSaving.set(true);

    this.http.post<ProductResponse>(`${this.apiUrl}/products`, this.productForm.value).pipe(
      switchMap(prod => {
        // Tareas de imágenes: Subir archivo -> Enlazar con producto
        const imgTasks = this.tempImages().map(ti => 
          this.uploadFile(ti.file).pipe(
            switchMap(url => this.http.post(`${this.apiUrl}/products/${prod.id}/images`, {
              url, position: 1, mainImage: ti.mainImage
            }))
          )
        );

        // Tareas de variantes
        const varTasks = this.tempVariants().map(v => 
          this.http.post(`${this.apiUrl}/products/${prod.id}/variants`, v)
        );

        const allTasks = [...imgTasks, ...varTasks];
        if (allTasks.length === 0) return of(prod);

        return forkJoin(allTasks).pipe(
          switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${prod.id}`))
        );
      }),
      finalize(() => this.isSaving.set(false)),
      catchError(() => of(null))
    ).subscribe(res => {
      if (res) {
        this.loadProducts();
        this.resetForm();
      }
    });
  }

  // updateProductBasic() {
  //   const p = this.selectedProduct();
  //   if (!p || this.basicEditForm.invalid) return;
  //   this.isSaving.set(true);

  //   this.http.put<ProductResponse>(`${this.apiUrl}/products/${p.id}`, this.basicEditForm.value)
  //     .pipe(finalize(() => this.isSaving.set(false)))
  //     .subscribe(res => {
  //       this.updateLocalProduct(res);
  //       this.selectedProduct.set(res);
  //       this.isEditingBasic.set(false);
  //     });
  // }

  deleteProduct(id: number) {
    if (!confirm('¿Seguro que deseas eliminar este registro maestro?')) return;
    this.http.delete(`${this.apiUrl}/products/${id}`).subscribe(() => {
      this.products.update(l => l.filter(p => p.id !== id));
      if (this.selectedProduct()?.id === id) this.selectedProduct.set(null);
    });
  }

  // --- CRUD Variantes Modal ---

  // saveVariant() {
  //   const p = this.selectedProduct();
  //   if (!p) return;
  //   this.isSaving.set(true);
  //   this.http.post(`${this.apiUrl}/products/${p.id}/variants`, this.newVariant)
  //     .pipe(
  //       switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)),
  //       finalize(() => this.isSaving.set(false))
  //     )
  //     .subscribe(res => {
  //       this.updateLocalProduct(res);
  //       this.selectedProduct.set(res);
  //       this.showVariantFormInModal.set(false);
  //       this.newVariant = { toneName: '', toneCode: '#6366f1', price: 0, stock: 0 };
  //     });
  // }

  // deleteVariant(vId: number) {
  //   const p = this.selectedProduct();
  //   if (!p) return;
  //   this.http.delete(`${this.apiUrl}/products/${p.id}/variants/${vId}`)
  //     .pipe(switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)))
  //     .subscribe(res => {
  //       this.updateLocalProduct(res);
  //       this.selectedProduct.set(res);
  //     });
  // }

  // --- Galería Modal ---

  // uploadAndAddImage(main: boolean) {
  //   const p = this.selectedProduct();
  //   if (!p || !this.selectedFile) return;
  //   this.isSaving.set(true);
    
  //   this.uploadFile(this.selectedFile).pipe(
  //     switchMap(url => this.http.post(`${this.apiUrl}/products/${p.id}/images`, { url, position: 1, mainImage: main })),
  //     switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)),
  //     finalize(() => this.isSaving.set(false))
  //   ).subscribe(res => {
  //     this.updateLocalProduct(res);
  //     this.selectedProduct.set(res);
  //     this.showImageFormInModal.set(false);
  //     this.selectedFile = null;
  //     this.selectedFileName.set('');
  //   });
  // }

  // setImageAsMain(img: ProductImageResponse) {
  //   const p = this.selectedProduct();
  //   if (!p) return;
  //   this.isSaving.set(true);
  //   this.http.put(`${this.apiUrl}/products/${p.id}/images/${img.id}`, { ...img, mainImage: true })
  //     .pipe(
  //       switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)),
  //       finalize(() => this.isSaving.set(false))
  //     )
  //     .subscribe(res => {
  //       this.updateLocalProduct(res);
  //       this.selectedProduct.set(res);
  //     });
  // }

  // deleteImage(imgId: number) {
  //   const p = this.selectedProduct();
  //   if (!p) return;
  //   this.isSaving.set(true);
  //   this.http.delete(`${this.apiUrl}/products/${p.id}/images/${imgId}`)
  //     .pipe(
  //       switchMap(() => this.http.get<ProductResponse>(`${this.apiUrl}/products/${p.id}`)),
  //       finalize(() => this.isSaving.set(false))
  //     )
  //     .subscribe(res => {
  //       this.updateLocalProduct(res);
  //       this.selectedProduct.set(res);
  //     });
  // }

  // --- Helpers UI ---

  loadProducts() {
    this.isLoadingProducts.set(true);
    this.http.get<ProductResponse[]>(`${this.apiUrl}/products`)
      .pipe(finalize(() => this.isLoadingProducts.set(false)))
      .subscribe(data => this.products.set(data));
  }

  loadCategories() {
    this.http.get<CategoryResponse[]>(`${this.apiUrl}/categories`).subscribe(data => this.categories.set(data));
  }

  selectProduct(p: ProductResponse) {
    this.router.navigate([`/admin/products/${p.id}`])
    
    // this.selectedProduct.set(p);
    // this.isEditingBasic.set(false);
    // this.showVariantFormInModal.set(false);
    // this.showImageFormInModal.set(false);
    
    // this.basicEditForm.patchValue({ 
    //   name: p.name, 
    //   categoryId: p.categoryId,
    //   description: p.description,
    //   label: p.label,
    //   active: p.active
    // });
  }

  addVariantToList(name: string, code: string, price: string, stock: string) {
    if (!name || !price) return;
    this.tempVariants.update(v => [...v, { toneName: name, toneCode: code, price: +price, stock: +stock || 0 }]);
  }

  removeVariantFromList(idx: number) { this.tempVariants.update(v => v.filter((_, i) => i !== idx)); }

  toggleCreateForm() {
    
    this.showCreateForm.update(v => !v);
    if (!this.showCreateForm()) this.resetForm();
  }
    

  startEditBasic() { this.isEditingBasic.set(true); }
  cancelEditBasic() { this.isEditingBasic.set(false); }

  resetForm() {
    this.showCreateForm.set(false);
    this.productForm.reset({ active: true });
    this.tempVariants.set([]);
    this.tempImages.set([]);
  }

  updateFilter(e: Event) { this.labelFilter.set((e.target as HTMLInputElement).value); }

  getMainImage(p: ProductResponse) { return p.images.find(i => i.mainImage)?.url; }
  getTotalStock(p: ProductResponse) { return p.variants?.reduce((a, v) => a + v.stock, 0) || 0; }
  getCategoryName(id: number) { return this.categories().find(c => c.id === id)?.name || 'N/A'; }
  private updateLocalProduct(p: ProductResponse) { this.products.update(l => l.map(item => item.id === p.id ? p : item)); }
  
  toggleVariantForm() { this.showVariantFormInModal.update(v => !v); }
  toggleImageForm() { this.showImageFormInModal.update(v => !v); }

  printDebugFilteredProducts(){
    console.log(this.filteredProducts());
  }

}
