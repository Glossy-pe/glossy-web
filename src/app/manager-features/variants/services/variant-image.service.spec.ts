import { TestBed } from '@angular/core/testing';

import { VariantImageService } from './variant-image.service.js';

describe('VariantImageService', () => {
  let service: VariantImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VariantImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
