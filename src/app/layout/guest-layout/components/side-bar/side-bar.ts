import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CategoryResponse } from '../../../../public-features/categories/models/category-response.model';
import { CategoryService } from '../../../../public-features/categories/services/category.service';

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar implements OnInit {
  categories = signal<CategoryResponse[]>([]);
  isOpen = signal(false);
  openSections = signal<Record<string, boolean>>({
    inicio: true,
    productos: true,
    pedido: false,
  });

  constructor(private categoryService: CategoryService) {}

  
  ngOnInit(): void {
    this.categoryService.getAll().subscribe({
      next: cats => this.categories.set(cats),
      error: err => console.error('Error cargando categorías', err),
    });
  }

  toggleSection(section: string): void {
    this.openSections.update(s => ({ ...s, [section]: !s[section] }));
  }

  toggleSidebar(): void {
    this.isOpen.update(v => !v);
  }
}