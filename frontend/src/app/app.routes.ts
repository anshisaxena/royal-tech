import { Routes } from '@angular/router';
import { FileUploadComponent } from '../app/components/file-upload/file-upload';
import { Training } from '../app/training/training'; // ✅ Import correctly

export const routes: Routes = [
  { path: '', component: FileUploadComponent },
  { path: 'training', component: Training },
  { path: 'training', redirectTo: '/training', pathMatch: 'full' },
];
