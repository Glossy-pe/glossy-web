import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { CategoryResponse } from '../../../../public-features/categories/models/category-response.model';
import { CategoryService } from '../../../../public-features/categories/services/category.service';
import { SidebarService } from './sidebar.service';

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
  host: { '(document:keydown.escape)': 'sidebar.close()' },
})
export class SideBar {
  protected readonly sidebar = inject(SidebarService);
  private readonly categoryService = inject(CategoryService);

  protected readonly categories = toSignal(
    this.categoryService.getAll().pipe(
      catchError(err => {
        console.error('Error cargando categorías', err);
        return of([] as CategoryResponse[]);
      }),
    ),
    { initialValue: [] as CategoryResponse[] },
  );

  protected readonly productsOpen = signal(true);

  protected toggleProducts(): void {
    this.productsOpen.update(v => !v);
  }
}