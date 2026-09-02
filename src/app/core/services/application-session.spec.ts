import { TestBed } from '@angular/core/testing';

import { ApplicationSession } from './application-session';

describe('ApplicationSession', () => {
  let service: ApplicationSession;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApplicationSession);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
