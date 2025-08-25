import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { MappingService } from '../../services/mapping.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import Tesseract from 'tesseract.js';

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
  @Input() jsonData: any = {};
  @Input() currentPage: number = 1;

  fieldMapping: any[] = [];
  editedFields = new Set<string>();
  tempValues: { [key: string]: string } = {};
  ocrSelections: { [key: string]: { top: number, left: number, width: number, height: number } } = {};

  isImage = false;
  scale = 1;
  ocrScaleX = 1;
  ocrScaleY = 1;

  selection: { top: number, left: number, width: number, height: number } | null = null;
  private isSelecting = false;
  private startX = 0;
  private startY = 0;

  constructor(private mappingService: MappingService) {}

  ngOnInit() {
    this.isImage = this.fileObj?.type.startsWith('image/') || false;
    this.updatePageFields();
  }

  onPdfLoad(pdf: any) { this.updatePdfScale(pdf); }

  onPageChange(pageNo: number) {
    this.currentPage = pageNo;
    this.updatePageFields();
    setTimeout(() => this.updatePdfScale(), 100);
  }

  onImageLoad(img: HTMLImageElement) {
    if (!img) return;
    this.scale = img.clientWidth / img.naturalWidth;
    this.ocrScaleX = img.naturalWidth / img.clientWidth;
    this.ocrScaleY = img.naturalHeight / img.clientHeight;
    this.updatePageFields();
  }

  updatePageFields() {
    const allFields = this.mappingService.getMapping('godrej') || [];
    const pageNo = this.currentPage;
    this.fieldMapping = allFields.filter(f => f.pageNo === pageNo);

    const pageKey = `page ${pageNo}`;
    if (!this.jsonData[pageKey]) this.jsonData[pageKey] = {};

    this.fieldMapping.forEach(field => {
      const pageData = this.jsonData[pageKey];
      const originalValue = this.originalData?.[field.key] || '';
      this.tempValues[field.key] = pageData[field.key] ?? originalValue;
    });
  }

  updatePdfScale(pdf?: any) {
    if (this.isImage) return;
    if (pdf) {
      const page = pdf.getPage(this.currentPage);
      page.then((p: any) => {
        const viewport = p.getViewport({ scale: 1 });
        const container = document.querySelector('.pdf-viewer-container') as HTMLElement;
        if (container && viewport) this.scale = container.clientWidth / viewport.width;
      });
    }
  }

  onBlur(key: string) {
    const pageKey = `page ${this.currentPage}`;
    if (!this.jsonData[pageKey]) this.jsonData[pageKey] = {};
    const pageData = this.jsonData[pageKey];
    pageData[key] = this.tempValues[key];
    this.jsonData[pageKey] = pageData;

    const originalValue = this.originalData?.[key];
    if (this.tempValues[key] !== originalValue) this.editedFields.add(key);
    else this.editedFields.delete(key);
  }

  // ------------------ Selection Logic ------------------
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    const container = (event.target as HTMLElement).closest('.pdf-viewer-container') as HTMLElement;
    if (!container || !this.isImage) return;
    this.isSelecting = true;
    this.startX = event.offsetX;
    this.startY = event.offsetY;
    this.selection = { top: this.startY, left: this.startX, width: 0, height: 0 };
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isSelecting || !this.selection) return;
    const width = event.offsetX - this.startX;
    const height = event.offsetY - this.startY;
    this.selection.width = Math.abs(width);
    this.selection.height = Math.abs(height);
    this.selection.left = width < 0 ? event.offsetX : this.startX;
    this.selection.top = height < 0 ? event.offsetY : this.startY;
  }

  @HostListener('mouseup', ['$event'])
  async onMouseUp(event: MouseEvent) {
    if (!this.isSelecting || !this.selection) return;
    this.isSelecting = false;
    await this.onBoxSelected(this.selection);
  }

  // ------------------ Handle Box Selection ------------------
  private async onBoxSelected(box: { top: number, left: number, width: number, height: number }) {
    const pageNo = this.currentPage;

    if (this.isImage && this.fileObj) {
      const imgElement = document.querySelector('.image-viewer') as HTMLImageElement;
      if (!imgElement) return;

      // Compute selection in natural image coordinates
      const sx = box.left * this.ocrScaleX;
      const sy = box.top * this.ocrScaleY;
      const sw = box.width * this.ocrScaleX;
      const sh = box.height * this.ocrScaleY;
      const selectionRect = [sx, sy, sx + sw, sy + sh];

      const fileName = this.fileObj ? this.fileObj.name.split('.')[0] : 'file1';
      // Try CSV-based lookup first
      const csvResults = await this.mappingService.findTextInCsvBox(
        fileName,
        selectionRect,
        pageNo,
        this.jsonData,
        this.tempValues
      );

      if (csvResults.length > 0) {
        this.updatePageFields();
        this.selection = null;
        return;
      }

      // Fallback to OCR if CSV had no matches
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, sw, sh);

      const croppedDataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(croppedDataUrl, 'eng', { logger: m => console.log(m) });
      const text = result.data.text.replace(/\s+/g, ' ').trim();

      const pageKey = `page ${pageNo}`;
      if (!this.jsonData[pageKey]) this.jsonData[pageKey] = {};
      const key = `ocr_field_${Date.now()}`;
      this.jsonData[pageKey][key] = text;
      this.tempValues[key] = text;

      // Store coordinates for overlay rendering
      this.ocrSelections[key] = { top: box.top, left: box.left, width: box.width, height: box.height };

      this.selection = null;
      return;
    }

    // Fallback for PDFs (CSV mapping)
    const selBox = {
      left: box.left / this.scale,
      top: box.top / this.scale,
      right: (box.left + box.width) / this.scale,
      bottom: (box.top + box.height) / this.scale
    };

    const fileName = this.fileObj ? this.fileObj.name.split('.')[0] : 'file1';

    const results = await this.mappingService.findTextInBox(
      fileName,
      selBox,
      pageNo - 1,
      this.jsonData,
      this.tempValues
    );

    if (results.length > 0) {
      const pageKey = `page ${pageNo}`;
      if (!this.jsonData[pageKey]) this.jsonData[pageKey] = {};
      results.forEach(result => {
        this.jsonData[pageKey][result.key] = result.value;
        this.tempValues[result.key] = result.value;
      });
    }

    this.selection = null;
  }

  isInFieldMapping(key: string): boolean {
    return this.fieldMapping.some(f => f.key === key);
  }

  // ------------------ Overlay positioning helpers ------------------
  getAllKeys(): string[] {
    const pageKey = `page ${this.currentPage}`;
    return this.jsonData[pageKey] ? Object.keys(this.jsonData[pageKey]) : [];
  }

  getFieldTop(key: string): number {
    const field = this.fieldMapping.find(f => f.key === key);
    return field ? field.top * this.scale : (this.ocrSelections[key]?.top ?? 0);
  }

  getFieldLeft(key: string): number {
    const field = this.fieldMapping.find(f => f.key === key);
    return field ? (field.left + field.width + 5) * this.scale : (this.ocrSelections[key]?.left ?? 0);
  }

  getFieldWidth(key: string): number {
    const field = this.fieldMapping.find(f => f.key === key);
    return field ? field.width * this.scale : (this.ocrSelections[key]?.width ?? 200);
  }

  getFieldHeight(key: string): number {
    const field = this.fieldMapping.find(f => f.key === key);
    return field ? field.height * this.scale : (this.ocrSelections[key]?.height ?? 30);
  }
}
