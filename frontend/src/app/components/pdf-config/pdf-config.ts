import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input() tableName: string = 'Invoice Details';
  
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
  
  onFieldChange() {
    const fieldConfig = {
      fieldName: this.fieldName,
      fieldType: this.fieldType,
      category: this.category,
      displayName: this.displayName,
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