import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Observable, combineLatest, map, startWith } from 'rxjs';
import { Product } from '../../models/product.model';
import { ProductCard } from "../product-card/product-card";
import { LabelService } from '../../../../admin-features/label/services/label-service';
import { LabelResponse } from '../../../../admin-features/label/models/label.interface';
import { FormControl, ReactiveFormsModule } from '@angular/forms'; // Necesario para el buscador
import { Category } from '../../../category/models/category.model';
import { CategoryService } from '../../../category/services/category.service';
@Component({
  selector: 'app-product-list',
  imports: [CommonModule, ProductCard, ReactiveFormsModule], // Ya no necesitamos FormsModule
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit{
products$!: Observable<Product[]>;
  filteredProducts$!: Observable<Product[]>;
  labels$!: Observable<LabelResponse[]>;
  categories$!: Observable<Category[]>;
  
  searchControl = new FormControl('');
  showFilters = false;

  constructor(private productService: ProductService, private labelService: LabelService, private categoryService: CategoryService){}

  ngOnInit(): void {
    this.labels$ = this.labelService.getAll();
    this.categories$ = this.categoryService.getCategories();
    this.loadProducts(""); // Ahora el valor por defecto es vacío
  }

  loadProducts(categoryId: string = ""){
    this.products$ = this.productService.getProducts(categoryId);
    
    // Combinamos la búsqueda por nombre con los productos obtenidos
    this.filteredProducts$ = combineLatest([
      this.products$,
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([products, searchTerm]) => {
        const term = searchTerm?.toLowerCase() || '';
        return products.filter(p => p.name.toLowerCase().includes(term));
      })
    );

    if (window.innerWidth < 768) this.showFilters = false;
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

}
