import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfConfig } from './pdf-config';

describe('PdfConfig', () => {
  let component: PdfConfig;
  let fixture: ComponentFixture<PdfConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfConfig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfConfig);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
