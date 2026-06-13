import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Verificar si existe un usuario en localStorage
  const user = localStorage.getItem('user');
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      // Verificar que el usuario esté autenticado
      if (userData && userData.authenticated) {
        return true;
      }
    } catch (e) {
      // Si hay error al parsear, limpiar localStorage
      localStorage.removeItem('user');
    }
  }
  
  // No autenticado, redirigir a login
  router.navigate(['/login']);
  return false;
};