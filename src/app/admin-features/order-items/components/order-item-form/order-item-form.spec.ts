import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemForm } from './order-item-form';

describe('OrderItemForm', () => {
  let component: OrderItemForm;
  let fixture: ComponentFixture<OrderItemForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderItemForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderItemForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
