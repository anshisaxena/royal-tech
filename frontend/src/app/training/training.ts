import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { Header } from '../shared/header/header';
import { ActionButtons } from '../shared/action-buttons/action-buttons';
import { FileUploadService } from '../services/file-upload.service';
import { SafeUrlPipe } from '../pipes/safe-url.pipe';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [Header, ActionButtons, NgIf, SafeUrlPipe],
  templateUrl: './training.html',
  styleUrls: ['./training.css']
})
export class Training implements OnInit {
  documentName: string = 'IMPORT';
  uploadedFile: File | null = null;
  fileURL: string | null = null;

  constructor(private fileService: FileUploadService) {}

  ngOnInit() {
    this.uploadedFile = this.fileService.getFile();
    if (this.uploadedFile) {
      this.fileURL = URL.createObjectURL(this.uploadedFile);
      this.documentName = this.uploadedFile.name;
    }
  }

  // ✅ Helper to safely check if file is an image
  isImage(file: File | null): boolean {
    return !!file && file.type.startsWith('image/');
  }

  handleSearch(query: string) {
    console.log('Search query:', query);
  }

  handleSubmit() {
    console.log('Submit clicked - Processing document...');
  }

  handleSave() {
    console.log('Save clicked - Saving progress...');
  }

  handleNext() {
    console.log('Next clicked - Moving to next step...');
  }
}
