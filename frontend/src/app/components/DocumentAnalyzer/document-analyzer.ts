import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MappingService } from '../../services/mapping.service';
import { PdfConfig } from '../pdf-config/pdf-config'; // Import PdfConfig

@Component({
  selector: 'app-document-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule, PdfConfig], // Add PdfConfig here
  templateUrl: './document-analyzer.html',
  styleUrls: ['./document-analyzer.css']
})
export class DocumentAnalyzerComponent {
  userPrompt: string = '';
  extractedField: any = null;


  // Bound inputs for PdfConfig
  configPrompt: string = '';
  configFieldName: string = 'Title';
  configDisplayName: string = 'InvoiceNo';
  configInstruction: string = 'instructions';
  configCategory: string = 'Customer Details';
  configFieldType: string = 'Header';

  // Sample JSON data
  invoiceData = {
    Exporter: "GODREJ & BOYCE MFG. CO. LTD.",
    Consignee: "SENSY S.A.",
    InvoiceNo: "1000Q1X11000197",
    InvoiceDate: "04/03/2025",
    GSTNo: "27AAACG1395D1ZU",
    ShippingDetails: {
      ModeOfShipment: "AIR",
      AirportOfLoading: "Mumbai Air Cargo",
      AirportOfDischarge: "BRUSSELS AIR PORT",
      FinalDestination: "Belgium"
    },
    Items: [
      {
        SalesOrder: "QOE000120",
        NoOfPackages: 1,
        Description: "ES Underwater load Pin along",
        Quantity: 1,
        Unit: "ECH",
        GrossWeight: "1.75 KG",
        Amount: "2010.000 EUR"
      }
    ]
  };

  // Data to pass into PdfConfig
  pdfConfigData: any = {};

  constructor(private mappingService: MappingService) {}

  async onExtractPrompt() {
    if (!this.userPrompt) return;

    // Try ML/JSON-driven extraction via MappingService
    const result = await this.mappingService.extractFieldFromPrompt(
      this.userPrompt,
      'json/file1',
      1 // Page number is 1-based
    );

    if (result) {
      this.extractedField = { field: result.field, value: result.value };

      // Autofill PdfConfig inputs
      this.configPrompt = this.userPrompt;
      this.configFieldName = result.field === 'irnNo' ? 'IRN No' : (result.field || 'Title');
      this.configDisplayName = result.key || 'InvoiceNo';
      this.configInstruction = `Extract ${this.configFieldName}`;
      this.configCategory = 'Header Details';
      this.configFieldType = 'Header';
    } else {
      // Fallback: simple lookup into demo invoiceData by dotted path
      const keyPath = this.userPrompt.trim().split('.');
      let value: any = this.invoiceData;
      for (const k of keyPath) {
        if (value && k in value) {
          value = value[k as keyof typeof value];
        } else {
          value = undefined;
          break;
        }
      }
      this.extractedField = { field: this.userPrompt, value: value ?? 'Not Found' };

      // Autofill PdfConfig with fallback context
      this.configPrompt = this.userPrompt;
      this.configFieldName = this.userPrompt;
      this.configDisplayName = this.userPrompt;
      this.configInstruction = `Extract ${this.userPrompt}`;
      this.configCategory = 'Header Details';
      this.configFieldType = 'Header';
    }
  }
}
