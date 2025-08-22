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
  @Input() fileURL: string | null = null;   // Blob/object URL
  @Input() fileObj: File | null = null;     // File object to detect type
  @Input() originalData: any;
  @Input() jsonData: any;

  fieldMapping: any[] = [];
  editedFields = new Set<string>();
  tempValues: { [key: string]: string } = {};

  isImage = false;
  scale = 1;

  constructor(private mappingService: MappingService) {}

  ngOnInit() {
    if (this.fileObj) {
      this.isImage = this.fileObj.type.startsWith('image/');
    }

    this.fieldMapping = this.mappingService.getMapping('godrej');

    if (this.jsonData) {
      this.fieldMapping.forEach(field => {
        this.tempValues[field.key] = this.jsonData[field.key] || '';
      });
    }
  }

  onPdfLoad(pdf: any) {
    if (this.isImage) return; // skip scaling for images

    const page = pdf.getPage(1);
    page.then((p: any) => {
      const viewport = p.getViewport({ scale: 1 });
      const canvas = document.querySelector('.ng2-pdf-viewer-container canvas') as HTMLCanvasElement;
      if (canvas) {
        this.scale = canvas.clientWidth / viewport.width;
      }
    });
  }

  onBlur(key: string) {
    const newValue = this.tempValues[key];
    const originalValue = this.originalData?.[key];

    if (this.jsonData) {
      this.jsonData[key] = newValue;

      if (newValue !== originalValue) {
        this.editedFields.add(key);
      } else {
        this.editedFields.delete(key);
      }
    }
  }
}
