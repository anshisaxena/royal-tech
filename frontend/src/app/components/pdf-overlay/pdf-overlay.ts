import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { MappingService } from '../../services/mapping.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-pdf-overlay',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PdfViewerModule,
    SafeUrlPipe
  ],
  templateUrl: './pdf-overlay.html',
  styleUrls: ['./pdf-overlay.css']
})
export class PdfOverlayComponent implements OnInit {
  @Input() fileURL: string | null = null;
  @Input() fileObj: File | null = null;
  @Input() originalData: any;
  @Input() jsonData: any;
  @Input() currentPage: number = 1; // for PDFs

  fieldMapping: any[] = [];
  editedFields = new Set<string>();
  tempValues: { [key: string]: string } = {};

  isImage = false;
  scale = 1;

  constructor(private mappingService: MappingService) {}

  ngOnInit() {
    this.isImage = this.fileObj?.type.startsWith('image/') || false;
    this.updatePageFields();
  }

  /** Called when PDF loads */
  onPdfLoad(pdf: any) {
    this.updatePdfScale(pdf);
  }

  /** Called when PDF page changes */
  onPageChange(pageNo: number) {
    this.currentPage = pageNo;
    this.updatePageFields();
    setTimeout(() => this.updatePdfScale(), 100);
  }

  /** Called when image finishes loading */
  onImageLoad(img: HTMLImageElement) {
    if (!img || !this.fieldMapping.length) return;
    this.scale = img.clientWidth / img.naturalWidth;
    this.updatePageFields(); // refresh overlay positions
  }

  /** Initialize fieldMapping and tempValues per page */
  updatePageFields() {
    const allFields = this.mappingService.getMapping('godrej') || [];
    const pageNo = this.isImage ? this.currentPage : this.currentPage;
    this.fieldMapping = allFields.filter(f => f.pageNo === pageNo);

    // Initialize tempValues
    this.fieldMapping.forEach(field => {
      const pageKey = `page ${pageNo}`;
      const pageData = this.jsonData?.[pageKey] || {};
      this.tempValues[field.key] = pageData[field.key] || '';
    });
  }

  /** Update PDF scale after load */
  updatePdfScale(pdf?: any) {
    if (this.isImage) return;

    if (pdf) {
      const page = pdf.getPage(this.currentPage);
      page.then((p: any) => {
        const viewport = p.getViewport({ scale: 1 });
        const container = document.querySelector('.pdf-viewer-container') as HTMLElement;
        if (container && viewport) {
          this.scale = container.clientWidth / viewport.width;
        }
      });
    }
  }

  /** Update jsonData and editedFields on blur */
  onBlur(key: string) {
    const pageKey = `page ${this.currentPage}`;
    const pageData = this.jsonData?.[pageKey] || {};

    pageData[key] = this.tempValues[key];
    this.jsonData[pageKey] = pageData;

    const originalValue = this.originalData?.[key];
    if (this.tempValues[key] !== originalValue) {
      this.editedFields.add(key);
    } else {
      this.editedFields.delete(key);
    }
  }
}
