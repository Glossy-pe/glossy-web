import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminStockList } from './admin-stock-list';

describe('AdminStockList', () => {
  let component: AdminStockList;
  let fixture: ComponentFixture<AdminStockList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminStockList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminStockList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
