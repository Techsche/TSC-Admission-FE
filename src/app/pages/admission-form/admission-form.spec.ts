import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmissionForm } from './admission-form';

describe('AdmissionForm', () => {
  let component: AdmissionForm;
  let fixture: ComponentFixture<AdmissionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmissionForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AdmissionForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
