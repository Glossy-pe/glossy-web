import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { OrderItemService } from '../../services/order-item.service';

@Component({
  selector: 'app-order-item-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-item-form.html',
  styleUrl: './order-item-form.scss',
})
export class OrderItemForm implements OnInit {
  isLoading = signal(false);
  isSaving = signal(false);
  hasError = signal(false);

  form!: FormGroup;
  private itemId = 0;
  private orderId = 0;
  isEditMode = computed(() => !!this.itemId);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderItemService: OrderItemService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.itemId = Number(this.route.snapshot.paramMap.get('itemId') ?? 0);
    this.buildForm();
    if (this.isEditMode()) this.loadItem();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      productVariantId:  [null, Validators.required],
      orderId:           [this.orderId, Validators.required],
      quantity:          [1,    [Validators.required, Validators.min(1)]],
      paidQuantity:      [0,    [Validators.required, Validators.min(0)]],
      separatedQuantity: [0,    [Validators.required, Validators.min(0)]],
      packedQuantity:    [0,    [Validators.required, Validators.min(0)]],
      amountPaid:        [null],
      unitPrice:         [null],
    });
  }

  loadItem(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.orderItemService
      .getById(this.itemId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (i) => this.form.patchValue(i),
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
      ? this.orderItemService.update(this.itemId, this.form.value)
      : this.orderItemService.create(this.form.value);

    op$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => this.router.navigate(['/manager/orders', this.orderId]),
      error: (err) => console.error(err),
    });
  }

  goBack(): void {
    this.router.navigate(['/manager/orders', this.orderId]);
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && c.touched);
  }
}