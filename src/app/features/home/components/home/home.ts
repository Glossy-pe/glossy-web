import { Component, signal } from '@angular/core';
import { ProductList } from "../../../product/components/product-list/product-list";
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


interface Slide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  accent: string;
}

interface Category {
  name: string;
  img: string;
}

@Component({
  selector: 'app-home',
  imports: [ProductList, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

  // Estado reactivo con Signals (disponibles desde Angular 16)
  current = signal(0);
  isAutoPlaying = signal(true);
  toast = signal<string | null>(null);
  
  private intervalId: any;

  slides: Slide[] = [
    {
      id: 1,
      title: "Calendario de Adviento",
      subtitle: "Nuevo Lanzamiento",
      description: "Lleno de amor con dias que perduran recorando cada momento",
      image: "https://i.ibb.co/Y44Kfm20/Postada-Glossy-Web.png",
      accent: "rose"
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.startAutoplay();
  }

  ngOnDestroy() { 
    this.pauseAutoplay();
  }

  startAutoplay() {
    this.isAutoPlaying.set(true);
    this.intervalId = setInterval(() => {
      this.nextSlide();
    }, 6000);
  }

  pauseAutoplay() {
    this.isAutoPlaying.set(false);
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  nextSlide() {
    this.current.update(val => (val === this.slides.length - 1 ? 0 : val + 1));
  }

  prevSlide() {
    this.current.update(val => (val === 0 ? this.slides.length - 1 : val - 1));
  }

  setSlide(index: number) {
    this.current.set(index);
    this.pauseAutoplay();
    this.startAutoplay();
  }

  showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 3000);
  }

  goToHome() {
    this.router.navigate(['/san-valentin']);
  }
}
