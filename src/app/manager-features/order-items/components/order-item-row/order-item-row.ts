import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditableOrderItem } from '../order-item-list/order-item-list';
import { MatAnchor, MatButtonModule } from "@angular/material/button";

@Component({
  selector: 'app-order-item-row',
  imports: [
    CommonModule, 
    FormsModule, 
    DecimalPipe, 
    MatAnchor,
    MatButtonModule
  ],
  templateUrl: './order-item-row.html',
})
export class OrderItemRow {
  @Input({ required: true }) item!: EditableOrderItem;
  @Input({ required: true }) isEditMode!: boolean;
  @Output() changed = new EventEmitter<void>();
  @Output() deleteToggled = new EventEmitter<void>();

  deleteSelected = false;
  expanded = signal(false);

  get maxQuantity(): number {
    return this.item.variant?.stock ?? Infinity;
  }

  get subtotal(): number {
    return (this.item.unitPrice ?? 0) * this.item.quantity;
  }

  get pendingAmount(): number {
    return this.subtotal - (this.item.amountPaid ?? 0);
  }

  circleProgress(value: number, total: number): number {
    if (!total) return 0;
    return Math.min(1, (value ?? 0) / total);
  }

  strokeDashoffset(value: number, total: number): number {
    const circumference = 2 * Math.PI * 15;
    return circumference * (1 - this.circleProgress(value, total));
  }

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }

  onFieldChange(): void {
    this.item.dirty = true;
    this.changed.emit();
  }

  onQuantityChange(): void {
  if (this.item.variant?.stock != null) {
    this.item.quantity = Math.min(Math.max(1, this.item.quantity), this.item.variant.stock);
  }
  // re-clampear los sub-campos si quantity bajó
  this.item.separatedQuantity = Math.min(this.item.separatedQuantity ?? 0, this.item.quantity);
  this.item.packedQuantity = Math.min(this.item.packedQuantity ?? 0, this.item.quantity);
  this.item.paidQuantity = Math.min(this.item.paidQuantity ?? 0, this.item.quantity);
  this.item.dirty = true;
  this.changed.emit();
}

onSubFieldChange(): void {
  this.item.separatedQuantity = Math.min(Math.max(0, this.item.separatedQuantity ?? 0), this.item.quantity);
  this.item.packedQuantity = Math.min(Math.max(0, this.item.packedQuantity ?? 0), this.item.quantity);
  this.item.paidQuantity = Math.min(Math.max(0, this.item.paidQuantity ?? 0), this.item.quantity);
  this.item.dirty = true;
  this.changed.emit();
}

  onBlockClick(field: 'separatedQuantity' | 'packedQuantity' | 'paidQuantity', index: number): void {
    const current = this.item[field] as number;
    this.item[field] = current === index + 1 ? index : index + 1;
    if (field === 'paidQuantity') {
      const isComplete = this.item.paidQuantity === this.item.quantity;
      this.item.amountPaid = isComplete ? (this.item.unitPrice ?? 0) * this.item.quantity : 0;
    }
    this.item.dirty = true;
    this.changed.emit();
  }

  blockArray(total: number): number[] {
    return Array.from({ length: total }, (_, i) => i);
  }

  completeSeparation(): void {
    this.item.separatedQuantity = this.item.separatedQuantity === this.item.quantity ? 0 : this.item.quantity;
    this.item.dirty = true;
    this.changed.emit();
  }

  completePacking(): void {
    this.item.packedQuantity = this.item.packedQuantity === this.item.quantity ? 0 : this.item.quantity;
    this.item.dirty = true;
    this.changed.emit();
  }

  completePayment(): void {
    const isComplete = this.item.paidQuantity === this.item.quantity;
    this.item.paidQuantity = isComplete ? 0 : this.item.quantity;
    this.item.amountPaid = isComplete ? 0 : (this.item.unitPrice ?? 0) * this.item.quantity;
    this.item.dirty = true;
    this.changed.emit();
  }




  toggleSeparatedButton(): void {
    if (this.item.separatedQuantity < this.item.quantity) {
      this.item.separatedQuantity = this.item.quantity;
    } else {
      this.item.separatedQuantity = 0;
    }
    this.item.dirty = true;
    this.changed.emit();
  }

  togglePaquedButton(): void {
    if (this.item.packedQuantity < this.item.quantity) {
      this.item.packedQuantity = this.item.quantity;
    } else {
      this.item.packedQuantity = 0;
    }
    this.item.dirty = true;
    this.changed.emit();
  }

  togglePaidButton(): void {
    if (this.item.paidQuantity < this.item.quantity) {
      this.item.paidQuantity = this.item.quantity;
    } else {
      this.item.paidQuantity = 0;
    }
    this.item.dirty = true;
    this.changed.emit();
  }

  toggleDelete(): void {
    this.item.pendingDelete = !this.item.pendingDelete;
    this.item.dirty = true;
    this.changed.emit();
  }

}