import { TestBed } from '@angular/core/testing';

import { PucharseService } from './pucharse.service';

describe('PucharseService', () => {
  let service: PucharseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PucharseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
