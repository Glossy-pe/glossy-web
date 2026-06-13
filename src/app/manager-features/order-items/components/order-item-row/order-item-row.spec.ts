import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemRow } from './order-item-row';

describe('OrderItemRow', () => {
  let component: OrderItemRow;
  let fixture: ComponentFixture<OrderItemRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderItemRow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderItemRow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
