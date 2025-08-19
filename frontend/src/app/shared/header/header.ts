import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  @Input() documentName: string = 'IMPORT';
  @Output() searchQuery = new EventEmitter<string>();
  
  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.emit(target.value);
  }
}
