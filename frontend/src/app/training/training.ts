import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../components/header/header';
import { ActionButtons } from '../components/action-buttons/action-buttons';
import { FileUploadService, DocumentType } from '../services/file-upload.service';
import { PdfOverlayComponent } from '../components/pdf-overlay/pdf-overlay';
import { PdfConfig } from '../components/pdf-config/pdf-config';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [
    Header,
    ActionButtons,
    NgIf,
    NgFor,
    FormsModule,
    PdfOverlayComponent,
    PdfConfig
  ],
  templateUrl: './training.html',
  styleUrls: ['./training.css']
})
export class Training implements OnInit, OnDestroy {
  documentName: DocumentType | '' = '';
  uploadedFiles: File[] = [];
  fileType: 'pdf' | 'image' | null = null;
  fileURLs: Map<File, string> = new Map();
  showPDF: boolean = true;

  // Highlight state from prompt extraction
  showHighlights: boolean = true;
  highlights: Array<{ pageNo: number; key: string; value: string; labelBox?: any; valueBox?: any }> = [];

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

  currentImageIndex: number = 0;       // 0-based
  currentImageIndexInput: number = 1;  // 1-based for input
  currentPageForConfig: number = 1;

  constructor(private fileService: FileUploadService) {}

  ngOnInit() {
    this.uploadedFiles = this.fileService.getFiles() || [];
    this.documentName = this.fileService.getDocumentType();
    this.updateFileContext();
  }

  private updateFileContext() {
    if (this.uploadedFiles.length === 0) {
      this.fileType = null;
      this.currentPageForConfig = 1;
      return;
    }

    const currentFile = this.uploadedFiles[this.currentImageIndex];
    if (currentFile.type.includes('pdf')) {
      this.fileType = 'pdf';
      this.showPDF = true;
      // For now, PDF page is not tracked from overlay, so we assume 1
      this.currentPageForConfig = 1;
    } else if (currentFile.type.includes('image')) {
      this.fileType = 'image';
      this.showPDF = false;
      this.currentPageForConfig = this.currentImageIndex + 1;
    }
  }

  getFileURL(file: File): string {
    if (!this.fileURLs.has(file)) {
      this.fileURLs.set(file, URL.createObjectURL(file));
    }
    return this.fileURLs.get(file)!;
  }

  showImageByNumber(num: number) {
    const index = num - 1;
    if (index >= 0 && index < this.uploadedFiles.length) {
      this.currentImageIndex = index;
      this.updateFileContext();
    } else {
      console.warn('Invalid image number');
    }
  }

  prevImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.currentImageIndexInput = this.currentImageIndex + 1;
      this.updateFileContext();
    }
  }

  nextImage() {
    if (this.currentImageIndex < this.uploadedFiles.length - 1) {
      this.currentImageIndex++;
      this.currentImageIndexInput = this.currentImageIndex + 1;
      this.updateFileContext();
    }
  }

  ngOnDestroy() {
    this.fileURLs.forEach(url => URL.revokeObjectURL(url));
    this.fileURLs.clear();
  }

  handleSearch(query: string) { console.log('Search query:', query); }
  handleSubmit() { console.log('Submit clicked'); }
  handleSave() { console.log('Save clicked'); }
  handleNext() { console.log('Next clicked'); }
  handlePromptChange(prompt: string) { console.log('Prompt changed:', prompt); }
  handleFieldConfigChange(config: any) { console.log('Field config changed:', config); }
  handleActionTriggered(action: string) { console.log('Action triggered:', action); }

  handlePageChange(pageNo: number) {
    this.currentPageForConfig = pageNo;
  }

  handleHighlight(evt: any) {
    // Handle special event to clear all highlights
    if (evt && evt.clearAll) {
      this.highlights = [];
      return;
    }

    // Filter out any existing highlight for the same key on the same page.
    const otherHighlights = this.highlights.filter(h => !(h.pageNo === evt.pageNo && h.key === evt.key));
    // Create a new array to ensure Angular's change detection updates the child component.
    this.highlights = [...otherHighlights, evt];
    console.log('handleHighlight: ', evt);
  }
}