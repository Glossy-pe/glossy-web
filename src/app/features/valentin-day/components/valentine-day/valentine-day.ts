import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductList } from "../../../product/components/product-list/product-list";
import { Product } from '../../../product/models/product.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-valentine-day',
  imports: [CommonModule, ProductList],
  templateUrl: './valentine-day.html',
  styleUrl: './valentine-day.scss',
})
export class ValentineDay implements OnInit{
  searchTerm = signal('');
  selectedCategory = signal('todos');
  apiImageServer= environment.apiImageServer;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}
  

  ngOnInit(): void {
  }


  setCategory(category: string) {
    this.selectedCategory.set(category);
  }

  goToHome() {
    this.router.navigate(['/valentine-day']);
  }

  trackByProductName(index: number, product: any): string {
    return product.name;
  }

    viewProductDetail() {
      this.router.navigate(['/products', 33]);
    }

}
