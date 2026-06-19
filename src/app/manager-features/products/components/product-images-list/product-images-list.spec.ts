import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductImagesList } from './product-images-list';

describe('ProductImagesList', () => {
  let component: ProductImagesList;
  let fixture: ComponentFixture<ProductImagesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductImagesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductImagesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
