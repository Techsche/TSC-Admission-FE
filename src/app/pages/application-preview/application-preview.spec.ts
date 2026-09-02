import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationPreview } from './application-preview';

describe('ApplicationPreview', () => {
  let component: ApplicationPreview;
  let fixture: ComponentFixture<ApplicationPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
