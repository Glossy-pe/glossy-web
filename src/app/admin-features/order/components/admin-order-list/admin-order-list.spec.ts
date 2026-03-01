import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminOrderList } from './admin-order-list';

describe('AdminOrderList', () => {
  let component: AdminOrderList;
  let fixture: ComponentFixture<AdminOrderList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminOrderList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
