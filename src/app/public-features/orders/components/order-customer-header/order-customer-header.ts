import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderResponseFull } from '../../models/order-response-full.model';

@Component({
  selector: 'app-order-customer-header',
  imports: [CommonModule],
  templateUrl: './order-customer-header.html',
  styleUrl: './order-customer-header.scss',
})
export class OrderCustomerHeader {
  @Input({ required: true }) order!: OrderResponseFull;
  @Input() isLoading = false;
  @Input() isAdmin = false;
  @Input() lastUpdated: Date | null = null;

  @Output() refreshClick = new EventEmitter<void>();
  @Output() adminClick = new EventEmitter<void>();
}
