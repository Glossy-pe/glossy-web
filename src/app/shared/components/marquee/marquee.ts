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
    'assets/icons/KevinAndCoco_Logo.png', 'assets/icons/Revel_logo.png', 'assets/icons/brand3.svg',
    'assets/icons/brand4.svg', 'assets/icons/brand5.svg', 'assets/icons/brand6.svg'
  ];

}
