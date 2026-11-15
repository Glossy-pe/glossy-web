import { TestBed } from '@angular/core/testing';

import { PaymentProofService } from './payment-proof.service';

describe('PaymentProofService', () => {
  let service: PaymentProofService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentProofService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
