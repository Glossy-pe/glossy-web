import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  // Signals para el estado
  username = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  showError = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login() {
    // Limpiar errores previos
    this.errorMessage.set('');
    this.showError.set(false);

    // Validar campos
    if (!this.username() || !this.password()) {
      this.showErrorMessage('Por favor completa todos los campos');
      return;
    }

    // Activar loading
    this.isLoading.set(true);

    // Hacer request
    this.http.post(environment.apiOAuth2Server + '/api/auth/login', {
      username: this.username(),
      password: this.password()
    }).subscribe({
      next: (response: any) => {
        // Login exitoso
        localStorage.setItem('user', JSON.stringify(response));
        
        // Redirigir a home
        this.router.navigate(['/admin/products']);
      },  
      error: (error) => {
        // Error de autenticación
        this.isLoading.set(false);
        
        const errorMsg = error.error?.message || 'Credenciales inválidas. Por favor intenta nuevamente.';
        this.showErrorMessage(errorMsg);
      }
    });
  }

  private showErrorMessage(message: string) {
    this.errorMessage.set(message);
    this.showError.set(true);
    
    // Ocultar error después de 5 segundos
    setTimeout(() => {
      this.showError.set(false);
    }, 5000);
  }

  // Método para actualizar username
  updateUsername(value: string) {
    this.username.set(value);
  }

  // Método para actualizar password
  updatePassword(value: string) {
    this.password.set(value);
  }
}