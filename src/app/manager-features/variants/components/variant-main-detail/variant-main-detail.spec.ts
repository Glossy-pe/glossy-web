import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariantMainDetail } from './variant-main-detail';

describe('VariantMainDetail', () => {
  let component: VariantMainDetail;
  let fixture: ComponentFixture<VariantMainDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantMainDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VariantMainDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
