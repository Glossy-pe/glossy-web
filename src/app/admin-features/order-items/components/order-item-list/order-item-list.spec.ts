import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemList } from './order-item-list';

describe('OrderItemList', () => {
  let component: OrderItemList;
  let fixture: ComponentFixture<OrderItemList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderItemList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderItemList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
