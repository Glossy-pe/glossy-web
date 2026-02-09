import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpParams, HttpHeaders } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

interface ImageRecord {
  id: number;
  filename: string;
  category: string;
  created_at: string;
}

type ModalType = 'rename-image' | 'replace-content' | 'rename-category' | null;

@Component({
  selector: 'app-admin-images-list',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './admin-images-list.html',
  styleUrl: './admin-images-list.scss',
})
export class AdminImagesList implements OnInit {

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private readonly API = environment.apiImageServer+"/images";

  // State
  images = signal<ImageRecord[]>([]);
  isLoading = signal(false);
  isProcessing = signal(false);
  searchFilter = signal('');
  status = signal<{text: string, type: 'success' | 'error'} | null>(null);

  // Pagination
  currentPage = signal(0);
  pageSize = signal(8);

  // Modal & Selection
  showModal = signal(false);
  modalMode = signal<'upload' | 'edit'>('upload');
  selectedFile = signal<File | null>(null);
  selectedFileName = signal<string | null>(null);
  editingId = signal<number | null>(null);

  // Form
  imageForm: FormGroup = this.fb.group({
    category: ['', Validators.required],
    filename: ['']
  });

  // Derived Logic
  filteredImages = computed(() => {
    const query = this.searchFilter().toLowerCase();
    return this.images()
      .filter(i => i.filename.toLowerCase().includes(query) || i.category.toLowerCase().includes(query))
      .sort((a, b) => b.id - a.id);
  });

  paginatedImages = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.filteredImages().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredImages().length / this.pageSize()));
  startIdx = computed(() => this.currentPage() * this.pageSize());
  endIdx = computed(() => Math.min((this.currentPage() + 1) * this.pageSize(), this.filteredImages().length));

  ngOnInit() {
    this.loadImages();
  }

  loadImages() {
    this.isLoading.set(true);
    this.http.get<ImageRecord[]>(this.API).subscribe({
      next: (data) => {
        this.images.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notify('Error al conectar con la API', 'error');
        this.isLoading.set(false);
      }
    });
  }

  updateSearch(e: any) {
    this.searchFilter.set(e.target.value);
    this.currentPage.set(0); // Reset a primera página al buscar
  }

  setPage(page: number) {
    this.currentPage.set(page);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  // Modals
  openUploadModal() {
    this.modalMode.set('upload');
    this.imageForm.reset();
    this.imageForm.get('filename')?.disable();
    this.showModal.set(true);
  }

  openEditModal(img: ImageRecord) {
    this.modalMode.set('edit');
    this.editingId.set(img.id);
    this.imageForm.get('filename')?.enable();
    this.imageForm.patchValue({
      category: img.category,
      filename: img.filename
    });
    this.selectedFileName.set(null);
    this.selectedFile.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedFile.set(null);
    this.selectedFileName.set(null);
    this.editingId.set(null);
  }

  submitForm() {
    if (this.modalMode() === 'upload') {
      this.handleUpload();
    } else {
      this.handleUpdate();
    }
  }

  handleUpload() {
    if (this.imageForm.invalid || !this.selectedFile()) return;
    this.isProcessing.set(true);

    const fd = new FormData();
    fd.append('file', this.selectedFile()!);
    fd.append('category', this.imageForm.value.category);

    this.http.post(this.API, fd).subscribe({
      next: () => this.finalizeOperation('Imagen añadida correctamente'),
      error: () => {
        this.notify('Error al subir la imagen', 'error');
        this.isProcessing.set(false);
      }
    });
  }

  handleUpdate() {
    const id = this.editingId();
    if (!id) return;
    this.isProcessing.set(true);

    const fd = new FormData();
    // Agregamos solo lo que esté presente
    if (this.imageForm.value.category) fd.append('category', this.imageForm.value.category);
    if (this.imageForm.value.filename) fd.append('filename', this.imageForm.value.filename);
    if (this.selectedFile()) fd.append('file', this.selectedFile()!);

    // PATCH /images/{image_id}
    this.http.patch(`${this.API}/${id}`, fd).subscribe({
      next: () => this.finalizeOperation('Imagen actualizada con éxito'),
      error: () => {
        this.notify('Error al actualizar registro', 'error');
        this.isProcessing.set(false);
      }
    });
  }

  deleteImage(id: number) {
    if (!confirm('¿Seguro que deseas eliminar esta imagen permanentemente?')) return;
    this.http.delete(`${this.API}/${id}`).subscribe({
      next: () => {
        this.notify('Imagen eliminada', 'success');
        this.loadImages();
      },
      error: () => this.notify('Error al eliminar imagen', 'error')
    });
  }

  private finalizeOperation(msg: string) {
    this.notify(msg, 'success');
    this.isProcessing.set(false);
    this.closeModal();
    this.loadImages();
  }

  // Helpers
  getImageFileUrl(id: number): string {
    return `${this.API}/${id}/file?t=${Date.now()}`;
  }

  onImageError(e: any) {
    e.target.src = 'https://placehold.co/150x150';
  }

  private notify(text: string, type: 'success' | 'error') {
    this.status.set({ text, type });
    setTimeout(() => this.status.set(null), 3000);
  }
}