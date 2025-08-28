import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MappingService } from '../../services/mapping.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pdf-config',
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-config.html',
  styleUrl: './pdf-config.css'
})
export class PdfConfig {
  // Form data
  @Input() promptText: string = 'Extract Income Tax ID Number';
  @Input() fieldName: string = 'Title';
  @Input() fieldType: string = 'string';
  @Input() category: string = 'Customer Details';
  @Input() displayName: string = 'InvoiceNo';
  @Input() instruction: string = 'instructions';   // default empty
  @Input() tableName: string = '';   // <-- added to fix error ✅

  // Checkbox states
  @Input() isML: boolean = true;
  @Input() isBlockP: boolean = false;
  @Input() showField: boolean = true;
  
  // Events
  
  @Output() promptChange = new EventEmitter<string>();
  @Output() fieldConfigChange = new EventEmitter<any>();
  @Output() actionTriggered = new EventEmitter<string>();
  
  // UI State
  fieldSetupExpanded: boolean = true;
  ruleSetupExpanded: boolean = false;
  
  // Store last extracted value (optional display)
  lastExtracted?: { field?: string; value?: string };

  constructor(private mappingService: MappingService) {}

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
    const result = await this.mappingService.extractFieldFromPrompt(
      this.promptText,
      'json/file1',
      0
    );
    if (result) {
      // Autofill Field Setup
      this.fieldName = result.field === 'irnNo' ? 'IRN No' : (result.field || this.fieldName);
      this.displayName = result.key || this.displayName;
      this.instruction = `Extract ${this.fieldName}`;
      this.category = 'Header Details';
      this.fieldType = 'Header';
      this.lastExtracted = { field: this.fieldName, value: result.value };
      this.onFieldChange();
    }
  }

  onFieldChange() {
    const fieldConfig = {
      fieldName: this.fieldName,
      fieldType: this.fieldType,
      category: this.category,
      displayName: this.displayName,
      instruction: this.instruction,
      tableName: this.tableName,   // ✅ include tableName
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
