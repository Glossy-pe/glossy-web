import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { OrderItemService } from '../../services/order-item.service';
import { OrderItemResponseFull } from '../../models/order-item-response-full.model';
import { OrderItemRow } from '../order-item-row/order-item-row';
import { EditableOrderItem } from '../order-item-list/order-item-list';

@Component({
  selector: 'app-order-item-full-list',
  imports: [CommonModule, FormsModule, OrderItemRow],
  templateUrl: './order-item-full-list.html',
})
export class OrderItemFullList implements OnInit {

  items = signal<EditableOrderItem[]>([]);
  savingIds = signal<Set<number>>(new Set());
editingIds = signal<Set<number>>(new Set());
  isLoading = signal(false);
  hasError = signal(false);
  viewMode = signal<'simple' | 'detailed'>('simple');

  page = signal(0);
  size = signal(10);
  totalPages = signal(0);
  totalElements = signal(0);

  toastMessage = signal<string | null>(null);
  private toastTimer: any;

  constructor(private orderItemService: OrderItemService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.orderItemService
      .getAllFull(this.page(), this.size())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
          this.items.set(response.content.map(i => ({
            ...i,
            dirty: false,
            pendingDelete: false,
            isNew: false,
          })));
        },
        error: () => this.hasError.set(true),
      });
  }

  toggleViewMode(): void {
  this.viewMode.set(this.viewMode() === 'simple' ? 'detailed' : 'simple');
}

  goToPage(p: number): void {
    this.page.set(p);
    this.loadItems();
  }

  onChanged(item: EditableOrderItem): void {
    item.dirty = true;
    this.items.update(items => [...items]);
  }

  saveItem(item: EditableOrderItem): void {
    const ids = new Set(this.savingIds());
    ids.add(item.id);
    this.savingIds.set(ids);

    this.orderItemService.update(item.id, {
      productVariantId: item.productVariantId,
      orderId: item.orderId,
      quantity: item.quantity,
      paidQuantity: item.paidQuantity,
      separatedQuantity: item.separatedQuantity,
      packedQuantity: item.packedQuantity,
      amountPaid: item.amountPaid,
      unitPrice: item.unitPrice,
    }).pipe(
      finalize(() => {
        const ids = new Set(this.savingIds());
        ids.delete(item.id);
        this.savingIds.set(ids);
      })
    ).subscribe({
      next: () => {
  item.dirty = false;
  const ids = new Set(this.editingIds());
  ids.delete(item.id);
  this.editingIds.set(ids);
  this.items.update(items => [...items]);
  this.showToast('Guardado');
},
      error: () => this.showToast('Error al guardar'),
    });
  }

  isSaving(id: number): boolean {
    return this.savingIds().has(id);
  }

  showToast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMessage.set(msg);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3000);
  }

  isEditing(id: number): boolean {
  return this.editingIds().has(id);
}

enterEdit(id: number): void {
  const ids = new Set(this.editingIds());
  ids.add(id);
  this.editingIds.set(ids);
}

cancelEdit(item: EditableOrderItem): void {
  // restaurar desde el servidor no es necesario, solo marcar como no dirty
  item.dirty = false;
  const ids = new Set(this.editingIds());
  ids.delete(item.id);
  this.editingIds.set(ids);
  this.items.update(i => [...i]);
}

toggleSimpleField(item: EditableOrderItem, field: 'separatedQuantity' | 'packedQuantity' | 'paidQuantity'): void {
  const isComplete = item[field] >= item.quantity;
  item[field] = isComplete ? 0 : item.quantity;
  if (field === 'paidQuantity') {
    item.amountPaid = isComplete ? 0 : (item.unitPrice ?? 0) * item.quantity;
  }
  item.dirty = true;
  this.items.update(items => [...items]);
}
}