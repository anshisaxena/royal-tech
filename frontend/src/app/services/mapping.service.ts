import { Injectable } from '@angular/core';
import godrejMapping from '../data/mappings/godrej.mapping.json';

@Injectable({
  providedIn: 'root'
})
export class MappingService {
  private mappings: { [key: string]: any[] } = {
    godrej: godrejMapping
  };

  getMapping(documentType: string): any[] {
    return this.mappings[documentType] || [];
  }
}
