import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'recipes',
    loadComponent: () =>
      import('./pages/recipe-list/recipe-list.component').then(
        (m) => m.RecipeListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/new',
    loadComponent: () =>
      import('./pages/recipe-form/recipe-form.component').then(
        (m) => m.RecipeFormComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/:id/edit',
    loadComponent: () =>
      import('./pages/recipe-form/recipe-form.component').then(
        (m) => m.RecipeFormComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'recipes/:id',
    loadComponent: () =>
      import('./pages/recipe-detail/recipe-detail.component').then(
        (m) => m.RecipeDetailComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
