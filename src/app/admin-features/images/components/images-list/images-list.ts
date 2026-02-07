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
  imageUrl?: string; // 👈 Nueva propiedad
}

type ModalType = 'rename-image' | 'replace-content' | 'rename-category' | null;

@Component({
  selector: 'app-images-list',
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  templateUrl: './images-list.html',
  styleUrl: './images-list.scss',
})
export class ImagesList implements OnInit {

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private readonly API = environment.apiImageServer;

  // State Signals
  images = signal<ImageRecord[]>([]);
  isLoading = signal(false);
  isProcessing = signal(false);
  searchFilter = signal('');
  selectedFile = signal<File | null>(null);
  selectedFileName = signal<string | null>(null);
  status = signal<{text: string, type: 'success' | 'error'} | null>(null);

  // Modal State
  activeModal = signal<ModalType>(null);
  targetSubject = signal<string | number | null>(null);
  modalTargetId = signal<number | null>(null);

  // Derived
  filteredImages = computed(() => {
    const query = this.searchFilter().toLowerCase();
    return this.images().filter(i => i.filename.toLowerCase().includes(query))
      .sort((a, b) => b.id - a.id);
  });

  uniqueCategories = computed(() => {
    return Array.from(new Set(this.images().map(i => i.category))).sort();
  });

  // Forms
  uploadForm = this.fb.group({
    category: ['', [Validators.required, Validators.minLength(2)]]
  });

  modalForm = this.fb.group({
    newName: ['', Validators.required]
  });

  ngOnInit() {
    this.loadImages();
  }

  loadImages() {
    this.isLoading.set(true);
    const timestamp = Date.now(); // 👈 Timestamp único para esta carga
    
    this.http.get<ImageRecord[]>(`${this.API}/images`).subscribe({
      next: (data) => {
        // 👇 Agregar imageUrl a cada imagen
        const imagesWithUrls = data.map(img => ({
          ...img,
          imageUrl: `${this.API}/images/${img.filename}?t=${timestamp}`
        }));
        
        this.images.set(imagesWithUrls);
        this.isLoading.set(false);
      },
      error: () => this.notify('Error al sincronizar datos', 'error')
    });
  }

  // --- Handlers ---

  updateSearch(e: any) {
    this.searchFilter.set(e.target.value);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  onUpload() {
    if (this.uploadForm.invalid || !this.selectedFile()) return;
    this.isProcessing.set(true);
    
    const fd = new FormData();
    fd.append('file', this.selectedFile()!);
    fd.append('category', this.uploadForm.value.category!);

    this.http.post(`${this.API}/upload`, fd).subscribe({
      next: () => {
        this.notify('Imagen subida correctamente', 'success');
        this.uploadForm.reset();
        this.selectedFile.set(null);
        this.selectedFileName.set(null);
        this.isProcessing.set(false);
        this.loadImages();
      },
      error: () => {
        this.notify('Error en la subida', 'error');
        this.isProcessing.set(false);
      }
    });
  }

  // --- Modal Management ---

  openRenameModal(img: ImageRecord) {
    this.modalTargetId.set(img.id);
    this.targetSubject.set(img.filename);
    this.modalForm.patchValue({ newName: img.filename });
    this.activeModal.set('rename-image');
  }

  openReplaceModal(img: ImageRecord) {
    this.modalTargetId.set(img.id);
    this.targetSubject.set(img.filename);
    this.activeModal.set('replace-content');
  }

  openRenameCategory(cat: string) {
    this.targetSubject.set(cat);
    this.modalForm.patchValue({ newName: cat });
    this.activeModal.set('rename-category');
  }

  closeModal() {
    this.activeModal.set(null);
    this.modalForm.reset();
    this.selectedFile.set(null);
    this.selectedFileName.set(null);
  }

  handleModalSubmit() {
    const type = this.activeModal();
    if (!type) return;

    this.isProcessing.set(true);

    if (type === 'rename-image') {
      const body = new HttpParams().set('new_filename', this.modalForm.value.newName!);
      this.http.patch(`${this.API}/images/${this.modalTargetId()}/rename`, body.toString(), {
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
      }).subscribe(() => this.finalizeOperation('Imagen renombrada'));

    } else if (type === 'replace-content') {
      if (!this.selectedFile()) return;
      const fd = new FormData();
      fd.append('file', this.selectedFile()!);
      this.http.put(`${this.API}/images/${this.modalTargetId()}/replace`, fd)
        .subscribe(() => this.finalizeOperation('Contenido reemplazado'));

    } else if (type === 'rename-category') {
      const body = new HttpParams()
        .set('old_name', this.targetSubject() as string)
        .set('new_name', this.modalForm.value.newName!);
        
      this.http.patch(`${this.API}/categories/rename`, body.toString(), {
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
      }).subscribe(() => this.finalizeOperation('Categoría actualizada globalmente'));
    }
  }

  private finalizeOperation(msg: string) {
    this.notify(msg, 'success');
    this.isProcessing.set(false);
    this.closeModal();
    this.loadImages();
  }

  // --- Deletions ---

  deleteImage(id: number) {
    if (!confirm('¿Eliminar definitivamente este registro y su archivo?')) return;
    this.http.delete(`${this.API}/images/${id}`).subscribe(() => {
      this.notify('Registro e imagen eliminados', 'success');
      this.loadImages();
    });
  }

  deleteByCategory(category: string) {
    if (!confirm(`¿Eliminar TODA la categoría "${category}"? Esta acción es irreversible.`)) return;
    this.http.delete(`${this.API}/images/category/${category}`).subscribe(() => {
      this.notify(`Categoría ${category} vaciada`, 'success');
      this.loadImages();
    });
  }

  // --- Utilities ---

  // 👇 Ya no necesitas este método, se usa img.imageUrl directamente
  // getImageUrl(filename: string): string {
  //   return `${this.API}/images/${filename}?t=${Date.now()}`;
  // }

  onImageError(e: any) {
    e.target.src = 'https://via.placeholder.com/150x100?text=No+Preview';
  }

  private notify(text: string, type: 'success' | 'error') {
    this.status.set({ text, type });
    setTimeout(() => this.status.set(null), 3500);
  }
}