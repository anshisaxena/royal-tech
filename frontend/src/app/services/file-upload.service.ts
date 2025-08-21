// file-upload.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private files: File[] = [];

  // Set multiple files
  setFiles(files: File[]) {
    this.files = files;
  }

  // Add a single file (optional)
  addFile(file: File) {
    this.files.push(file);
  }

  getFiles(): File[] {
    return this.files;
  }

  clearFiles() {
    this.files = [];
  }
}
