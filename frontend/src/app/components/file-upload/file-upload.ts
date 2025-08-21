import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FileUploadService } from '../../services/file-upload.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.html',
  styleUrls: ['./file-upload.css'],
})
export class FileUploadComponent {
  uploadedFile: File | null = null;
  previewUrl: string | null = null;
  isDragging = false;
  uploadProgress = 0;
  uploadComplete = false;
  private uploadInterval: any;

  constructor(private router: Router, private fileService: FileUploadService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files?.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    if (this.isValidFile(file)) {
      this.uploadedFile = file;
      this.previewUrl = null;
      this.uploadProgress = 0;
      this.uploadComplete = false;

      // ✅ Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => (this.previewUrl = reader.result as string);
        reader.readAsDataURL(file);
      }

      this.simulateUpload();
    } else {
      alert('Invalid file type. Only .pdf, .jpg/.jpeg and .png allowed.');
    }
  }

  isValidFile(file: File): boolean {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.type)) return true;

    // ✅ fallback by extension (handles drag & drop cases where type = "")
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '');
  }

  private simulateUpload() {
    this.uploadProgress = 0;
    clearInterval(this.uploadInterval);
    this.uploadInterval = setInterval(() => {
      if (this.uploadProgress < 100) {
        this.uploadProgress += 10;
      } else {
        clearInterval(this.uploadInterval);
        this.uploadComplete = true;
      }
    }, 300);
  }

  getFileFormat(): string {
    if (!this.uploadedFile) return '';
    if (this.uploadedFile.type === 'application/pdf') return 'PDF';
    if (this.uploadedFile.type === 'image/png') return 'PNG';
    if (this.uploadedFile.type === 'image/jpeg') return 'JPG';
    // fallback
    const ext = this.uploadedFile.name.split('.').pop()?.toUpperCase();
    return ext || 'Unknown';
  }

  downloadTemplate() {
    const link = document.createElement('a');
    link.href = 'assets/resume.pdf';
    link.download = 'resume.pdf';
    link.click();
  }

  onCancel() {
    this.uploadedFile = null;
    this.previewUrl = null;
    this.uploadProgress = 0;
    this.uploadComplete = false;
    clearInterval(this.uploadInterval);
  }

  onContinue() {
    if (this.uploadedFile) {
      this.fileService.setFile(this.uploadedFile);
      this.router.navigate(['/training']); // 👉 Go to training page
    }
  }
}
