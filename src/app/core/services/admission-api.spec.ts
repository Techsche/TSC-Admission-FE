import { TestBed } from '@angular/core/testing';

import { AdmissionApi } from './admission-api';

describe('AdmissionApi', () => {
  let service: AdmissionApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdmissionApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
