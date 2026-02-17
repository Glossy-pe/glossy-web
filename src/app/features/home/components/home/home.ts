import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryList } from "../../../category/components/category-list/category-list";
import {Marquee} from '../../../../shared/components/marquee/marquee';
import {HomeHero} from '../home-hero/home-hero';
import {SocialNews} from '../social-news/social-news';
import { ProductCarrusel } from "../../../product/components/product-carrusel/product-carrusel";

@Component({
  selector: 'app-home',
  imports: [CommonModule, CategoryList, Marquee, HomeHero, SocialNews, ProductCarrusel],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home{

}
