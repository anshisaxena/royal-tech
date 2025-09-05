import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MappingService } from '../../services/mapping.service';
import { CommonModule } from '@angular/common';
import { DocumentType } from '../../services/file-upload.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pdf-config',
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-config.html',
  styleUrl: './pdf-config.css'
})
export class PdfConfig implements OnInit, OnChanges {
  // Form data
  @Input() currentPage: number = 1;
  @Input() documentType: DocumentType | '' = 'IMPORT';
  @Input() promptText: string = 'Extract Income Tax ID Number';
  @Input() fieldName: string = 'Title';
  @Input() fieldType: string = '';
  @Input() category: string = 'Customer Details';
  @Input() displayName: string = 'InvoiceNo';
  @Input() instruction: string = 'instructions';
  @Input() tableName: string = '';

  // Checkbox states
  @Input() isML: boolean = true;
  @Input() isBlockP: boolean = false;
  @Input() showField: boolean = true;
  
  // Events
  @Output() promptChange = new EventEmitter<string>();
  @Output() fieldConfigChange = new EventEmitter<any>();
  @Output() actionTriggered = new EventEmitter<string>();
  @Output() highlightRequested = new EventEmitter<any>();
  
  // UI State
  fieldSetupExpanded: boolean = true;
  ruleSetupExpanded: boolean = false;
  
  // New properties for dynamic headers
  headers: { name: string; fields: { key: string; value: any }[]; expanded: boolean }[] = [];
  tables: { name: string; rows: { key: string; value: any }[]; expanded: boolean }[] = [];

  // Store last extracted value
  lastExtracted?: { field?: string; value?: string };

  constructor(private mappingService: MappingService) {}

  ngOnInit(): void {
    this.loadJsonData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['currentPage'] && !changes['currentPage'].firstChange) ||
      (changes['documentType'] && !changes['documentType'].firstChange)
    ) {
      this.loadJsonData();
    }
  }

  async loadJsonData() {
     const sampleJson = await this.mappingService.loadSampleJsonForPage(
       this.currentPage, this.documentType as DocumentType
      );
     if (!sampleJson) {
       this.headers = [];
       this.tables = [];
       return;
     }
 
     const headers: { name: string; fields: { key: string; value: any }[]; expanded: boolean }[] = [];
     const tables: { name: string; rows: { key: string; value: any }[]; expanded: boolean }[] = [];
 
     // Unified logic for all sample JSON files.
     // Only the 'Header' key from the JSON is treated as a header section.
     // All other top-level keys are treated as table sections.
     for (const [key, value] of Object.entries(sampleJson)) {
       if (Array.isArray(value) && value.length > 0) {
         const dataObject = value[0];
         if (key === 'Header') {
           const fields = Object.entries(dataObject as object).map(([fieldKey, fieldValue]) => ({ key: fieldKey, value: fieldValue }));
           headers.push({ name: key, fields, expanded: false });
         } else {
           const rows = Object.entries(dataObject as object).map(([fieldKey, fieldValue]) => ({ key: fieldKey, value: fieldValue }));
           tables.push({ name: `${key} table`, rows, expanded: false });
         }
       }
     }
 
     this.headers = headers;
     this.tables = tables;
  }

  toggleHeader(header: any) {
    header.expanded = !header.expanded;
  }

  toggleTable(table: any) {
    table.expanded = !table.expanded;
  }

  // Suggested prompts
  suggestedPrompts = [
    'Find date reported for origin Kotak bank',
    'Extract Income Tax ID Number',
    'Extract Report Title',
    'Extract Home Phone Number'
  ];
  
  // Rule items
  ruleItems = [
    'val',
    'error date', 
    'extract file name',
    'caseObj'
  ];
  
  // Methods
  onPromptChange(value: string) {
    this.promptText = value;
    this.promptChange.emit(value);
  }
  
  async extractFromPrompt() {
    if (!this.promptText) return;

    const normalizedPrompt = this.promptText.toLowerCase().trim();
    const filePrefix = this.documentType === 'EXPORT' ? 'json/export' : 'json/file';
    const fileName = `${filePrefix}${this.currentPage}`;

    // Try extracting from the document first
    const result = await this.mappingService.extractFieldFromPrompt(
      this.promptText,
      fileName,
      this.currentPage
    );

    if (result) {
      // When a value is extracted, find the corresponding field in the UI
      // (headers or tables) and autofill it.
      const fieldToUpdate = result.field.toLowerCase();
      let fieldUpdated = false;

      // Search in tables first
      for (const table of this.tables) {
        const rowToUpdate = table.rows.find(row => row.key.toLowerCase() === fieldToUpdate);
        if (rowToUpdate) {
          rowToUpdate.value = result.value;
          fieldUpdated = true;
          break;
        }
      }

      // If not found in tables, search in headers
      if (!fieldUpdated) {
        for (const header of this.headers) {
          const fieldToUpdateInHeader = header.fields.find(field => field.key.toLowerCase() === fieldToUpdate);
          if (fieldToUpdateInHeader) {
            fieldToUpdateInHeader.value = result.value;
            break;
          }
        }
      }

      // Autofill Field Setup
      // Use the canonical field name from the service
      this.fieldName = result.field || this.fieldName;
      this.displayName = result.field || this.displayName;
      this.instruction = `Extract ${this.fieldName}`;

      this.fieldType = 'Header';
      this.tableName = '';
      this.category = 'Header Details';

      this.lastExtracted = { field: this.displayName, value: result.value };
      this.onFieldChange();

      // Emit highlight request for overlay
      const highlightData = {
        pageNo: this.currentPage,
        key: result.field, // The canonical key for tracking
        labelText: result.key, // The text from the document to display
        value: result.value,
        labelBox: result.coords,
        valueBox: result.valueCoords
      };
      
      this.highlightRequested.emit(highlightData);

      console.log("Extract From Prompt result: ", result);
      console.log("Highlight Data emitted: ", highlightData);
    }
  }

  onFieldChange() {
    const fieldConfig = {
      fieldName: this.fieldName,
      fieldType: this.fieldType,
      category: this.category,
      displayName: this.displayName,
      instruction: this.instruction,
      tableName: this.tableName,
      isML: this.isML,
      isBlockP: this.isBlockP,
      showField: this.showField
    };
    this.fieldConfigChange.emit(fieldConfig);
  }
  
  onSuggestedPromptClick(prompt: string) {
    this.promptText = prompt;
    this.promptChange.emit(prompt);
  }
  
  toggleFieldSetup() {
    this.fieldSetupExpanded = !this.fieldSetupExpanded;
  }
  
  toggleRuleSetup() {
    this.ruleSetupExpanded = !this.ruleSetupExpanded;
  }

  onRuleAction(action: string, item: string) {
    this.actionTriggered.emit(`${action}:${item}`);
  }
}
