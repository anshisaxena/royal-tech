import { Injectable } from '@angular/core';
import tastybiteMapping from '../data/mappings/tastybite.mapping.json';

@Injectable({
  providedIn: 'root'
})
export class MappingService {
  private mappings: { [key: string]: any[] } = {
    tastybite: tastybiteMapping
  };

  getMapping(documentType: string): any[] {
    return this.mappings[documentType] || [];
  }
}
