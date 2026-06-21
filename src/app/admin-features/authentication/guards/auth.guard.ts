import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const user = localStorage.getItem('user');

  if (user) {
    try {
      const userData = JSON.parse(user);
      if (userData && userData.authenticated) {
        return true;
      }
    } catch (e) {
      localStorage.removeItem('user');
    }
  }

  router.navigate(['/manager/login']);
  return false;
};