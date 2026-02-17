import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCarrusel } from './product-carrusel';

describe('ProductCarrusel', () => {
  let component: ProductCarrusel;
  let fixture: ComponentFixture<ProductCarrusel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCarrusel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductCarrusel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
