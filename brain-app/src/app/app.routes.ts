import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadComponent: () => import('./notes/notes').then((m) => m.Notes),
  },
  {
    path: 'workouts',
    canActivate: [authGuard],
    loadComponent: () => import('./workouts/workouts').then((m) => m.Workouts),
  },
  {
    path: 'crossfit',
    canActivate: [authGuard],
    loadComponent: () => import('./crossfit/crossfit').then((m) => m.Crossfit),
  },
  {
    path: 'training',
    canActivate: [authGuard],
    loadComponent: () => import('./training/training').then((m) => m.Training),
  },
  {
    path: 'greasing-the-groove',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./greasing-the-groove/greasing-the-groove').then((m) => m.GreasingTheGroove),
  },
  {
    path: 'nutrition',
    canActivate: [authGuard],
    loadComponent: () => import('./nutrition/nutrition').then((m) => m.Nutrition),
  },
  {
    path: 'recipes',
    canActivate: [authGuard],
    loadComponent: () => import('./recipes/recipes').then((m) => m.Recipes),
  },
  {
    path: 'body',
    canActivate: [authGuard],
    loadComponent: () => import('./body/body').then((m) => m.Body),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./profile/profile').then((m) => m.Profile),
  },
  {
    path: 'groceries',
    canActivate: [authGuard],
    loadComponent: () => import('./groceries/groceries').then((m) => m.Groceries),
  },
  {
    path: 'journal',
    canActivate: [authGuard],
    loadComponent: () => import('./journal/journal').then((m) => m.Journal),
  },
  {
    path: 'rankings',
    canActivate: [authGuard],
    loadComponent: () => import('./rankings/rankings').then((m) => m.Rankings),
  },
  {
    path: 'flashcards',
    canActivate: [authGuard],
    loadComponent: () => import('./flashcards/flashcards').then((m) => m.Flashcards),
  },
  {
    path: 'stretching',
    canActivate: [authGuard],
    loadComponent: () => import('./stretching/stretching').then((m) => m.Stretching),
  },
  {
    path: 'linedance',
    canActivate: [authGuard],
    loadComponent: () => import('./linedance/linedance').then((m) => m.Linedance),
  },
  { path: 'apps/body', redirectTo: 'body' },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  { path: '**', redirectTo: '' },
];
