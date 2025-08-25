import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';
import { CsvService } from './csv.service';

@Injectable({
  providedIn: 'root'
})
export class MappingService {
  private jsonCache: { [fileName: string]: any[] } = {};
  private csvData: any[] = [];
  private mappings: any[] = [
    { pageNo: 1, key: 'IRN No', top: 335, left:240, width: 500, height: 22 },
    { pageNo: 1, key: 'Exporter', top: 420, left: 120, width: 400, height: 20 },
    { pageNo: 1, key: 'Tax Invoice No', top: 550, left: 120, width: 200, height: 20 },
    { pageNo: 1, key: 'Tax Invoice Date', top: 1095, left: 1350, width: 150, height: 25 },
    { pageNo: 2, key: 'GST No', top: 276, left: 440, width: 250, height: 20 },
    { pageNo: 2, key: 'Consignee', top: 80, left: 100, width: 300, height: 20 },
    { pageNo: 2, key: 'State of Origin', top: 500, left: 300, width: 200, height: 20 },
    { pageNo: 2, key: 'District of Origin', top: 525, left: 300, width: 200, height: 20 },
    { pageNo: 3, key: 'Consignee', top: 50, left: 100, width: 120, height: 20 },
    { pageNo: 3, key: 'Buyer/Applicant', top: 80, left: 100, width: 120, height: 20 },
    { pageNo: 3, key: 'Tax Invoice No', top: 110, left: 100, width: 200, height: 20 },
    { pageNo: 3, key: 'Commission Payable', top: 140, left: 100, width: 150, height: 20 }
  ];

  constructor(private http: HttpClient, private csvService: CsvService) {}

  /** Load JSON file from assets */
  async loadJson(fileName: string): Promise<any[]> {
    if (this.jsonCache[fileName]) return this.jsonCache[fileName];
    const jsonData = await this.http.get<any[]>(`assets/${fileName}.json`).toPromise();
    this.jsonCache[fileName] = jsonData || [];
    return this.jsonCache[fileName];
  }

  /** Return current mappings */
  getMapping(documentType: string): any[] {
    return this.mappings;
  }

  /** Load CSV file and parse */
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

    // Filter all entries that lie inside the selection box
    const results = json.filter(word =>
      +word.pageNo === pageNo &&
      +word.left >= box.left &&
      +word.top >= box.top &&
      +word.right <= box.right &&
      +word.bottom <= box.bottom
    );

    // Map filtered entries into structured JSON
    const newEntries = results.map(word => ({
      pageNo: +word.pageNo,
      key: word.text,
      value: word.text,
      top: +word.top,
      left: +word.left,
      width: +word.right - +word.left,
      height: +word.bottom - +word.top
    }));

    // Add to mappings if not already present
    newEntries.forEach(entry => {
      const exists = this.mappings.some(
        m => m.key === entry.key && m.pageNo === entry.pageNo
      );
      if (!exists) this.mappings.push(entry);
    });

    // Add to jsonData and tempValues for frontend display
    newEntries.forEach(entry => {
      const pageKey = `page ${entry.pageNo}`;
      if (!jsonData[pageKey]) jsonData[pageKey] = {};
      jsonData[pageKey][entry.key] = entry.value;
      tempValues[entry.key] = entry.value;
    });

    return newEntries;
  }

  /**
   * Use CSV to find intersecting entries for an image selection box
   */
  async findTextInCsvBox(
    fileName: string,
    selection: number[], // [left, top, right, bottom] in natural image coords
    pageNo: number,
    jsonData: any,
    tempValues: { [key: string]: string }
  ): Promise<any[]> {
    try {
      const csvPath = `assets/csv/${fileName}.csv`;
      const csvText = await this.http
        .get(csvPath, { responseType: 'text' })
        .toPromise();

      if (!csvText) return [];

      const resultsByFile = this.csvService.parseCsvAndFindIntersections(csvText, selection);
      // Flatten and filter by file name if possible
      let rows: any[] = Object.values(resultsByFile).flat();
      if (!rows.length) return [];

      const baseName = fileName.replace(/\.[^/.]+$/, '');
      rows = rows.filter(r => {
        const rFile = (r.fileName || '').toString();
        const rBase = rFile.replace(/\.[^/.]+$/, '');
        return rBase === baseName || rFile.includes(baseName);
      });

      if (!rows.length) return [];

      const newEntries = rows.map(row => {
        const left = parseFloat(row.leftX);
        const top = parseFloat(row.topY);
        const right = parseFloat(row.rightX);
        const bottom = parseFloat(row.bottomY);
        return {
          pageNo,
          key: (row.Name || row.index || `field_${Date.now()}`) as string,
          value: (row.Name || '') as string,
          top,
          left,
          width: right - left,
          height: bottom - top
        };
      });

      // Add to mappings if not already present
      newEntries.forEach(entry => {
        const exists = this.mappings.some(
          m => m.key === entry.key && m.pageNo === entry.pageNo
        );
        if (!exists) this.mappings.push(entry);
      });

      // Add to jsonData and tempValues for frontend display
      newEntries.forEach(entry => {
        const pageKey = `page ${entry.pageNo}`;
        if (!jsonData[pageKey]) jsonData[pageKey] = {};
        jsonData[pageKey][entry.key] = entry.value;
        tempValues[entry.key] = entry.value;
      });

      return newEntries;
    } catch (err) {
      console.warn('CSV lookup failed', err);
      return [];
    }
  }
}
