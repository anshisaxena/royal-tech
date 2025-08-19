import { Component } from '@angular/core';
import { Header } from '../shared/header/header';
import { ActionButtons } from '../shared/action-buttons/action-buttons';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [Header, ActionButtons],
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
}
