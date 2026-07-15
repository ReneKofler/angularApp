import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./settings/settings').then((m) => m.Settings),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  { path: '**', redirectTo: '' },
];
