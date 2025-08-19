// file-upload.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private file: File | null = null;

  setFile(file: File) {
    this.file = file;
  }

  getFile(): File | null {
    return this.file;
  }
}
