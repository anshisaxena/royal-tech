import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgForOf } from '@angular/common'; // <-- import NgForOf
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
    NgForOf,        // <-- required for *ngFor
    PdfOverlayComponent,
    PdfConfig
  ],
  templateUrl: './training.html',
  styleUrls: ['./training.css']
})
export class Training implements OnInit, OnDestroy {
  documentName: string = 'IMPORT';
  uploadedFiles: File[] = [];
  fileType: 'pdf' | 'image' | null = null;
  fileURLs: Map<File, string> = new Map();
  showPDF: boolean = true;

  originalData: any = {
    "IRN No": "c965d001b813b0078a50d70b0d5dea498cba7bccc27fdcf082af9441e12b5b71",
    "Exporter": "GODREJ & BOYCE MFG. CO. LTD.",
    "Tax Invoice No": "1000Q1X11000197",
    "Tax Invoice Date": "04/03/2025",
    "GST No": "27AAACG1395D1ZU",
    "Consignee": "SENSY S.A.",
    "State of Origin": "27 MAHARASHTRA",
    "District of Origin": "483 MUMBAI SUBURBAN",
    "Buyer/Applicant": "SENSY S.A.",
    "Commission Payable": "0.0"
  };

  jsonData: any = { ...this.originalData };


  constructor(private fileService: FileUploadService) {}

  ngOnInit() {
    this.uploadedFiles = this.fileService.getFiles() || [];

    if (this.uploadedFiles.length > 0) {
      const firstFile = this.uploadedFiles[0];
      if (firstFile.type.includes('pdf')) {
        this.fileType = 'pdf';
        this.showPDF = true;
      } else if (firstFile.type.includes('image')) {
        this.fileType = 'image';
        this.showPDF = false;
      }
    }
  }

  getFileURL(file: File): string {
    if (!this.fileURLs.has(file)) {
      this.fileURLs.set(file, URL.createObjectURL(file));
    }
    return this.fileURLs.get(file)!;
  }

  ngOnDestroy() {
    this.fileURLs.forEach(url => URL.revokeObjectURL(url));
    this.fileURLs.clear();
  }

  handleSearch(query: string) { console.log('Search query:', query); }
  handleSubmit() { console.log('Submit clicked'); }
  handleSave() { console.log('Save clicked'); }
  handleNext() {
     console.log('Next clicked'); }
  handlePromptChange(prompt: string) { console.log('Prompt changed:', prompt); }
  handleFieldConfigChange(config: any) { console.log('Field config changed:', config); }
  handleActionTriggered(action: string) { console.log('Action triggered:', action); }
}