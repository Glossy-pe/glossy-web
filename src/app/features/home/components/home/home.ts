import { Component } from '@angular/core';
import { ProductList } from "../../../product/components/product-list/product-list";
import { CommonModule } from '@angular/common';
import { CategoryList } from "../../../category/components/category-list/category-list";
import { Hero } from "../../../../shared/components/hero/hero";
import {Marquee} from '../../../../shared/components/marquee/marquee';
import {HomeHero} from '../home-hero/home-hero';
import {SocialNews} from '../social-news/social-news';

@Component({
  selector: 'app-home',
  imports: [ProductList, CommonModule, CategoryList, Marquee, HomeHero, SocialNews],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home{

}
