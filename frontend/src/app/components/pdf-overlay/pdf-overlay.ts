import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { MappingService } from '../../services/mapping.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import Tesseract from 'tesseract.js';
import { CsvService, CsvRow } from '../../services/csv.service';

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

  // CSV cache and last results for UI display
  private csvTextCache: string | null = null;
  public csvSelectionResults: Array<{
    pageNo: number,
    box: { left: number; top: number; right: number; bottom: number },
    rows: CsvRow[],
    pairs?: Array<{ key: string; value: string }>,
    text?: string,
    parsed?: { key: string; value: string }
  }> = [];

  // Persisted selection rectangles (normalized coords) per page
  public drawnBoxes: Array<{ pageNo: number; left: number; top: number; right: number; bottom: number }> = [];

  constructor(private mappingService: MappingService, private csvService: CsvService) {}

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

    if (this.isImage) {
      // Normalize to unscaled coordinates
      const selBox = {
        left: box.left / this.scale,
        top: box.top / this.scale,
        right: (box.left + box.width) / this.scale,
        bottom: (box.top + box.height) / this.scale
      };

      // Persist the selection box for visual display
      this.drawnBoxes.push({ pageNo, ...selBox });

      // Load CSV and find intersections
      if (!this.csvTextCache) {
        const resp = await fetch('assets/csv/image1.csv');
        this.csvTextCache = await resp.text();
      }
      const resultsByFile = this.csvService.parseCsvAndFindIntersections(
        this.csvTextCache!,
        [selBox.left, selBox.top, selBox.right, selBox.bottom],
        {
          pageNo: pageNo - 1,
          fileName: 'image1',
          expand: 8
        }
      );
      const rows: CsvRow[] = resultsByFile['image1'] ? resultsByFile['image1'] : (Object.values(resultsByFile).flat() as CsvRow[]);

      // Also read text from JSON words within the selection (pageNo is 0-based in JSON)
      let text = '';
      let parsed: { key: string; value: string } | undefined;
      let words: any[] = [];
      let labelText: string | undefined;
      try {
        words = await this.mappingService.loadJson('json/file1');
        const jsonPage = pageNo - 1;
        const matched = words.filter((w: any) =>
          +w.pageNo === jsonPage &&
          +w.leftX >= selBox.left &&
          +w.topY >= selBox.top &&
          +w.rightX <= selBox.right &&
          +w.bottomY <= selBox.bottom
        );
        text = matched.map((w: any) => w.text).join(' ').trim();
        labelText = matched.map((w: any) => w.text).join(' ').trim().replace(/\s*:\s*$/, '');

        // Prefer explicit label:value inside selection
        if (text && text.includes(':')) {
          const idx = text.indexOf(':');
          const k = text.slice(0, idx).trim();
          const v = text.slice(idx + 1).trim();
          if (k && v) parsed = { key: k, value: v };
        }

        // If not parsed yet: find a JSON entry on the same page whose full text contains the label and a colon
        if (!parsed && labelText) {
          const labelLower = labelText.toLowerCase();
          const candidate = words.find((w: any) =>
            +w.pageNo === jsonPage && typeof w.text === 'string' && w.text.includes(':') && w.text.toLowerCase().includes(labelLower)
          );
          if (candidate) {
            const line: string = candidate.text;
            const idx = line.indexOf(':');
            if (idx > -1) {
              const k = line.slice(0, idx).trim();
              const v = line.slice(idx + 1).trim();
              if (k && v) parsed = { key: k, value: v };
            }
          }
        }

        // If no colon captured, try to read value to the right in a horizontal window
        // Note: this is a fallback only when there are no CSV matches later
        if (!parsed && matched.length > 0) {

          // Define a right-side window aligned with selection's vertical band
          const bandTol = 24;
          const searchLeft = selBox.right - 2;
          const searchRight = selBox.right + 1400; // wide window to capture long values
          const searchTop = selBox.top - bandTol;
          const searchBottom = selBox.bottom + bandTol;

          const rightWords = words
            .filter((w: any) =>
              +w.pageNo === jsonPage &&
              // any horizontal overlap with right window
              +w.rightX >= searchLeft && +w.leftX <= searchRight &&
              // vertical overlap with band
              !(+w.bottomY < searchTop || +w.topY > searchBottom)
            )
            .sort((a: any, b: any) => +a.leftX - +b.leftX);

          let rightText = rightWords.map((w: any) => w.text).join(' ').trim();
          // Clean leading separators like ':' or '-'
          rightText = rightText.replace(/^[\s:;\-]+/, '');

          if (labelText && rightText) {
            parsed = { key: labelText, value: rightText };
          }
        }
      } catch {}

      const pageKey = `page ${pageNo}`;
      if (!this.jsonData[pageKey]) this.jsonData[pageKey] = {};
      if (!this.jsonData[pageKey].selections) this.jsonData[pageKey].selections = [];

      // Save parsed into form/json if available
      if (parsed) {
        this.jsonData[pageKey][parsed.key] = parsed.value;
        this.tempValues[parsed.key] = parsed.value;
      }

      // Resolve Name→Value using CSV rectangles by reading JSON words inside each row box
      type Pair = { key: string; value: string; left: number; top: number; right: number; bottom: number };
      const pairs: Array<Pair> = [];
      if (rows.length && words.length) {
        const jsonPage = pageNo - 1;
        rows.forEach(r => {
          const l = parseFloat((r as any).leftX);
          const t = parseFloat((r as any).topY);
          const rgt = parseFloat((r as any).rightX);
          const btm = parseFloat((r as any).bottomY);
          if ([l, t, rgt, btm].some(isNaN)) return;
          let inside = words
            .filter((w: any) => +w.pageNo === jsonPage && +w.leftX >= l && +w.topY >= t && +w.rightX <= rgt && +w.bottomY <= btm)
            .sort((a: any, b: any) => +a.leftX - +b.leftX);

          // Fallback: if the row box only covers the label, expand to the right and accept overlap in band
          if (inside.length === 0) {
            const bandTol = 16;
            const searchLeft = rgt - 2;
            const searchRight = rgt + 1400;
            const searchTop = t - bandTol;
            const searchBottom = btm + bandTol;
            inside = words
              .filter((w: any) =>
                +w.pageNo === jsonPage &&
                +w.rightX >= searchLeft && +w.leftX <= searchRight &&
                !(+w.bottomY < searchTop || +w.topY > searchBottom)
              )
              .sort((a: any, b: any) => +a.leftX - +b.leftX);
          }

          const value = inside.map((w: any) => w.text).join(' ').trim();
          const key = (r as any).Name || 'Field';
          if (key && value) {
            pairs.push({ key, value, left: l, top: t, right: rgt, bottom: btm });
            this.jsonData[pageKey][key] = value;
            this.tempValues[key] = value;
          }
        });
      }

      // If there are CSV-derived pairs, prefer them for the final result
      if (pairs.length) {
        const selCx = (selBox.left + selBox.right) / 2;
        const selCy = (selBox.top + selBox.bottom) / 2;
        const labelLower = (labelText || '').toLowerCase();
        // Prefer pair whose key best matches labelText, else nearest center distance
        let best: Pair | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;
        pairs.forEach(p => {
          // textual match score
          let score = 0;
          if (labelLower && p.key) {
            const keyLower = p.key.toLowerCase();
            if (keyLower.includes(labelLower) || labelLower.includes(keyLower)) score += 1000;
            // bonus for exact match
            if (keyLower === labelLower) score += 500;
          }
          // proximity score (smaller distance → higher score)
          const cx = (p.left + p.right) / 2;
          const cy = (p.top + p.bottom) / 2;
          const dist = Math.hypot(cx - selCx, cy - selCy);
          score += 300 - Math.min(300, dist); // cap influence
          if (score > bestScore) {
            bestScore = score;
            best = p;
          }
        });
        if (best) parsed = { key: (best as any).key, value: (best as any).value };
      }

      this.jsonData[pageKey].selections.push({ box: selBox, data: rows, text, parsed, pairs });

      // Track for UI display
      this.csvSelectionResults.push({ pageNo, box: selBox, rows, pairs, text, parsed });

      this.selection = null;
      return;
    }

    // Fallback for PDFs (CSV mapping via mappingService)
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