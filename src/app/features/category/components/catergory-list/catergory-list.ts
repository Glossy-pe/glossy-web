import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { Observable, tap } from 'rxjs';
import { Console } from 'console';
import { Router } from '@angular/router';

@Component({
  selector: 'app-catergory-list',
  imports: [CommonModule],
  templateUrl: './catergory-list.html',
  styleUrl: './catergory-list.scss',
})
export class CatergoryList implements OnInit {

  categories$!: Observable<Category[]>;

  constructor(private categoryService: CategoryService, private router: Router){

  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories() {
    this.categories$ = this.categoryService.getCategories().pipe(
      tap(response => console.log('Respuesta de la API:', response))
    );
  }

  selectCategoryAndGoToProducts(){
    this.router.navigate(['/product']);
  }

}
