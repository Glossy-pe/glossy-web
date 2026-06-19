import { Component, Input, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VariantResponse } from '../../models/variant-response';
import { VariantService } from '../../services/variant.service';
import { VariantRequest } from '../../models/variant.request';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-variant-main-detail',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './variant-main-detail.html',
  styleUrl: './variant-main-detail.scss',
})
export class VariantMainDetail implements OnInit {
  @Input({ required: true }) variantId!: number;

  variant = signal<VariantResponse | null>(null);
  editMode = signal(false);
  saving = signal(false);

  form!: FormGroup;

  constructor(
    private variantService: VariantService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.loadVariant();
  }

  loadVariant(): void {
    this.variantService.getById(this.variantId).subscribe(res => {
      this.variant.set(res);
    });
  }

  enterEdit(variant: VariantResponse): void {
  this.form = this.fb.group({
    toneName:  [variant.toneName, Validators.required],
    toneCode:  [variant.toneCode],
    cost:      [variant.cost, [Validators.required, Validators.min(0)]],
    price:     [variant.price, [Validators.required, Validators.min(0)]],
    stock:     [variant.stock, [Validators.required, Validators.min(0)]],
    position:  [variant.position],
    active:    [variant.active],
    productId: [variant.productId, Validators.required],
  });

  this.editMode.set(true);
}

  cancelEdit(): void {
    this.editMode.set(false);
  }

  saveEdit(): void {
    if (this.form.invalid) return;

    const request: VariantRequest = this.form.getRawValue();
    this.saving.set(true);

    this.variantService.update(this.variantId, request).subscribe({
      next: res => {
        this.variant.set(res);
        this.editMode.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }
}
