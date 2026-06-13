import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemDetail } from './order-item-detail';

describe('OrderItemDetail', () => {
  let component: OrderItemDetail;
  let fixture: ComponentFixture<OrderItemDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderItemDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderItemDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
