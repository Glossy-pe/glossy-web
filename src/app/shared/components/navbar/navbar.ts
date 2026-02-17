import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../admin-features/authentication/services/auth.service';  // Ajusta la ruta según tu estructura

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
})
export class Navbar {

  constructor(
    private router: Router,
  ) {}

  // Estado
  isMobileMenuOpen = signal(false);
  cartCount = signal(2);

  // Items del menú
  navItems = ['Contacto'];

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }
  
  goToCart() {
    this.router.navigate(['/cart']);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  goProducts(){
    this.router.navigate(['/products']);
  }

}