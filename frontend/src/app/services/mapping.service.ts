import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MappingService {
  private jsonCache: { [fileName: string]: any[] } = {};
  private sampleJsonCache: { [page: number]: any } = {};
  private csvData: any[] = [];
  private csvLoaded: boolean = false;

  /** Predefined static mappings (can be extended dynamically) */
  private mappings: any[] = [
    // Page 1
    { pageNo: 1, key: 'IRN No', top: 310, left: 97, width: 1100, height: 50 },
    { pageNo: 2, key: 'IRN No', top: 460, left: 180, width: 1100, height: 50 },
    { pageNo: 3, key: 'IRN No', top: 460, left: 180, width: 1100, height: 50 },
    { pageNo: 1, key: 'Exporter', top: 415, left: 122, width: 400, height: 20 },
    { pageNo: 1, key: 'Consignee', top: 1405, left: 159, width: 300, height: 20 },
    { pageNo: 1, key: 'Buyer/Applicant', top: 1407, left: 1088, width: 400, height: 20 },
    { pageNo: 1, key: 'Tax Invoice No', top: 1408, left: 1815, width: 200, height: 25 },
    { pageNo: 1, key: 'Tax Invoice Date', top: 1408, left: 1815, width: 400, height: 25 },
    { pageNo: 1, key: 'Mode of Shipment', top: 1700, left: 117, width: 240, height: 40 },
    { pageNo: 1, key: 'Airport of Loading', top: 1994, left: 696, width: 230, height: 40 },
    { pageNo: 1, key: 'Airport of Discharge', top: 1993, left: 120, width: 255, height: 42 },
    // Table Headers (approximations for reliable finding)
    { pageNo: 1, key: 'Sales Order', top: 2390, left: 118, width: 160, height: 40 }, // Example
    { pageNo: 1, key: 'No. &kind of pkgs', top: 2390, left: 400, width: 150, height: 80 }, // Example
    { pageNo: 1, key: 'Description of Goods', top: 2390, left: 870, width: 300, height: 40 }, // Example
    { pageNo: 1, key: 'Gross weight', top: 2390, left: 1460, width: 180, height: 80 }, // Example
    { pageNo: 1, key: 'Quantity', top: 2390, left: 1690, width: 120, height: 40 }, // Example
    { pageNo: 1, key: 'Amount', top: 2390, left: 2218, width: 120, height: 40 }, // Example
    // Page 2
    { pageNo: 2, key: 'Exporter', top: 538, left: 159, width: 400, height: 20 },
    { pageNo: 2, key: 'GST No', top: 777, left: 1088, width: 350, height: 20 },
    { pageNo: 2, key: 'Consignee', top: 894, left: 159, width: 300, height: 20 },
    { pageNo: 2, key: 'Buyer/Applicant', top: 894, left: 1088, width: 400, height: 20 },
    { pageNo: 2, key: 'Tax Invoice No', top: 895, left: 1814, width: 200, height: 25 },
    { pageNo: 2, key: 'Tax Invoice Date', top: 895, left: 1814, width: 400, height: 25 },
    { pageNo: 2, key: 'State of Origin', top: 1404, left: 619, width: 200, height: 20 },
    { pageNo: 2, key: 'District of Origin', top: 1443, left: 620, width: 200, height: 20 },
    // Page 2 Table Headers
    { pageNo: 2, key: 'Sales Order', top: 1287, left: 118, width: 160, height: 40 },
    { pageNo: 2, key: 'Description of Goods', top: 1286, left: 871, width: 300, height: 40 },
    { pageNo: 2, key: 'Quantity', top: 1283, left: 1690, width: 120, height: 40 },
    { pageNo: 2, key: 'Amount', top: 1286, left: 2219, width: 120, height: 40 },
    // Page 3
    { pageNo: 3, key: 'Consignee', top: 894, left: 161, width: 300, height: 20 },
    { pageNo: 3, key: 'Buyer/Applicant', top: 894, left: 1088, width: 400, height: 20 },
    { pageNo: 3, key: 'Tax Invoice No', top: 894, left: 1814, width: 200, height: 25 },
    { pageNo: 3, key: 'Commission Payable', top: 1405, left: 159, width: 250, height: 20 }
  ];

  /** Dictionary of field names → possible keywords */
  private FIELD_KEYWORDS: { [field: string]: string[] } = {
    invoiceNo: ["invoice no", "inv no", "ion no", "invoice number", "tax invoice no", "bill no", "tax invoice no. & date"],
    invoiceDate: ["invoice date", "date", "dt", "tax invoice date", "bill date", "tax invoice no. & date"],
    irnNo: ["irn no", "irn number", "irn", "invoice reference number"],
    cinNo: ["cin no", "cin"], // Not in sample.json, but might be in others
    supplierName: ["exporter", "seller", "supplier", "vendor name", "supplier name"],
    importerName: ["consignee", "receiver", "customer", "importer name"],
    gstNo: ["gst no", "gstno", "gstin", "gst number", "gst"],
    buyerApplicant: ["buyer/applicant", "buyer applicant", "buyer"], // Not in sample.json
    countryOfOrigin: ["country of origin of goods", "country of origin","countryOfOrigin"],
    finalDestination: ["country of final destination", "final destination"],
    stateOfOrigin: ["state of origin"],
    districtOfOrigin: ["district of origin"],
    modeOfShipment: ["mode of shipment"],
    airportOfLoading: ["airport of loading"],
    airportOfDischarge: ["airport of discharge"],
    // Table fields from user request
    salesOrder: ["sales order"],
    descriptionOfGoods: ["description of goods"],
    noOfPackages: ["no of packages", "no. &kind of pkgs", "no & kind of pkgs", "no and kind of packages", "no. &kind", "no. of packages"],
    quantity: ["quantity", "display quantity"],
    unit: ["unit"],
    TotalGrossWeight: ["gross weight", "items table gross weight", "total gross weight"],
    TotalNetWeight: ["net weight", "total net weight"],
    amount: ["amount", "items table amount", "under items table amount"],
  };

  constructor(private http: HttpClient) {}

  /** Load sample JSON file from assets (cached) */
  async loadSampleJson(): Promise<any> {
    return this.loadSampleJsonForPage(1);
  }

  /** Load sample JSON file for a specific page from assets (cached) */
  async loadSampleJsonForPage(page: number): Promise<any> {
    if (this.sampleJsonCache[page]) {
      return this.sampleJsonCache[page];
    }
    const fileName = `assets/sample${page > 1 ? page : ''}.json`;
    const jsonData = await firstValueFrom(this.http.get<any>(fileName)).catch(() => null);
    this.sampleJsonCache[page] = jsonData;
    return jsonData;
  }

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
    if (this.csvLoaded) return;

    return new Promise((resolve, reject) => {
      if (typeof file === 'string') {
        fetch(file)
          .then(res => res.text())
          .then(csvText => {
            this.parseCsv(csvText);
            this.csvLoaded = true;
            resolve();
          })
          .catch(err => reject(err));
      } else {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          complete: (result: any) => {
            this.csvData = result.data;
            this.csvLoaded = true;
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

  /** Normalizes a word object to have consistent coordinate properties. */
  private normalizeWord(word: any): any {
    const left = +(word.left || word.leftX || 0);
    const top = +(word.top || word.topY || 0);
    const right = +(word.right || word.rightX || 0);
    const bottom = +(word.bottom || word.bottomY || 0);

    return {
      ...word,
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  /**
   * Enhanced method to find text in box using both JSON and CSV data
   */
  async findTextInBox(
    fileName: string,
    box: { left: number; top: number; right: number; bottom: number },
    pageNo: number,
    jsonData: any,
    tempValues: { [key: string]: string }
  ): Promise<any[]> {
    const json = await this.loadJson(fileName);

    // Filter entries inside the selection box from JSON
    const jsonResults = json.filter(word =>
      +word.pageNo === pageNo &&
      +word.left >= box.left &&
      +word.top >= box.top &&
      +word.right <= box.right &&
      +word.bottom <= box.bottom
    );

    // Also check CSV data for matches in the same area
    let csvResults: any[] = [];
    if (this.csvLoaded && this.csvData.length > 0) {
      csvResults = this.csvData.filter((row: any) => {
        return row.pageNo == pageNo &&
               row.leftX >= box.left &&
               row.topY >= box.top &&
               row.rightX <= box.right &&
               row.bottomY <= box.bottom;
      });
    }

    // Combine results from both sources
    const allResults = [...jsonResults, ...csvResults];

    // Map into structured JSON
    const newEntries = allResults.map(item => ({
      pageNo: +item.pageNo,
      key: item.text || item.Name || 'Unknown',
      value: item.text || item.Value || '',
      top: +item.top || +item.topY || 0,
      left: +item.left || +item.leftX || 0,
      width: ((+item.right || +item.rightX || 0) - (+item.left || +item.leftX || 0)),
      height: ((+item.bottom || +item.bottomY || 0) - (+item.top || +item.topY || 0))
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
   * Enhanced method to extract a single field from prompt
   */
  async extractFieldFromPrompt(
    prompt: string,
    fileName: string,
    docPageNo: number
  ): Promise<any | null> {
    const rawJson = await this.loadJson(fileName);
    let result: any = null;
    if (!rawJson || rawJson.length === 0) return null;

    const json = rawJson.map(w => this.normalizeWord(w));

    const normalized = prompt.toLowerCase().replace(/^(extract|fetch)\s*/g, "").trim();

    // Find the best field match based on the longest keyword.
    // This prevents "description" from matching when the prompt is "extract amount from description of goods".
    let targetField: string | null = null;
    let bestMatchPos = -1;

    for (const [field, keywords] of Object.entries(this.FIELD_KEYWORDS)) {
      // Check keywords, the field name itself (as-is and de-camel-cased).
      // Prioritize the one that appears latest in the prompt.
      const decamelized = field.replace(/([A-Z])/g, ' $1').toLowerCase();
      const allKeywords = [...new Set([...keywords, field.toLowerCase(), decamelized])];
      for (const keyword of allKeywords) {
        const pos = normalized.lastIndexOf(keyword);
        if (pos > bestMatchPos) {
          bestMatchPos = pos;
          targetField = field;
        }
      }
    }

    if (!targetField) return null;

    const jsonPageNo = 0;

    // Special handling for 'unit' as it has no header and is next to quantity.
    if (targetField === 'unit') {
      const pageWords = json.filter(w => +w.pageNo === jsonPageNo);
      const quantityHeader = pageWords.find(w => this.FIELD_KEYWORDS['quantity'].some(k => w.text?.toLowerCase().includes(k)));
      if (quantityHeader) {
        // We're looking for 'unit', but we use 'quantity' header as the anchor.
        result = this.extractFieldValue(quantityHeader, pageWords, 'unit', jsonPageNo);
      }
    }

    if (!result) {
      // First, check if we have a predefined mapping for this field
      const predefinedMapping = this.mappings.find(m =>
        m.pageNo === docPageNo && this.FIELD_KEYWORDS[targetField!].some(k =>
          m.key.toLowerCase().includes(k)
        )
      );

      if (predefinedMapping) {
        // Try to find the value near the predefined mapping coordinates
        const res = await this.findValueNearCoordinates(predefinedMapping, json, jsonPageNo, targetField!);
        if (res) {
          result = res;
        }
      }

      // If no predefined mapping or if it failed, search through all words on the page
      if (!result) {
        const pageWords = json.filter(w => +w.pageNo === jsonPageNo);
        const sortedKeywords = [...this.FIELD_KEYWORDS[targetField!]].sort((a, b) => b.length - a.length);

        let candidate = null;
        for (const keyword of sortedKeywords) {
            candidate = pageWords.find(word => word.text?.toLowerCase().includes(keyword));
            if (candidate) break;
        }

        if (candidate) {
          result = this.extractFieldValue(candidate, pageWords, targetField!, jsonPageNo);
        }
      }
    }

    if (!result) return null;
    result.pageNo = docPageNo;

    // If no value was found for IRN on a page other than 1, check page 1.
    if (targetField === 'irnNo' && !result.value && docPageNo > 1) {
      const page1Json = await this.loadJson('json/file1');
      if (page1Json && page1Json.length > 0) {
        const page1Result = await this.extractFieldFromPrompt(prompt, 'json/file1', 1);
        if (page1Result && page1Result.value) {
          result.value = page1Result.value;
        }
      }
    }

    return result;
  }

  /**
   * Helper method to find value near predefined coordinates
   */
  private async findValueNearCoordinates(
    mapping: any,
    json: any[],
    pageNo: number,
    targetField: string
  ): Promise<any> {
    const pageWords = json.filter(w => +w.pageNo === pageNo); // pageNo is jsonPageNo

    // Find all words that could be the label based on keywords.
    const candidates = pageWords.filter(word =>
      this.FIELD_KEYWORDS[targetField].some(k => word.text?.toLowerCase().includes(k))
    );

    if (candidates.length === 0) {
      return null; // No words with the right keywords found on the page.
    }

    // Find the candidate closest to the predefined mapping's coordinates.
    let bestCandidate = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
      const distance = Math.hypot(candidate.left - mapping.left, candidate.top - mapping.top);
      if (distance < minDistance) {
        minDistance = distance;
        bestCandidate = candidate;
      }
    }

    // If the best candidate is too far, it's probably not the right one.
    const MAX_DISTANCE = 200; // pixels
    if (minDistance > MAX_DISTANCE) {
      return null;
    }

    return this.extractFieldValue(bestCandidate, pageWords, targetField, pageNo);
  }

  /**
   * Helper method to extract field value from a candidate word
   */
  private extractFieldValue(
    candidate: any, pageWords: any[], targetField: string, pageNo: number
  ): any {
    // Special handling for multi-line headers like "No. &kind of pkgs"
    if (targetField === 'noOfPackages' && candidate.text?.toLowerCase().includes('no. &kind')) {
      const secondPart = pageWords.find(w =>
        w.text?.toLowerCase().includes('of pkgs') &&
        Math.abs(w.left - candidate.left) < 50 && // Allow some horizontal variance
        w.top > candidate.bottom && w.top < candidate.bottom + 20 // Must be directly below
      );
      if (secondPart) {
        // Combine the two parts into a new virtual candidate for label and coordinate purposes
        const combinedCandidate = {
          ...candidate,
          text: `${candidate.text} ${secondPart.text}`,
          bottom: secondPart.bottom,
          right: Math.max(candidate.right, secondPart.right)
        };
        // Overwrite the original candidate for the rest of the function
        candidate = combinedCandidate;
      }
    }

    // If the candidate itself contains a label and value (e.g., "GSTNo: 27AAAC..."), split it
    let parsedKey = candidate.text;
    let parsedValue = "";
    let valueCoords: { left: number; top: number; right: number; bottom: number } | undefined;
    let labelCoords = {
        left: +candidate.left,
        top: +candidate.top,
        right: +candidate.right,
        bottom: +candidate.bottom
    };

    console.log('Candidate text:', candidate.text);

    const colonIdx = parsedKey.indexOf(":");
    if (colonIdx > 0) {
      const potentialValue = parsedKey.slice(colonIdx + 1).trim();
      const originalKey = parsedKey.slice(0, colonIdx).trim();

      if (potentialValue) {
        parsedValue = potentialValue;
        parsedKey = originalKey;

        // Estimate coordinates for key and value
        const totalWidth = +candidate.right - +candidate.left;
        const totalLength = candidate.text.length;
        if (totalLength > 0) {
            const charWidth = totalWidth / totalLength;
            const valueStartIndex = candidate.text.toLowerCase().indexOf(parsedValue.toLowerCase());
            const keyEndIndex = candidate.text.toLowerCase().indexOf(parsedKey.toLowerCase()) + parsedKey.length;

            if (valueStartIndex > -1 && keyEndIndex > -1) {
                const keyRight = +candidate.left + (keyEndIndex * charWidth);
                const valueLeft = +candidate.left + (valueStartIndex * charWidth);

                labelCoords.right = keyRight;
                valueCoords = {
                    left: valueLeft,
                    top: +candidate.top,
                    right: +candidate.right,
                    bottom: +candidate.bottom
                };
            }
        }
      }
    }
    console.log('Parsed key:', parsedKey);
    console.log('Parsed value:', parsedValue);

    // If no value found yet, search for text directly below the candidate
    if (!parsedValue) {
      const isTableField = ['amount', 'TotalGrossWeight', 'TotalNetWeight', 'quantity', 'salesOrder', 'noOfPackages', 'descriptionOfGoods', 'unit'].includes(targetField);
      const verticalThreshold = 150; // How far down to look
      const horizontalTolerance = 100;

      // Find all words that could potentially be the value below the label
      const potentialWords = pageWords
        .filter(w => {
          if (w === candidate || +w.top < +candidate.bottom - 5 || +w.top >= (+candidate.bottom + verticalThreshold)) {
            return false;
          }
          // Fields that are typically on a single line with their value after a colon.
          const singleLineFields = ['irnNo', 'cinNo', 'gstNo'];

          // For table fields, check for horizontal overlap. For others, use center-based alignment.
          if (isTableField) {
            if (targetField === 'descriptionOfGoods') {
                const searchBoxCenterX = (candidate.left + candidate.right) / 2;
                // Description can be wide, so use a wider tolerance and center-based check.
                return Math.abs(((+w.left + +w.right) / 2) - searchBoxCenterX) < 500;
            }
            return Math.max(w.left, candidate.left) < Math.min(w.right, candidate.right);
          } else {
            // For most header fields (like addresses), search below. Exclude specific single-line fields.
            if (singleLineFields.includes(targetField)) {
              return false;
            }
            const customHorizontalTolerance = 350; // Wider tolerance for address blocks etc.
            const searchBoxCenterX = (candidate.left + candidate.right) / 2;
            return Math.abs(((+w.left + +w.right) / 2) - searchBoxCenterX) < customHorizontalTolerance;
          }
        })
        .sort((a, b) => {
            const topDiff = +a.top - +b.top;
            if (Math.abs(topDiff) > 5) return topDiff; // Stricter line diff
            return +a.left - +b.left; // Sort by left position on the same line
        });

      if (potentialWords.length > 0) {
        const firstWord = potentialWords[0];
        // Group all words on the same line as the first potential word
        const lineWords = potentialWords.filter(w => Math.abs(+w.top - +firstWord.top) < 15)
                        .sort((a, b) => +a.left - +b.left);

        let valueSet = false;
        // Special handling for amount to combine value and currency from different lines
        if (targetField === 'amount' && potentialWords.length > 1) {
            const numericWord = potentialWords.find(w => !isNaN(parseFloat(w.text)));
            const currencyWord = potentialWords.find(w => /^(eur|usd|\$|€)$/i.test(w.text));
            if (numericWord && currencyWord) {
                parsedValue = `${numericWord.text} ${currencyWord.text}`;
                const l = Math.min(numericWord.left, currencyWord.left);
                const t = Math.min(numericWord.top, currencyWord.top);
                const r = Math.max(numericWord.right, currencyWord.right);
                const b = Math.max(numericWord.bottom, currencyWord.bottom);
                valueCoords = { left: l, top: t, right: r, bottom: b };
                valueSet = true;
            }
        }

        // Special parsing for table fields that can be combined (e.g., quantity and unit)
        if (!valueSet && isTableField && (targetField === 'quantity' || targetField === 'unit' || targetField === 'TotalGrossWeight' || targetField === 'TotalNetWeight')) {
          const numericWord = lineWords.find(w => !isNaN(parseFloat(w.text)));
          const textWord = lineWords.find(w => isNaN(parseFloat(w.text)) && /^[a-zA-Z]+$/.test(w.text));

          if (targetField === 'quantity' && numericWord) {
            parsedValue = String(parseFloat(numericWord.text));
            const { left, top, right, bottom } = numericWord;
            valueCoords = { left, top, right, bottom };
            valueSet = true;
          } else if (targetField === 'unit' && textWord) {
            parsedValue = textWord.text;
            const { left, top, right, bottom } = textWord;
            valueCoords = { left, top, right, bottom };
            valueSet = true;
          } else if ((targetField === 'TotalGrossWeight' || targetField === 'TotalNetWeight') && numericWord && textWord) {
            parsedValue = `${numericWord.text} ${textWord.text}`;
            const l = Math.min(numericWord.left, textWord.left);
            const t = Math.min(numericWord.top, textWord.top);
            const r = Math.max(numericWord.right, textWord.right);
            const b = Math.max(numericWord.bottom, textWord.bottom);
            valueCoords = { left: l, top: t, right: r, bottom: b };
            valueSet = true;
          }
        }

        if (!valueSet && lineWords.length > 0) {
          parsedValue = lineWords.map(w => w.text).join(' ').trim();
            const l = Math.min(...lineWords.map(w => +w.left));
            const t = Math.min(...lineWords.map(w => +w.top));
            const r = Math.max(...lineWords.map(w => +w.right));
            const b = Math.max(...lineWords.map(w => +w.bottom));
            valueCoords = { left: l, top: t, right: r, bottom: b };
        }
      }
    }

    if (targetField === 'salesOrder' && parsedValue) {
      parsedValue = parsedValue.replace(/\s+\/\s*$/, '').trim();
    }

    // Otherwise, search to the right in the same horizontal band
    if (!parsedValue) {
      const bandTol = 18;
      const searchLeft = +candidate.right + 1;
      const searchRight = searchLeft + 2000; // Increased search distance
      const searchTop = +candidate.top - bandTol;
      const searchBottom = +candidate.bottom + bandTol;

      const rightWords = pageWords
        .filter(w => +w.left >= searchLeft &&
                    +w.left <= searchRight &&
                    !(+w.bottom < searchTop || +w.top > searchBottom))
        .sort((a, b) => +a.left - +b.left);

      parsedValue = rightWords.map(w => w.text).join(' ').trim();

      if (rightWords.length) {
        const l = Math.min(...rightWords.map(w => +w.left));
        const t = Math.min(...rightWords.map(w => +w.top));
        const r = Math.max(...rightWords.map(w => +w.right));
        const b = Math.max(...rightWords.map(w => +w.bottom));
        valueCoords = { left: l, top: t, right: r, bottom: b };
      }
    }

    // If we still don't have a value, try to use CSV data if available
    if (!parsedValue && this.csvLoaded) {
      const csvMatch = this.csvData.find((row: any) => {
        const rowPage = +row.pageNo || +row.PageNo || 0;
        const rowName = (row.Name || '').toLowerCase();
        return rowPage === pageNo &&
               this.FIELD_KEYWORDS[targetField].some(k => rowName.includes(k));
      });

      if (csvMatch) {
        parsedValue = csvMatch.Value || '';
      }
    }

    return {
      field: targetField,
      key: parsedKey,
      value: parsedValue,
      valueCoords,
      coords: labelCoords,
      pageNo
    };
  }

  public async extractFromSampleJson(prompt: string): Promise<any | null> {
    const sampleJson = await this.loadSampleJson();
    if (!sampleJson) return null;

    const normalizedPrompt = prompt.toLowerCase().replace(/extract\s*/g, "").replace(/[^a-z0-9]/g, '').trim();

    for (const key in sampleJson) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedPrompt.includes(normalizedKey)) {
        const value = sampleJson[key];
        const valueStr = (typeof value === 'object') ? JSON.stringify(value) : value.toString();

        return {
          field: key,
          key: key,
          value: valueStr,
          pageNo: 1,
          coords: null,
          valueCoords: null
        };
      }
    }

    return null;
  }

  /**
   * Method to get field value from CSV data
   */
  
}
