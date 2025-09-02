import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MappingService } from '../../services/mapping.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pdf-config',
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-config.html',
  styleUrl: './pdf-config.css'
})
export class PdfConfig implements OnInit {
  // Form data
  @Input() currentPage: number = 1;
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

  // List of fields that belong to a table
  private tableFields = [
    'salesOrder',
    'noOfPackages',
    'description',
    'quantity',
    'unit',
    'grossWeight',
    'amount'
  ];

  constructor(private mappingService: MappingService) {}

  ngOnInit(): void {
    this.loadJsonData();
  }

  async loadJsonData() {
    const sampleJson = await this.mappingService.loadSampleJson();
    if (!sampleJson) return;

    const headers = [];
    const tables = [];

    for (const [key, value] of Object.entries(sampleJson)) {
      if (Array.isArray(value) && value.length > 0 && value[0]?.type === 'table') {
        // This is a table
        const tableStructure = value[0];
        const rows = Object.entries(tableStructure)
          .filter(([fieldKey]) => fieldKey !== 'type')
          .map(([fieldKey, fieldValue]) => ({ key: fieldKey, value: fieldValue }));
        tables.push({ name: `${key} table`, rows, expanded: false });
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        (value as any).type === 'header'
      ) {
        // This is a header
          const fields = Object.entries(value as object)
            .filter(([fieldKey]) => fieldKey !== 'type' && fieldKey !== 'page')
            .map(([fieldKey, fieldValue]) => ({ key: fieldKey, value: fieldValue }));
        headers.push({ name: key, fields, expanded: false });
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
    const fileName = `json/file${this.currentPage}`;

    // Special case for showing all table fields
    if (normalizedPrompt === 'description of goods table') {
      // Let the parent component know to clear existing highlights
      this.highlightRequested.emit({ clearAll: true });

      for (const field of this.tableFields) {
        // Use a more specific prompt for each field to help the mapping service
        const fieldPrompt = `description of goods table ${field}`;
        const result = await this.mappingService.extractFieldFromPrompt(
          fieldPrompt,
          fileName,
          this.currentPage
        );

        if (result) {
          this.highlightRequested.emit({
            pageNo: this.currentPage,
            key: result.field,
            labelText: result.key,
            value: result.value,
            labelBox: result.coords,
            valueBox: result.valueCoords
          });
        }
      }
      return; // End of special handling
    }

    // Try extracting from the document first
    const result = await this.mappingService.extractFieldFromPrompt(
      this.promptText,
      fileName,
      this.currentPage
    );

    if (result) {
      // Autofill Field Setup
      // Use the canonical field name from the service
      this.fieldName = result.field || this.fieldName;
      this.displayName = result.field || this.displayName;
      this.instruction = `Extract ${this.fieldName}`;

      // Check if the extracted field is a table field
      if (this.tableFields.includes(result.field)) {
        this.fieldType = 'Table';
        this.tableName = 'description of goods';
        this.category = 'Table Details';
      } else {
        this.fieldType = 'Header';
        this.tableName = '';
        this.category = 'Header Details';
      }
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
