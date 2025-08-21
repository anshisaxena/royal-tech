import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { Header } from '../components/header/header';
import { ActionButtons } from '../components/action-buttons/action-buttons';
import { FileUploadService } from '../services/file-upload.service';
import { PdfOverlayComponent } from '../components/pdf-overlay/pdf-overlay';
import { PdfConfig } from '../components/pdf-config/pdf-config';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [
    Header,
    ActionButtons,
    NgIf,
    PdfOverlayComponent,
    PdfConfig
  ],
  templateUrl: './training.html',
  styleUrls: ['./training.css']
})
export class Training implements OnInit, OnDestroy {
  documentName: string = 'IMPORT';
  uploadedFile: File | null = null;
  fileURL: string | null = null;
  showPDF: boolean = true; // Ensure PDF viewer is shown by default

  originalData: any = {
    InvoiceNo: 'E260302',
    InvoiceDate: '08/07/2025',
    ExporterName: 'TASTY BITE EATABLES LTD',
    TotalGrossWeight: '24124.360'
  };

  jsonData: any = {
    InvoiceNo: 'E260302',
    InvoiceDate: '08/07/2025',
    ExporterName: 'TASTY BITE EATABLES LTD',
    TotalGrossWeight: '24124.360'
  };

  constructor(private fileService: FileUploadService) {}

  ngOnInit() {
    this.uploadedFile = this.fileService.getFile();
    if (this.uploadedFile) {
      this.fileURL = URL.createObjectURL(this.uploadedFile); // Generate temporary URL
      this.documentName = this.uploadedFile.name;
    }
  }

  ngOnDestroy() {
    // Clean up the generated file URL when the component is destroyed to prevent memory leaks
    if (this.fileURL) {
      URL.revokeObjectURL(this.fileURL); // Revoke the created URL to free memory
      this.fileURL = null;
    }
  }

  handleSearch(query: string) {
    console.log('Search query:', query);
  }

  handleSubmit() {
    console.log('Submit clicked');
  }

  handleSave() {
    console.log('Save clicked');
  }

  handleNext() {
    console.log('Next clicked');
  }

  handlePromptChange(prompt: string) {
    console.log('Prompt changed:', prompt);
  }

  handleFieldConfigChange(config: any) {
    console.log('Field config changed:', config);
  }

  handleActionTriggered(action: string) {
    console.log('Action triggered:', action);
  }
}
