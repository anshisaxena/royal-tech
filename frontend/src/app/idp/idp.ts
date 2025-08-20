import { Component } from '@angular/core';
import { Header } from '../components/header/header';
import { ActionButtons } from '../components/action-buttons/action-buttons';

@Component({
  selector: 'app-idp',
  imports: [Header,ActionButtons],
  templateUrl: './idp.html',
  styleUrl: './idp.css'
})
export class Idp {
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
