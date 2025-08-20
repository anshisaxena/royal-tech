import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Idp } from './idp';

describe('Idp', () => {
  let component: Idp;
  let fixture: ComponentFixture<Idp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Idp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Idp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
