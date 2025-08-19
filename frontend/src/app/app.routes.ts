import { Routes } from '@angular/router';
import { Training } from './training/training';

export const routes: Routes = [
  { path: 'training', component: Training },
  { path: '', redirectTo: '/training', pathMatch: 'full' }
];
