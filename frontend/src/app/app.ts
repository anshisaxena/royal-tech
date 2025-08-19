import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: '<router-outlet></router-outlet>',
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'royal-tech';
}
