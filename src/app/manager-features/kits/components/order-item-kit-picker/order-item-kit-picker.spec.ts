import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemKitPicker } from './order-item-kit-picker';

describe('OrderItemKitPicker', () => {
  let component: OrderItemKitPicker;
  let fixture: ComponentFixture<OrderItemKitPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderItemKitPicker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderItemKitPicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
