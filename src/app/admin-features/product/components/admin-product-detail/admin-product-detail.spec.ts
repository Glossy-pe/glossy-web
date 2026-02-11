import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminProductDetail } from './admin-product-detail';

describe('AdminProductDetail', () => {
  let component: AdminProductDetail;
  let fixture: ComponentFixture<AdminProductDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminProductDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
