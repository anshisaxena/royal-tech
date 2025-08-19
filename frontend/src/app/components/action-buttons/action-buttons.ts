import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-action-buttons',
  standalone: true,
  imports: [],
  templateUrl: './action-buttons.html',
  styleUrl: './action-buttons.css'
})
export class ActionButtons {
 @Input() showSubmit: boolean = true;
  @Input() showSave: boolean = true;
  @Input() showNext: boolean = true;
  
  @Output() submit = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  
  onSubmit() {
    this.submit.emit();
  }
  
  onSave() {
    this.save.emit();
  }
  
  onNext() {
    this.next.emit();
  }
}
