import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importante

@Component({
  selector: 'app-home-hero',
  imports: [CommonModule],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
})
export class HomeHero{


  images: string[] = [
    'https://picsum.photos/800/400?1',
    'https://picsum.photos/800/400?2',
    'https://picsum.photos/800/400?3'
  ];

  current = 0;
  private intervalId: any;

}
