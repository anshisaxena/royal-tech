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
  @Input() highlights: Array<{ pageNo: number; key: string; labelText?: string; value: string; labelBox?: { left: number; top: number; right: number; bottom: number }; valueBox?: { left: number; top: number; right: number; bottom: number } }> = [];
  @Input() showHighlights: boolean = true;

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
  private csvTextCache: Map<number, string> = new Map();
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

  // Hide static overlays by default (show only on prompt-driven highlights)
  public showStaticOverlays: boolean = false;

  public Math = Math;

  constructor(private mappingService: MappingService, private csvService: CsvService) {}

  ngOnInit() {
    this.isImage = this.fileObj?.type.startsWith('image/') || false;
    console.log("PdfOverlayComponent highlights input: ", this.highlights);
    console.log("PdfOverlayComponent currentPage: ", this.currentPage);
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

  onHighlightBlur(highlight: { key: string; value: string; pageNo: number }) {
    const pageKey = `page ${highlight.pageNo}`;
    if (!this.jsonData[pageKey]) {
      this.jsonData[pageKey] = {};
    }
    this.jsonData[pageKey][highlight.key] = highlight.value;

    const originalValue = this.originalData?.[highlight.key];
    if (highlight.value !== originalValue) {
      this.editedFields.add(highlight.key);
    } else {
      this.editedFields.delete(highlight.key);
    }
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
      // --- Expand selection box for better label/value accuracy ---
      // Give more margin from the top and less to the left
      const expandTop = 18;   // pixels (image coordinates)
      const expandLeft = 4;   // pixels (image coordinates)
      const expandRight = 2;  // pixels (image coordinates)
      const expandBottom = 2; // pixels (image coordinates)

      // Normalize to unscaled coordinates and expand
      const selBox = {
        left: Math.max(0, (box.left - expandLeft) / this.scale),
        top: Math.max(0, (box.top - expandTop) / this.scale),
        right: (box.left + box.width + expandRight) / this.scale,
        bottom: (box.top + box.height + expandBottom) / this.scale
      };

      // Persist the selection box for visual display
      this.drawnBoxes.push({ pageNo, ...selBox });

      const csvFileName = `image${pageNo}`;
      const jsonFileName = `file${pageNo}`;

      // Load CSV and find intersections
      if (!this.csvTextCache.has(pageNo)) {
        const resp = await fetch(`assets/csv/${csvFileName}.csv`);
        this.csvTextCache.set(pageNo, await resp.text());
      }
      const csvContent = this.csvTextCache.get(pageNo)!;
      const resultsByFile = this.csvService.parseCsvAndFindIntersections(
        csvContent,
        [selBox.left, selBox.top, selBox.right, selBox.bottom],
        {
          pageNo: pageNo - 1,
          fileName: csvFileName,
          expand: 8
        }
      );
      const rows: CsvRow[] = resultsByFile[csvFileName] ? resultsByFile[csvFileName] : (Object.values(resultsByFile).flat() as CsvRow[]);

      // Also read text from JSON words within the selection (pageNo is 0-based in JSON)
      let text = '';
      let parsed: { key: string; value: string } | undefined;
      let words: any[] = [];
      let labelText: string | undefined;
      try {
        words = await this.mappingService.loadJson(`json/${jsonFileName}`);
        const jsonPage = pageNo - 1;
        // Find all words on this page that overlap the selection box
        const matched = words.filter((w: any) =>
          +w.pageNo === jsonPage &&
          +w.rightX > selBox.left &&
          +w.leftX < selBox.right &&
          +w.bottomY > selBox.top &&
          +w.topY < selBox.bottom
        );

        // --- Improved: Use CSV row containing selection center as primary label/value ---
        let selCx = (selBox.left + selBox.right) / 2;
        let selCy = (selBox.top + selBox.bottom) / 2;
        let bestRow: CsvRow | undefined;
        let minDist = Number.POSITIVE_INFINITY;
        for (const r of rows) {
          const l = parseFloat((r as any).leftX);
          const t = parseFloat((r as any).topY);
          const rgt = parseFloat((r as any).rightX);
          const btm = parseFloat((r as any).bottomY);
          if (selCx >= l && selCx <= rgt && selCy >= t && selCy <= btm) {
            bestRow = r;
            break;
          }
          // If not inside, track nearest center
          const cx = (l + rgt) / 2, cy = (t + btm) / 2;
          const dist = Math.hypot(cx - selCx, cy - selCy);
          if (dist < minDist) {
            minDist = dist;
            bestRow = r;
          }
        }

        // If a CSV row is found, use its Name as label and extract value from JSON words inside its box
        if (bestRow) {
          const l = parseFloat((bestRow as any).leftX);
          const t = parseFloat((bestRow as any).topY);
          const rgt = parseFloat((bestRow as any).rightX);
          const btm = parseFloat((bestRow as any).bottomY);
          const jsonPage = pageNo - 1;
          let key = (bestRow as any).Name || 'Field';
          let inside;
          if (key && key.toLowerCase().includes('exporter')) {
            // For Exporter, restrict to a small region just below the IRN box
            // Find the IRN box
            const irnRow = rows.find(r =>
              (r as any).Name && String((r as any).Name).toLowerCase().includes('irn')
            );
            if (irnRow) {
              const irnBottom = parseFloat((irnRow as any).bottomY);
              const irnLeft = parseFloat((irnRow as any).leftX);
              const irnRight = parseFloat((irnRow as any).rightX);
              // Only take words between IRN bottom and Exporter bottom, and horizontally overlapping IRN/Exporter
              inside = words
                .filter((w: any) =>
                  +w.pageNo === jsonPage &&
                  +w.leftX >= Math.min(irnLeft, l) &&
                  +w.rightX <= Math.max(irnRight, rgt) &&
                  +w.topY >= irnBottom &&
                  +w.bottomY <= btm
                )
                .sort((a: any, b: any) => +a.topY - +b.topY || +a.leftX - +b.leftX);
            } else {
              // fallback: just use Exporter box
              inside = words
                .filter((w: any) =>
                  +w.pageNo === jsonPage &&
                  +w.leftX >= l &&
                  +w.topY >= t &&
                  +w.rightX <= rgt &&
                  +w.bottomY <= btm
                )
                .sort((a: any, b: any) => +a.topY - +b.topY || +a.leftX - +b.leftX);
            }
          } else {
            // Default logic for other fields
            inside = words
              .filter((w: any) =>
                +w.pageNo === jsonPage &&
                +w.leftX >= l &&
                +w.topY >= t &&
                +w.rightX <= rgt &&
                +w.bottomY <= btm
              )
              .sort((a: any, b: any) => +a.topY - +b.topY || +a.leftX - +b.leftX);
          }
          let value = inside.map((w: any) => w.text).join(' ').trim();

          // --- Correction for IRN, GST, Exporter: strip label from value if present ---
          if (key && value) {
            // Remove label and colon from value if present at start (case-insensitive)
            const labelPattern = new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:?\\s*', 'i');
            value = value.replace(labelPattern, '').trim();
            parsed = { key, value };
            labelText = key;
          }
        }

        // If not found, fallback to explicit label:value inside selection (multi-word)
        if (!parsed && matched.length > 0) {
          const joined = matched.map((w: any) => w.text).join(' ').trim();
          // Try to split on colon or similar
          const colonIdx = joined.indexOf(':');
          if (colonIdx > 0) {
            const k = joined.slice(0, colonIdx).trim();
            const v = joined.slice(colonIdx + 1).trim();
            if (k && v) parsed = { key: k, value: v };
          }
        }

        // If still not found, fallback to nearest label in JSON (old logic)
        if (!parsed) {
          let labelWord: any = null;
          let label = '';
          let minDist = Number.POSITIVE_INFINITY;
          const labelCandidates = words.filter((w: any) =>
            +w.pageNo === jsonPage &&
            typeof w.text === 'string' &&
            (
              w.text.endsWith(':') ||
              w.text.match(/No\.?$/i) ||
              w.text.match(/No\s*:/i) ||
              w.text.match(/GSTNo\.?$/i) ||
              w.text.match(/GSTNo\s*:?/i) ||
              w.text.match(/Consignee/i) ||
              w.text.match(/Buyer\/Applicant/i) ||
              w.text.match(/Tax Invoice/i) ||
              w.text.match(/Invoice/i) ||
              w.text.match(/Exporter/i)
            )
          );
          for (const w of labelCandidates) {
            const cx = (+w.leftX + +w.rightX) / 2;
            const cy = (+w.topY + +w.bottomY) / 2;
            const dist = Math.abs(selCy - cy) * 2 + Math.abs(selCx - cx);
            if (dist < minDist) {
              minDist = dist;
              labelWord = w;
              label = w.text.replace(/:$/, '').trim();
            }
          }
          if (!labelWord && matched.length > 0) {
            labelWord = matched[0];
            label = matched[0].text;
          }
          if (labelWord) {
            const bandTol = 12;
            const searchLeft = +labelWord.rightX + 1;
            const searchRight = searchLeft + 800;
            const searchTop = +labelWord.topY - bandTol;
            const searchBottom = +labelWord.bottomY + bandTol;
            const rightWords = words
              .filter((w: any) =>
                +w.pageNo === jsonPage &&
                +w.leftX >= searchLeft && +w.leftX <= searchRight &&
                +w.topY <= searchBottom && +w.bottomY >= searchTop
              )
              .sort((a: any, b: any) => +a.leftX - +b.leftX);
            let rightText = rightWords.map((w: any) => w.text).join(' ').trim();
            rightText = rightText.replace(/^[\s:;\-]+/, '');
            let sameWordValue: string | undefined;
            if (labelWord.text && labelWord.text.includes(':')) {
              const idx = labelWord.text.indexOf(':');
              const k = labelWord.text.slice(0, idx).trim();
              const v = labelWord.text.slice(idx + 1).trim();
              if (k && v) {
                label = k;
                sameWordValue = v;
              }
            }
            if (label && sameWordValue) {
              parsed = { key: label, value: sameWordValue };
            } else if (label && rightText) {
              parsed = { key: label, value: rightText };
            }
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
      if (pairs.length && !parsed) {
        // Only use if not already parsed from bestRow above
        const selCx = (selBox.left + selBox.right) / 2;
        const selCy = (selBox.top + selBox.bottom) / 2;
        let best: Pair | null = null;
        let minDist = Number.POSITIVE_INFINITY;
        pairs.forEach(p => {
          const cx = (p.left + p.right) / 2;
          const cy = (p.top + p.bottom) / 2;
          const dist = Math.hypot(cx - selCx, cy - selCy);
          if (dist < minDist) {
            minDist = dist;
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