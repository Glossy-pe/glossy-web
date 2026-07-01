import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemFullList } from './order-item-full-list';

describe('OrderItemFullList', () => {
  let component: OrderItemFullList;
  let fixture: ComponentFixture<OrderItemFullList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderItemFullList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderItemFullList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
