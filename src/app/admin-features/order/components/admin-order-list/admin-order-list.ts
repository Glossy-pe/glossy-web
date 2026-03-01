import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderResponse } from '../../models/order.model';

@Component({
  selector: 'app-admin-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-order-list.html',
})
export class AdminOrderList implements OnInit {

  private orderService = inject(OrderService);
  private router = inject(Router);

  orders = signal<OrderResponse[]>([]);
  isLoading = signal(true);
  searchTerm = signal('');

  filteredOrders = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.orders();
    return this.orders().filter(o =>
      o.id?.toString().includes(term) ||
      o.user?.name?.toLowerCase().includes(term) ||
      o.user?.email?.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading.set(true);
    this.orderService.getAll().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar órdenes', err);
        this.isLoading.set(false);
      }
    });
  }

  goToCreate() {
    this.router.navigate(['/admin/orders/new']);
  }

  viewOrder(id: number) {
    this.router.navigate(['/admin/orders', id]);
  }

  deleteOrder(id: number) {
    if (confirm('¿Estás seguro de que deseas eliminar esta orden?')) {
      this.orderService.delete(id).subscribe({
        next: () => this.orders.update(prev => prev.filter(o => o.id !== id)),
        error: () => alert('No se pudo eliminar la orden')
      });
    }
  }
}