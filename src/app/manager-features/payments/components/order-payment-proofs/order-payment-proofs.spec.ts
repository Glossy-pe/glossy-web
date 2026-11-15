import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderPaymentProofs } from './order-payment-proofs';

describe('OrderPaymentProofs', () => {
  let component: OrderPaymentProofs;
  let fixture: ComponentFixture<OrderPaymentProofs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderPaymentProofs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderPaymentProofs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
