import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderCalendar } from './order-calendar';

describe('OrderCalendar', () => {
  let component: OrderCalendar;
  let fixture: ComponentFixture<OrderCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
