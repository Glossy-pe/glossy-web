import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemProductPicker } from './order-item-product-picker';

describe('OrderItemProductPicker', () => {
  let component: OrderItemProductPicker;
  let fixture: ComponentFixture<OrderItemProductPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderItemProductPicker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderItemProductPicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
