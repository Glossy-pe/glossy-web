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
  numero = "51923895798";
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
    const shipping = this.subtotal() > 30 ? 0 : 5;
    
    this.pdfGenerator.generateProforma(
      this.cartItems(),
      this.subtotal(),
      shipping,
      this.total()
    );
  }

  
goToPay() {
  const items = this.cartItems();
  if (items.length === 0) return;

  const lineas = items
    .map(item => `• ${item.product.name} (${item.selectedVariant.toneName}) x${item.quantity} — S/. ${(item.selectedVariant.price * item.quantity).toFixed(2)}`)
    .join('\n');

  const mensaje = `Hola! 👋 Quiero hacer este pedido:\n\n${lineas}\n\n*Total: S/. ${this.total().toFixed(2)}*`;

  const url = `https://api.whatsapp.com/send?phone=${this.numero}&text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}
  
}