import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseUnitForm } from './purchase-unit-form';

describe('PurchaseUnitForm', () => {
  let component: PurchaseUnitForm;
  let fixture: ComponentFixture<PurchaseUnitForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseUnitForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseUnitForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
