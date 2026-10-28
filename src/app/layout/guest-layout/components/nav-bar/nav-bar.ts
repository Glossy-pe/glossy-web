import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarService } from '../side-bar/sidebar.service';

interface Flake {
  x: number;
  size: number;
  dur: number;
  delay: number;
  d: 0 | 1 | 2;
  star: boolean;
}

const SNOW_KEY = 'glossy-snow';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar {
  readonly snowOn = signal(this.readSnowPref());

  protected readonly sidebar = inject(SidebarService);

  readonly flakes: Flake[] = Array.from({ length: 22 }, (_, i) => ({
    x: (i * 37 + 11) % 100,
    size: 5 + ((i * 5) % 7),
    dur: 12 + ((i * 7) % 10),
    delay: -((i * 13) % 18),
    d: (i % 3) as 0 | 1 | 2,
    star: i % 5 === 0,
  }));

  toggleSnow(): void {
    this.snowOn.update(v => !v);
    try {
      localStorage.setItem(SNOW_KEY, String(this.snowOn()));
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }

  private readSnowPref(): boolean {
    try {
      return localStorage.getItem(SNOW_KEY) !== 'false';
    } catch {
      return true;
    }
  }
}