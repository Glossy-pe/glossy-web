import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { VariantService } from '../../services/variant.service';

@Component({
  selector: 'app-variant-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './variant-form.html',
  styleUrl: './variant-form.scss',
})
export class VariantForm implements OnInit {
  isLoading = signal(false);  // solo en modo edit para pre-cargar datos
  isSaving = signal(false);
  hasError = signal(false);

  isEditMode = computed(() => !!this.variantId);

  form!: FormGroup;

  private variantId = 0;
  private productId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private variantService: VariantService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.variantId = Number(this.route.snapshot.paramMap.get('variantId') ?? 0);

    if (this.isEditMode()) this.loadVariant();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      toneName:  ['', [Validators.required, Validators.maxLength(100)]],
      toneCode:  ['', [Validators.required, Validators.maxLength(20)]],
      cost:      [0,  [Validators.required, Validators.min(0)]],
      price:     [0,  [Validators.required, Validators.min(0)]],
      stock:     [0,  [Validators.required, Validators.min(0)]],
      position:  [null],
      active:    [true],
    });
  }

  loadVariant(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.variantService
      .getById(this.variantId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (v) => this.form.patchValue(v),
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

    const request = { ...this.form.value, productId: this.productId };
    this.isSaving.set(true);

    const op$ = this.isEditMode()
      ? this.variantService.update(this.variantId, request)
      : this.variantService.create(request);

    op$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: (saved) => this.router.navigate(['/manager/products', saved.productId]),
      error: (err) => console.error(err),
    });
  }

  goBack(): void {
    this.router.navigate(['/manager/products', this.productId]);
  }

  get toneCodeValue(): string {
    return this.form.get('toneCode')?.value ?? '';
  }

  get activeValue(): boolean {
    return this.form.get('active')?.value ?? false;
  }

  toggleActive(): void {
    this.form.get('active')!.setValue(!this.activeValue);
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && c.touched);
  }
}