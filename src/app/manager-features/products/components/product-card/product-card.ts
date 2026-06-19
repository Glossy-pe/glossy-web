import { Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductResponse } from '../../models/product-response.model';
import { ProductRequest } from '../../models/product-request.model';
import { ProductService } from '../../services/product.service';
import { Router } from '@angular/router';
import { ProductResponseFull } from '../../models/product-response-full.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard{

  @Input({ required: true }) product!: ProductResponseFull;

  constructor(
    private productService: ProductService,
    private router: Router,
  ) {}
  
  goToDetail(id: number): void {
    this.router.navigate(['/manager/products', id]);
  }

}