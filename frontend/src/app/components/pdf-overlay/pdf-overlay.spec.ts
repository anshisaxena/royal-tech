import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfOverlay } from './pdf-overlay';

describe('PdfOverlay', () => {
  let component: PdfOverlay;
  let fixture: ComponentFixture<PdfOverlay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfOverlay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfOverlay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
