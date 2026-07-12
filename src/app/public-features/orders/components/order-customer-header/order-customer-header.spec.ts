import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderCustomerHeader } from './order-customer-header';

describe('OrderCustomerHeader', () => {
  let component: OrderCustomerHeader;
  let fixture: ComponentFixture<OrderCustomerHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCustomerHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderCustomerHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
