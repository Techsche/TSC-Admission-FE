import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationSuccess } from './application-success';

describe('ApplicationSuccess', () => {
  let component: ApplicationSuccess;
  let fixture: ComponentFixture<ApplicationSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationSuccess],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationSuccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
