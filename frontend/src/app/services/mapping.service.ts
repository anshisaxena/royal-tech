import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MappingService {
  private jsonCache: { [fileName: string]: any[] } = {};
  private csvData: any[] = [];

  /** Predefined static mappings (can be extended dynamically) */
  private mappings: any[] = [
    { pageNo: 1, key: 'IRN No', top: 335, left: 240, width: 500, height: 22 },
    { pageNo: 1, key: 'Exporter', top: 420, left: 120, width: 400, height: 20 },
    { pageNo: 1, key: 'Tax Invoice No', top: 1150, left: 1350, width: 200, height: 25 },
    { pageNo: 1, key: 'Tax Invoice Date', top: 1095, left: 1350, width: 150, height: 25 },
    { pageNo: 2, key: 'GST No', top: 276, left: 440, width: 250, height: 20 },
    { pageNo: 2, key: 'Consignee', top: 80, left: 100, width: 300, height: 20 },
    { pageNo: 2, key: 'State of Origin', top: 500, left: 300, width: 200, height: 20 },
    { pageNo: 2, key: 'District of Origin', top: 525, left: 300, width: 200, height: 20 },
    { pageNo: 3, key: 'Consignee', top: 322, left: 110, width: 120, height: 20 },
    { pageNo: 3, key: 'Buyer/Applicant', top: 322, left: 480, width: 120, height: 15 },
    { pageNo: 3, key: 'Tax Invoice No', top: 325, left: 600, width: 200, height: 15 },
    { pageNo: 3, key: 'Commission Payable', top: 140, left: 100, width: 150, height: 20 }
  ];

  /** Dictionary of field names → possible keywords */
  private FIELD_KEYWORDS: { [field: string]: string[] } = {
    invoiceNo: ["invoice no", "inv no", "ion no", "invoice number", "tax invoice no"],
    invoiceDate: ["invoice date", "date", "dt", "tax invoice date"],
    irnNo: ["irn no", "irn number", "irn"],
    exporter: ["exporter", "seller"],
    gstNo: ["gst no", "gstno", "gstin", "gst number", "gst"],
    consignee: ["consignee", "buyer", "receiver", "buyer/applicant", "buyer applicant"]
  };

  constructor(private http: HttpClient) {}

  /** Load JSON file from assets (cached) */
  async loadJson(fileName: string): Promise<any[]> {
    if (this.jsonCache[fileName]) return this.jsonCache[fileName];
    const jsonData = await firstValueFrom(
      this.http.get<any[]>(`assets/${fileName}.json`)
    ).catch(() => []);
    this.jsonCache[fileName] = jsonData || [];
    return this.jsonCache[fileName];
  }

  /** Get current mappings */
  getMapping(documentType: string): any[] {
    return this.mappings;
  }

  /** Load and parse CSV file (once only) */
  async loadCsv(file: File | string): Promise<void> {
    if (this.csvData.length > 0) return;

    return new Promise((resolve, reject) => {
      if (typeof file === 'string') {
        fetch(file)
          .then(res => res.text())
          .then(csvText => {
            this.parseCsv(csvText);
            resolve();
          })
          .catch(err => reject(err));
      } else {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          complete: (result: any) => {
            this.csvData = result.data;
            resolve();
          },
          error: (err: any) => reject(err)
        });
      }
    });
  }

  /** Helper to parse CSV text */
  private parseCsv(csvText: string) {
    const result = Papa.parse(csvText, { header: true, dynamicTyping: true });
    this.csvData = result.data;
  }

  /**
   * Get JSON entries from a selected box and add to mappings
   */
  async findTextInBox(
    fileName: string,
    box: { left: number; top: number; right: number; bottom: number },
    pageNo: number,
    jsonData: any,
    tempValues: { [key: string]: string }
  ): Promise<any[]> {
    const json = await this.loadJson(fileName);

    // Filter entries inside the selection box
    const results = json.filter(word =>
      +word.pageNo === pageNo &&
      +word.left >= box.left &&
      +word.top >= box.top &&
      +word.right <= box.right &&
      +word.bottom <= box.bottom
    );

    // Map into structured JSON
    const newEntries = results.map(word => ({
      pageNo: +word.pageNo,
      key: word.text,
      value: word.text,
      top: +word.top,
      left: +word.left,
      width: +word.right - +word.left,
      height: +word.bottom - +word.top
    }));

    // Add new mappings if not already present
    newEntries.forEach(entry => {
      const exists = this.mappings.some(
        m => m.key === entry.key && m.pageNo === entry.pageNo
      );
      if (!exists) this.mappings.push(entry);
    });

    // Update jsonData + tempValues for frontend
    newEntries.forEach(entry => {
      const pageKey = `page ${entry.pageNo}`;
      if (!jsonData[pageKey]) jsonData[pageKey] = {};
      jsonData[pageKey][entry.key] = entry.value;
      tempValues[entry.key] = entry.value;
    });

    return newEntries;
  }

  /**
   * Extract a single field from prompt (existing method)
   */
  async extractFieldFromPrompt(
    prompt: string,
    fileName: string,
    pageNo: number
  ): Promise<any | null> {
    const json = await this.loadJson(fileName);
    if (!json || json.length === 0) return null;

    const normalized = prompt.toLowerCase().replace(/extract\s*/g, "").trim();

    let targetField: string | null = null;
    for (const [field, keywords] of Object.entries(this.FIELD_KEYWORDS)) {
      if (keywords.some(k => normalized.includes(k))) {
        targetField = field;
        break;
      }
    }
    if (!targetField) return null;

    // Find a word on the page that matches any keyword for the target field
    const pageWords = json.filter(w => +w.pageNo === pageNo);
    const candidate = pageWords.find(word =>
      this.FIELD_KEYWORDS[targetField!].some(k => word.text?.toLowerCase().includes(k))
    );
    if (!candidate) return null;

    // If the candidate itself contains a label and value (e.g., "GSTNo: 27AAAC..."), split it
    let parsedKey = candidate.text;
    let parsedValue = "";
    const colonIdx = candidate.text.indexOf(":");
    if (colonIdx > 0 && colonIdx < candidate.text.length - 1) {
      parsedKey = candidate.text.slice(0, colonIdx).trim();
      parsedValue = candidate.text.slice(colonIdx + 1).trim();
    }

    // Otherwise, search to the right in the same horizontal band
    if (!parsedValue) {
      const bandTol = 18;
      const searchLeft = +candidate.right + 1;
      const searchRight = searchLeft + 1400;
      const searchTop = +candidate.top - bandTol;
      const searchBottom = +candidate.bottom + bandTol;
      const rightWords = pageWords
        .filter(w => +w.left >= searchLeft && +w.left <= searchRight && !(+w.bottom < searchTop || +w.top > searchBottom))
        .sort((a, b) => +a.left - +b.left);
      parsedValue = rightWords.map(w => w.text).join(' ').trim();
    }

    return {
      field: targetField,
      key: parsedKey,
      value: parsedValue,
      coords: {
        left: +candidate.left,
        top: +candidate.top,
        right: +candidate.right,
        bottom: +candidate.bottom
      },
      pageNo
    };
  }

  /**
   * Extract all fields for a page based on prompt (new method)
   * Example: "irn no" → returns full field setup for the page
   */
  async extractFieldsByPrompt(
    prompt: string,
    fileName: string,
    pageNo: number
  ): Promise<{ [key: string]: any } | null> {
    const json = await this.loadJson(fileName);
    if (!json || json.length === 0) return null;

    const normalized = prompt.toLowerCase().trim();

    // Determine target field from keywords
    let targetField: string | null = null;
    for (const [field, keywords] of Object.entries(this.FIELD_KEYWORDS)) {
      if (keywords.some(k => normalized.includes(k))) {
        targetField = field;
        break;
      }
    }
    if (!targetField) return null;

    // ✅ First: use predefined mappings for the page
    const pageMappings = this.mappings.filter(m => m.pageNo === pageNo);
    if (pageMappings.length > 0) {
      const fieldSetup: { [key: string]: any } = {};
      pageMappings.forEach(m => {
        fieldSetup[m.key] = m.value || ""; // placeholder, can replace with JSON lookup
      });
      return fieldSetup;
    }

    // 🔍 Fallback: use JSON
    const pageData = json.filter(word => +word.pageNo === pageNo);
    if (pageData.length === 0) return null;

    const fieldSetup: { [key: string]: any } = {};
    pageData.forEach(word => {
      fieldSetup[word.text] = word.text;
    });

    return fieldSetup;
  }
}
