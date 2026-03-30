import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
// import { debounceTime, distinctUntilChanged, map, Subject, switchMap } from 'rxjs';
// import { ProductService } from '../../../features/product/services/product.service';
// import { ProductResponseFull } from '../../../features/product/models/product-response-full.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class Navbar {

  constructor(
    private router: Router,
    // private productService: ProductService  // ← Descomentar al implementar búsqueda
  ) {
    // TODO: Búsqueda — descomentar cuando haya endpoint disponible
    // this.searchSubject.pipe(
    //   debounceTime(350),
    //   distinctUntilChanged(),
    //   switchMap(term => {
    //     if (!term.trim()) {
    //       this.searchResults.set([]);
    //       this.isSearching.set(false);
    //       return [];
    //     }
    //     this.isSearching.set(true);
    //     return this.productService.searchByName(term); // GET /products/search?name=term
    //   })
    // ).subscribe({
    //   next: results => {
    //     this.searchResults.set(results);
    //     this.isSearching.set(false);
    //     this.showDropdown.set(true);
    //   },
    //   error: () => this.isSearching.set(false)
    // });
  }

  cartCount = signal(0);

  searchTerm = signal('');
  searchResults = signal<any[]>([]);  // ← Tipará con ProductResponseFull al implementar
  isSearching = signal(false);
  showDropdown = signal(false);

  // private searchSubject = new Subject<string>(); // ← Descomentar al implementar

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    // TODO: Activar búsqueda
    // if (!value.trim()) this.showDropdown.set(false);
    // this.searchSubject.next(value);
  }

  onSearchSubmit(): void {
    const term = this.searchTerm().trim();
    if (!term) return;
    this.showDropdown.set(false);
    this.router.navigate(['/products'], { queryParams: { search: term } });
  }

  goToProduct(productId: number): void {
    this.showDropdown.set(false);
    this.searchTerm.set('');
    this.router.navigate(['/products', productId]);
  }

  closeDropdown(): void {
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  goToCart(): void { this.router.navigate(['/cart']); }
  goToHome(): void { this.router.navigate(['/home']); }
  goProducts(): void { this.router.navigate(['/products']); }
}