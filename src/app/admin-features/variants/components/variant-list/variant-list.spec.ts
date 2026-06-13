import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariantList } from './variant-list';

describe('VariantList', () => {
  let component: VariantList;
  let fixture: ComponentFixture<VariantList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VariantList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
