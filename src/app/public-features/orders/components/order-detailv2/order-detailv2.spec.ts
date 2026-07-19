import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderDetailv2 } from './order-detailv2';

describe('OrderDetailv2', () => {
  let component: OrderDetailv2;
  let fixture: ComponentFixture<OrderDetailv2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailv2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderDetailv2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
