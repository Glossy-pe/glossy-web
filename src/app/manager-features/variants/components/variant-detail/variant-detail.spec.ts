import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariantDetail } from './variant-detail';

describe('VariantDetail', () => {
  let component: VariantDetail;
  let fixture: ComponentFixture<VariantDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VariantDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
