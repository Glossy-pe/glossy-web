import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariantForm } from './variant-form';

describe('VariantForm', () => {
  let component: VariantForm;
  let fixture: ComponentFixture<VariantForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VariantForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
