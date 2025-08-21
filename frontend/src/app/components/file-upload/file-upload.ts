import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FileUploadService } from '../../services/file-upload.service';

interface UploadFile {
  file: File;
  previewUrl: string | null;
  uploadProgress: number;
  uploadComplete: boolean;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.html',
  styleUrls: ['./file-upload.css'],
})
export class FileUploadComponent {
  uploadedFiles: UploadFile[] = [];
  isDragging = false;
  private uploadIntervals: any[] = [];

  constructor(private router: Router, private fileService: FileUploadService) {}

  // Drag events
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
      this.handleFiles(event.dataTransfer.files);
    }
  }

  // File selection
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(input.files);
    }
  }

  // Handle multiple files
  private handleFiles(files: FileList) {
    Array.from(files).forEach(file => {
      if (this.isValidFile(file)) {
        const uploadFile: UploadFile = {
          file,
          previewUrl: null,
          uploadProgress: 0,
          uploadComplete: false,
        };

        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => (uploadFile.previewUrl = reader.result as string);
          reader.readAsDataURL(file);
        }

        this.uploadedFiles.push(uploadFile);
        this.simulateUpload(uploadFile);
      } else {
        alert(`Invalid file type: ${file.name}`);
      }
    });
  }

  private isValidFile(file: File): boolean {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.type)) return true;

    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '');
  }

  private simulateUpload(file: UploadFile) {
    const interval = setInterval(() => {
      if (file.uploadProgress < 100) {
        file.uploadProgress += 10;
      } else {
        clearInterval(interval);
        file.uploadComplete = true;
      }
    }, 300);
    this.uploadIntervals.push(interval);
  }

  removeFile(file: UploadFile) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f !== file);
  }

  getFileFormat(file: UploadFile): string {
    if (file.file.type === 'application/pdf') return 'PDF';
    if (file.file.type === 'image/png') return 'PNG';
    if (file.file.type === 'image/jpeg') return 'JPG';
    const ext = file.file.name.split('.').pop()?.toUpperCase();
    return ext || 'Unknown';
  }

  downloadTemplate() {
    const link = document.createElement('a');
    link.href = 'assets/resume.pdf';
    link.download = 'resume.pdf';
    link.click();
  }

  onCancel() {
    this.uploadedFiles = [];
    this.uploadIntervals.forEach(interval => clearInterval(interval));
    this.uploadIntervals = [];
  }

  // ✅ Use service to set all files
  onContinue() {
    if (this.canContinue) {
      this.fileService.setFiles(this.uploadedFiles.map(f => f.file));
      this.router.navigate(['/training']);
    }
  }

  // ✅ Getter for template to avoid parser errors
  get canContinue(): boolean {
    return this.uploadedFiles.length > 0 && this.uploadedFiles.every(f => f.uploadComplete);
  }
}
