import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
      const file = event.dataTransfer.files[0];
      this.handleFile(file);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.handleFile(file);
    }
  }

  private handleFile(file: File) {
    if (this.isValidFile(file)) {
      this.uploadedFile = file;
      this.previewUrl = null;
      this.uploadProgress = 0;
      this.uploadComplete = false;

      // Show preview if image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => (this.previewUrl = reader.result as string);
        reader.readAsDataURL(file);
      }

      // Simulate upload progress
      this.simulateUpload();
    } else {
      alert('Invalid file type. Only .pdf, .jpg/.jpeg and .png allowed.');
    }
  }

  isValidFile(file: File): boolean {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    return allowedTypes.includes(file.type);
  }

  private simulateUpload() {
    this.uploadProgress = 0;
    clearInterval(this.uploadInterval);

    this.uploadInterval = setInterval(() => {
      if (this.uploadProgress < 100) {
        this.uploadProgress += 10;
      } else {
        clearInterval(this.uploadInterval);
        this.uploadComplete = true; // ✅ Mark upload as done
      }
    }, 300);
  }

  getFileFormat(): string {
    if (!this.uploadedFile) return '';
    const type = this.uploadedFile.type;
    if (type === 'application/pdf') return 'PDF';
    if (type === 'image/png') return 'PNG';
    if (type === 'image/jpeg') return 'JPG';
    return 'Unknown';
  }

  downloadTemplate() {
    const link = document.createElement('a');
    link.href = 'assets/resume.pdf'; // Ensure file exists in assets/
    link.download = 'resume.pdf';
    link.click();
  }

  onCancel() {
    this.uploadedFile = null;
    this.previewUrl = null;
    this.uploadProgress = 0;
    this.uploadComplete = false;
    clearInterval(this.uploadInterval);
    console.log('Upload cancelled');
  }

  onContinue() {
    if (this.uploadedFile) {
      console.log('Proceeding with file:', this.uploadedFile.name);
      // 👉 Send file to backend with FormData
    }
  }
}
