import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of } from 'rxjs';
import { ProductService } from '../../../features/product/services/product.service';
import { ProductResponseFull } from '../../../features/product/models/product-response-full.model';
import { Category } from '../../../features/category/models/category.model';
import { CategoryService } from '../../../features/category/services/category.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class Navbar {

  cartCount = signal(0);
  searchTerm    = signal('');
  searchResults = signal<ProductResponseFull[]>([]);
  categories = signal<Category[]>([]);
  isSearching   = signal(false);
  showDropdown  = signal(false);

  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService
  ) {

    this.categoryService.getCategories().subscribe(cats => this.categories.set(cats));

    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.searchResults.set([]);
          this.showDropdown.set(false);
          this.isSearching.set(false);
          return of(null);
        }
        this.isSearching.set(true);
        return this.productService.searchProductsFull(term).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe(response => {
  this.isSearching.set(false);
  if (response) {
    const inStock = response.content.filter(p => p.active);
    this.searchResults.set(inStock);
    this.showDropdown.set(inStock.length > 0);
  }
});
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    if (!value.trim()) {
      this.searchResults.set([]);
      this.showDropdown.set(false);
    }
    this.searchSubject.next(value);
  }

  onSearchSubmit(): void {
    const term = this.searchTerm().trim();
    if (!term) return;
    this.showDropdown.set(false);
    this.router.navigate(['/products'], { queryParams: { search: term } });
  }

  goToProduct(product: ProductResponseFull): void {
  this.showDropdown.set(false);
  this.searchTerm.set('');
  this.router.navigate(['/products', product.slug]); // 👈 antes era product.id
}

  closeDropdown(): void {
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  goToCart(): void { this.router.navigate(['/cart']); }
  goToHome(): void { this.router.navigate(['/home']); }
  goProducts(): void { this.router.navigate(['/products']); }

  getProductImage(product: ProductResponseFull): string | null {
  // Primero imágenes generales del producto
  if (product.images?.length) return product.images[0].url;
  // Fallback: imagen principal de variante
  const img = product.variants?.flatMap(v => v.images || []).find(i => i.mainImage)
    ?? product.variants?.[0]?.images?.[0];
  return img?.url ?? null;
}

getMinPrice(product: ProductResponseFull): string {
  const prices = product.variants?.map(v => v.price).filter(p => p > 0) ?? [];
  if (!prices.length) return '';
  return `S/. ${Math.min(...prices).toFixed(2)}`;
}

goToCategory(categoryId: number): void {
  this.router.navigate(['/products'], { queryParams: { category: categoryId } });
}

}