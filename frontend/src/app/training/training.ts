import { Component } from '@angular/core';
import { Header } from '../components/header/header';
import { ActionButtons } from '../components/action-buttons/action-buttons';
import { PdfConfig } from '../components/pdf-config/pdf-config'

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [Header, ActionButtons, PdfConfig],
  templateUrl: './training.html',
  styleUrl: './training.css'
})
export class Training {
  documentName: string = 'IMPORT';
  
  handleSearch(query: string) {
    console.log('Search query:', query);
  }
  
  handleSubmit() {
    console.log('Submit clicked - Processing document...');
  }
  
  handleSave() {
    console.log('Save clicked - Saving progress...');
  }
  
  handleNext() {
    console.log('Next clicked - Moving to next step...');
  }

  handlePromptChange(prompt: string) {
    console.log('Prompt changed:', prompt);
  }
  
  handleFieldConfigChange(config: any) {
    console.log('Field config changed:', config);
  }
  
  handleActionTriggered(action: string) {
    console.log('Action triggered:', action);
  }
}
