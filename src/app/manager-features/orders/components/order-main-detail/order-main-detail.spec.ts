import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderMainDetail } from './order-main-detail';

describe('OrderMainDetail', () => {
  let component: OrderMainDetail;
  let fixture: ComponentFixture<OrderMainDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderMainDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderMainDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
