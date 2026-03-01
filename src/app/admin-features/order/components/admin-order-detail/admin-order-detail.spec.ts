import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminOrderDetail } from './admin-order-detail';

describe('AdminOrderDetail', () => {
  let component: AdminOrderDetail;
  let fixture: ComponentFixture<AdminOrderDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminOrderDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
