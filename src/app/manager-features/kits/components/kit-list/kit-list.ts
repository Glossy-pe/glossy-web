import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { KitResponse } from '../../models/kit.model';
import { KitService, apiErrorMessage } from '../../services/kit.service';

@Component({
  selector: 'app-kit-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './kit-list.html',
})
export class KitList implements OnInit {
  private readonly kitService = inject(KitService);
  private readonly router = inject(Router);

  kits = signal<KitResponse[]>([]);
  loading = signal(true);
  creating = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.kitService.getAll().subscribe({
      next: (kits) => {
        this.kits.set(kits);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  /** Crea un kit por defecto y redirige a su edición */
  create() {
    this.creating.set(true);
    this.error.set(null);

    this.kitService.create({ name: 'Nuevo kit', active: true }).subscribe({
      next: (kit) => {
        this.creating.set(false);
        this.router.navigate(['/manager/kits', kit.id]);
      },
      error: (e) => {
        this.creating.set(false);
        this.error.set(apiErrorMessage(e));
      },
    });
  }

  toggleActive(kit: KitResponse) {
    this.kitService.update(kit.id, { name: kit.name, active: !kit.active }).subscribe({
      next: (updated) =>
        this.kits.update((list) => list.map((k) => (k.id === updated.id ? updated : k))),
      error: (e) => this.error.set(apiErrorMessage(e)),
    });
  }

  remove(kit: KitResponse) {
    if (!confirm(`¿Eliminar el kit "${kit.name}" y todos sus productos asociados?`)) return;
    this.kitService.delete(kit.id).subscribe({
      next: () => this.kits.update((list) => list.filter((k) => k.id !== kit.id)),
      error: (e) => this.error.set(apiErrorMessage(e)),
    });
  }
}