import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  await auth.initialized;
  return auth.configured() && auth.authenticated()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.initialized;
  return auth.authenticated() ? inject(Router).createUrlTree(['/']) : true;
};
