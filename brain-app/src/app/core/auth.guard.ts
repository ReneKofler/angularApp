import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.configured() && !auth.loading() && !auth.authenticated()
    ? inject(Router).createUrlTree(['/login'])
    : true;
};
