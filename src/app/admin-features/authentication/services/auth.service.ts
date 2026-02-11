import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signal para saber si está autenticado
  isAuthenticated = signal(false);
  currentUser = signal<any>(null);

  constructor(private router: Router) {
    // Verificar si hay sesión guardada al iniciar
    this.checkAuth();
  }

  private checkAuth() {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData && userData.authenticated) {
          this.isAuthenticated.set(true);
          this.currentUser.set(userData);
        }
      } catch (e) {
        this.logout();
      }
    }
  }

  logout() {
    // Limpiar localStorage
    localStorage.removeItem('user');
    
    // Actualizar signals
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    
    // Redirigir a login
    this.router.navigate(['/admin/login']);
  }

  getUsername(): string {
    return this.currentUser()?.username || '';
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}