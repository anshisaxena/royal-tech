// file-upload.service.ts
import { Injectable } from '@angular/core';

export type DocumentType = 'IMPORT' | 'EXPORT';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private files: File[] = [];
  private documentType: DocumentType = 'IMPORT';

  /**
   * Sets the files and the associated document type for the training session.
   * @param files An array of files to be processed.
   * @param docType The type of document operation ('IMPORT' or 'EXPORT').
   */
  setFiles(files: File[], docType: DocumentType = 'IMPORT') {
    this.files = files;
    this.documentType = docType;
  }

  /**
   * Retrieves the currently stored files.
   */
  getFiles(): File[] {
    return this.files;
  }

  /**
   * Retrieves the document type for the current set of files.
   */
  getDocumentType(): DocumentType {
    return this.documentType;
  }

  clearFiles() {
    this.files = [];
    this.documentType = 'IMPORT'; // Reset to default
  }
}
