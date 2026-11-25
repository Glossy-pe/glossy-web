import { TestBed } from '@angular/core/testing';

import { BoxPresentationService } from './box-presentation.service';

describe('BoxPresentationService', () => {
  let service: BoxPresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BoxPresentationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
