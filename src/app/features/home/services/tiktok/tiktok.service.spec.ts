import { TestBed } from '@angular/core/testing';

import { TiktokService } from './tiktok.service';

describe('TiktokService', () => {
  let service: TiktokService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TiktokService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
