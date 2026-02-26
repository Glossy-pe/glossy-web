import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map, Subject, switchMap } from 'rxjs';
import { ProductService } from '../../../features/product/services/product.service'; // ajusta ruta
import { Product } from '../../../features/product/models/product.model'; // ajusta ruta

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
    private productService: ProductService
  ) {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.searchResults.set([]);
          this.isSearching.set(false);
          return [];
        }
        this.isSearching.set(true);
        return this.productService.getProducts().pipe(
  map(products =>
    products.filter(p =>
      p.name.toLowerCase().includes(term.toLowerCase())
    )
  )
);
      })
    ).subscribe({
      next: results => {
        this.searchResults.set(results);
        this.isSearching.set(false);
        this.showDropdown.set(true);
      },
      error: () => this.isSearching.set(false)
    });
  }

  isMobileMenuOpen = signal(false);
  cartCount = signal(2);
  navItems = ['Contacto'];

  searchTerm = signal('');
  searchResults = signal<Product[]>([]);
  isSearching = signal(false);
  showDropdown = signal(false);

  private searchSubject = new Subject<string>();

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    if (!value.trim()) this.showDropdown.set(false);
    this.searchSubject.next(value);
  }

  onSearchSubmit() {
    const term = this.searchTerm().trim();
    if (!term) return;
    this.showDropdown.set(false);
    this.router.navigate(['/products'], { queryParams: { search: term } });
  }

  goToProduct(productId: number) {
    this.showDropdown.set(false);
    this.searchTerm.set('');
    this.router.navigate(['/products', productId]);
  }

  closeDropdown() {
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  toggleMobileMenu() { this.isMobileMenuOpen.update(v => !v); }
  goToCart() { this.router.navigate(['/cart']); }
  goToHome() { this.router.navigate(['/home']); }
  goProducts() { this.router.navigate(['/products']); }
}