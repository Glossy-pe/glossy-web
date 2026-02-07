// cart-list.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-cart-list',
  imports: [CommonModule],
  templateUrl: './cart-list.html',
  styleUrl: './cart-list.scss',
})
export class CartList {
  
  apiImageServer= environment.apiImageServer;
  
  constructor(
    public readonly cartService: CartService,
    private pdfGenerator: PdfGeneratorService
  ) {}

  get cartItems() {
    return this.cartService.items;
  }

  get totalItems() {
    return this.cartService.totalItems;
  }

  get subtotal() {
    return this.cartService.subtotal;
  }

  get total() {
    return this.cartService.total;
  }

  updateQuantity(item: any, change: number) {
    this.cartService.updateQuantity(item, change);
  }

  removeItem(item: any) {
    this.cartService.removeItem(item);
  }

  // ← NUEVO MÉTODO
  generateProformaPDF() {
    const shipping = this.subtotal() > 50 ? 0 : 5;
    
    this.pdfGenerator.generateProforma(
      this.cartItems(),
      this.subtotal(),
      shipping,
      this.total()
    );
  }
}