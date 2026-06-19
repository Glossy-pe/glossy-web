import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductMainDetail } from './product-main-detail';

describe('ProductMainDetail', () => {
  let component: ProductMainDetail;
  let fixture: ComponentFixture<ProductMainDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductMainDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductMainDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
