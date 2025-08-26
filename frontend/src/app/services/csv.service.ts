import { Injectable } from '@angular/core';
import * as Papa from 'papaparse';

export interface CsvRow {
  index: string;
  Name: string;
  leftX: string;
  topY: string;
  rightX: string;
  bottomY: string;
  fileName: string;
  // Add other fields as needed
}

@Injectable({
  providedIn: 'root',
})
export class CsvService {
  constructor() {}

  rectanglesIntersect(r1: number[], r2: number[]): boolean {
    return !(
      r1[2] < r2[0] || 
      r2[2] < r1[0] || 
      r1[3] < r2[1] || 
      r2[3] < r1[1] 
    );
  }

  parseCsvAndFindIntersections(
    csvContent: string,
    selection: number[],
    opts?: { pageNo?: number; fileName?: string; expand?: number }
  ): { [fileName: string]: CsvRow[] } {
    const resultsByFile: { [fileName: string]: CsvRow[] } = {};
    const expand = opts?.expand ?? 0; // tolerance pixels

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    parsed.data.forEach((row: any) => {
      // Defensive parse floats
      const leftX = parseFloat(row.leftX);
      const topY = parseFloat(row.topY);
      const rightX = parseFloat(row.rightX);
      const bottomY = parseFloat(row.bottomY);
      const rowPage = row.pageNo !== undefined && row.pageNo !== '' ? parseInt(row.pageNo, 10) : undefined;

      if (
        !isNaN(leftX) &&
        !isNaN(topY) &&
        !isNaN(rightX) &&
        !isNaN(bottomY) &&
        // optional page filter
        (opts?.pageNo === undefined || rowPage === undefined || rowPage === opts.pageNo) &&
        // optional filename filter
        (opts?.fileName === undefined || (row.fileName || '').toString() === opts.fileName) &&
        this.rectanglesIntersect([
          leftX - expand,
          topY - expand,
          rightX + expand,
          bottomY + expand
        ], selection)
      ) {
        const fileName = row.fileName || 'unknown_file';
        if (!resultsByFile[fileName]) {
          resultsByFile[fileName] = [];
        }
        resultsByFile[fileName].push(row);
      }
    });

    return resultsByFile;
  }
}
