import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmissionLayout } from './admission-layout';

describe('AdmissionLayout', () => {
  let component: AdmissionLayout;
  let fixture: ComponentFixture<AdmissionLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmissionLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(AdmissionLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
