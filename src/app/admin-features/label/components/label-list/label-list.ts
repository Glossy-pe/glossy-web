import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LabelService } from '../../services/label-service';
import { LabelResponse } from '../../models/label.interface';


@Component({
  selector: 'app-label-list',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './label-list.html',
  styleUrl: './label-list.scss',
})
export class LabelList implements OnInit {
private labelService = inject(LabelService);
  private fb = inject(FormBuilder);

  // Signals
  labels = signal<LabelResponse[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  showForm = signal<boolean>(false);
  editingLabel = signal<LabelResponse | null>(null);

  // Formulario simple (solo nombre)
  labelForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  ngOnInit(): void {
    this.loadLabels();
  }

  loadLabels() {
    this.isLoading.set(true);
    this.labelService.getAll().subscribe({
      next: (data) => {
        this.labels.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando etiquetas', err);
        this.isLoading.set(false);
      }
    });
  }

  toggleForm() {
    if (this.showForm() || this.editingLabel()) {
      this.resetForm();
    } else {
      this.showForm.set(true);
    }
  }

  startEdit(label: LabelResponse) {
    this.editingLabel.set(label);
    this.showForm.set(true);
    this.labelForm.patchValue({ name: label.name });
  }

  saveLabel() {
    if (this.labelForm.invalid) return;

    this.isSaving.set(true);
    const request = this.labelForm.value;

    if (this.editingLabel()) {
      const id = this.editingLabel()!.id;
      this.labelService.update(id, request).subscribe({
        next: () => {
          this.loadLabels();
          this.resetForm();
        },
        error: (e) => {
          console.error(e);
          this.isSaving.set(false);
        }
      });
    } else {
      this.labelService.create(request).subscribe({
        next: () => {
          this.loadLabels();
          this.resetForm();
        },
        error: (e) => {
          console.error(e);
          this.isSaving.set(false);
        }
      });
    }
  }

  deleteLabel(id: number) {
    if (confirm('¿Estás seguro de eliminar esta etiqueta?')) {
      this.labelService.delete(id).subscribe({
        next: () => this.loadLabels(),
        error: (e) => console.error(e)
      });
    }
  }

  resetForm() {
    this.showForm.set(false);
    this.editingLabel.set(null);
    this.isSaving.set(false);
    this.labelForm.reset();
  }
}
