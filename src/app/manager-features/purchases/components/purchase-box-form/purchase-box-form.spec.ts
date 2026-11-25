import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseBoxForm } from './purchase-box-form';

describe('PucharseBoxForm', () => {
  let component: PurchaseBoxForm;
  let fixture: ComponentFixture<PurchaseBoxForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseBoxForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseBoxForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
