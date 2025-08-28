import { Routes } from '@angular/router';
import { FileUploadComponent } from '../app/components/file-upload/file-upload';
import { Training } from '../app/training/training'; // ✅ Import correctly
import { DocumentAnalyzerComponent } from '../app/components/DocumentAnalyzer/document-analyzer';

export const routes: Routes = [
  { path: '', component: FileUploadComponent },
  { path: 'training', component: Training },
  { path: 'analyzer', component: DocumentAnalyzerComponent },
];
