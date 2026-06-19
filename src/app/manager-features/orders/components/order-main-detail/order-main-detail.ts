import { Component, OnInit, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';
import { OrderResponseFull } from '../../models/order-response-full.model';
import { OrderStatusResponse } from '../../models/order-status-response.model';

@Component({
  selector: 'app-order-main-detail',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-main-detail.html',
  styleUrl: './order-main-detail.scss',
})
export class OrderMainDetail {

  @Input({ required: true }) orderId!: number;
  
  order    = signal<OrderResponseFull | null>(null);
  statuses = signal<OrderStatusResponse[]>([]);

  isLoading  = signal(false);
  isDeleting = signal(false);
  isSaving   = signal(false);
  hasError   = signal(false);
  isEditing  = signal(false);
  showDeleteConfirm = signal(false);

  currentStatus = computed(() =>
    this.statuses().find(s => s.id === this.order()?.orderStatusId) ?? null
  );

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadStatuses();
    if (this.orderId) this.loadOrder();
  }

  deleteConfirmInput = signal('');

  private buildForm(): void {
    this.form = this.fb.group({
      customerName:    ['', Validators.required],
      customerAddress: ['', Validators.required],
      orderStatusId:   [null, Validators.required],
    });
  }

  loadStatuses(): void {
    this.orderService.getStatuses().subscribe({
      next: s => this.statuses.set(s),
      error: err => console.error(err),
    });
  }

  loadOrder(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.orderService
      .getFullById(this.orderId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: o => this.order.set(o),
        error: err => { console.error(err); this.hasError.set(true); },
      });
  }

  reloadOrder(): void {
    this.orderService.getFullById(this.orderId).subscribe({
      next: o => this.order.set(o),
    });
  }

  startEdit(): void {
    const o = this.order();
    if (!o) return;
    this.form.patchValue({
      customerName:    o.customerName,
      customerAddress: o.customerAddress,
      orderStatusId:   o.orderStatusId,
    });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    // Recarga para descartar cualquier cambio visual
    this.orderService.getById(this.orderId).subscribe({
      next: o => this.order.set(o as OrderResponseFull),
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isSaving.set(true);
    this.orderService
      .update(this.orderId, this.form.value)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: updated => {
          this.order.set(updated as OrderResponseFull);
          this.isEditing.set(false);
        },
        error: err => console.error(err),
      });
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && c.touched);
  }

  confirmDelete(): void {
    this.deleteConfirmInput.set('');
    this.showDeleteConfirm.set(true);
  }
  cancelDelete():  void { this.showDeleteConfirm.set(false); }

  deleteOrder(): void {
  if (this.deleteConfirmInput() !== this.order()!.orderCode) return;
  this.isDeleting.set(true);
  this.orderService
    .delete(this.orderId)
    .pipe(finalize(() => this.isDeleting.set(false)))
    .subscribe({
      next: () => this.router.navigate(['/manager/orders']),
      error: err => console.error(err),
    });
}

  goBack(): void { this.router.navigate(['/manager/orders']); }
}
