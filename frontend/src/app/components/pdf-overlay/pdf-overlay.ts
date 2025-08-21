import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer'; // ✅ Make sure it's imported
import { MappingService } from '../../services/mapping.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-pdf-overlay',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PdfViewerModule, // ✅ ADD THIS LINE
    SafeUrlPipe
  ],
  templateUrl: './pdf-overlay.html',
  styleUrls: ['./pdf-overlay.css']
})
export class PdfOverlayComponent implements OnInit {
  @Input() fileURL: string | null = null;
  @Input() originalData: any;
  @Input() jsonData: any;

  fieldMapping: any[] = [];
  editedFields = new Set<string>();
  tempValues: { [key: string]: string } = {};

  constructor(private mappingService: MappingService) {}

  ngOnInit() {
    this.fieldMapping = this.mappingService.getMapping('tastybite');

    if (this.jsonData) {
      for (const field of this.fieldMapping) {
        this.tempValues[field.key] = this.jsonData[field.key] || '';
      }
    }
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
