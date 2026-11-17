import { ChangeDetectionStrategy, Component, Input, inject, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment'; // ajusta la ruta

@Component({
  selector: 'app-variant-bulk-create',
  imports: [FormsModule],
  templateUrl: './variant-bulk-create.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantBulkCreate {
  private readonly http = inject(HttpClient);

  @Input({ required: true }) productId!: number;
  readonly created = output<void>();

  readonly open = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);

  count = signal<number | null>(5);
  cost = signal<number | null>(null);
  price = signal<number | null>(null);
  stock = signal<number | null>(0);
  toneCode = signal('#000000');

  canSubmit(): boolean {
    const c = this.count();
    return !this.saving() && !!c && c >= 1 && c <= 100
      && this.cost() != null && this.cost()! >= 0
      && this.price() != null && this.price()! >= 0
      && this.stock() != null && this.stock()! >= 0;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set(null);
    this.ok.set(null);

    this.http
      .post<{ id: number }[]>(`${environment.apiUrl}/api/manager/variants/bulk`, {
        productId: this.productId,
        count: this.count(),
        cost: this.cost(),
        price: this.price(),
        stock: this.stock(),
        toneCode: this.toneCode(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (list) => {
          this.ok.set(`Se crearon ${list.length} variantes.`);
          this.created.emit();
        },
        error: (e) => this.error.set(e?.error?.message || 'No se pudieron crear las variantes.'),
      });
  }
}