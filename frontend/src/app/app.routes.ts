import { Routes } from '@angular/router';
import { Training } from './training/training';
import { Idp } from './idp/idp';

export const routes: Routes = [
  { path: 'training', component: Training },
  { path: 'idp', component: Idp },
  { path: '', redirectTo: '/training', pathMatch: 'full' }
];
