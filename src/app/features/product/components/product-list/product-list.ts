import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Observable, Subject, debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { ProductCard } from "../product-card/product-card";
import { CategoryService } from '../../../category/services/category.service';
import { Category } from '../../../category/models/category.model';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit {

  categories$!: Observable<Category[]>;
  categories: Category[] = [];

  allProducts: ProductResponseFull[] = [];
  filteredProducts: ProductResponseFull[] = [];

  showFilters = false;
  isLoading = false;

  currentPage = 0;
  pageSize = 12;
  totalPages = 0;
  totalElements = 0;

  public selectedCategoryId = '';

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
  this.categories$ = this.categoryService.getCategories();
  this.categories$.subscribe(cats => this.categories = cats);


  // 👇 queryParams al FINAL, y controla si cargar productos base o no
  this.route.queryParams.subscribe(params => {
  const searchFromUrl = params['search'] ?? '';
  const categoryFromUrl = params['category'] ?? '';  // 👈 agregar

  if (categoryFromUrl) {
    this.selectedCategoryId = categoryFromUrl;  // 👈 agregar
  }

  if (searchFromUrl) {
    this.searchInBackend(searchFromUrl);
  } else {
    this.loadProducts(0, false);
  }
});

  // 👇 ELIMINAR esta línea, ahora queryParams la controla
  // this.loadProducts(0, false);  ← borrar
}

  get activeCategoryName(): string {
    if (!this.selectedCategoryId) return 'Todos los productos';
    return this.categories.find(c => c.id.toString() === this.selectedCategoryId)?.name ?? '';
  }

  private searchInBackend(term: string): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.productService.searchProductsFull(term).subscribe({
      next: (response) => {
        const inStock = response.content.filter(p => p.active);
        this.allProducts = inStock;
        this.filteredProducts = inStock;
        this.totalElements = response.totalElements;
        this.totalPages = 1;
        this.currentPage = 0;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error en búsqueda:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadProducts(page: number, accumulate: boolean): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.productService.getProducts(page, this.pageSize, this.selectedCategoryId).subscribe({
      next: (response) => {
        const active = response.content.filter(p => p.active); // ← agregar
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.currentPage = response.number;

        if (accumulate) {
          this.allProducts = [...this.allProducts, ...active];
        } else {
          this.allProducts = [...active];
        }

        this.filteredProducts = [...this.allProducts];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }


  filterByCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.allProducts = [];
    this.loadProducts(0, false);
    this.showFilters = false;
  }

  loadMore(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadProducts(this.currentPage + 1, true);
    }
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  get hasMore(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

}