import { Component, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { ProductRequest } from '../../models/product-request.model';
import { ProductResponse } from '../../models/product-response.model';
import { VariantList } from '../../../variants/components/variant-list/variant-list';
import { ProductCard } from '../product-card/product-card';
import { ProductImagesList } from "../product-images-list/product-images-list";
import { ProductMainDetail } from "../product-main-detail/product-main-detail";

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, VariantList, ProductCard, ProductImagesList, ProductMainDetail],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {

  product = signal<ProductResponse | null>(null);

  private productId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.productId) {
      this.loadProduct();
    }
  }

  loadProduct(): void {
    this.productService.getById(this.productId).subscribe(
      res => {this.product.set(res)}
    )
  }

  goBack(): void {
    this.router.navigate(['/manager/products']);
  }

}