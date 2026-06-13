import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-form.html',
  styleUrl: './order-form.scss',
})
export class OrderForm implements OnInit {
  isLoading = signal(false);
  isSaving = signal(false);
  hasError = signal(false);

  form!: FormGroup;
  private orderId = 0;
  isEditMode = computed(() => !!this.orderId);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.orderId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    if (this.isEditMode()) this.loadOrder();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      customerName:    ['',   Validators.required],
      customerAddress: ['',   Validators.required],
      orderCode:       ['',   Validators.required],
      orderStatusId:   [null, Validators.required],
      costTotal:       [0,    [Validators.required, Validators.min(0)]],
      total:           [0,    [Validators.required, Validators.min(0)]],
    });
  }

  loadOrder(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.orderService
      .getById(this.orderId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (o) => this.form.patchValue(o),
        error: (err) => {
          console.error(err);
          this.hasError.set(true);
        },
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const op$ = this.isEditMode()
      ? this.orderService.update(this.orderId, this.form.value)
      : this.orderService.create(this.form.value);

    op$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: (saved) => this.router.navigate(['/admin/orders', saved.id]),
      error: (err) => console.error(err),
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/orders']);
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && c.touched);
  }
}