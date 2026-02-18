import { Component } from '@angular/core';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-marquee',
  imports: [
    NgForOf
  ],
  templateUrl: './marquee.html',
  styleUrl: './marquee.scss',
})
export class Marquee {
  brands: string[] = [
    'assets/icons/KevinAndCoco_logo.png', 'assets/icons/Revel_logo.png', 'assets/icons/lofshe.svg',
    'assets/icons/magicshop.svg', 'assets/icons/nossa.svg', 'assets/icons/italiadeluxe.svg', 'assets/icons/gagk.svg'
  ];

}
