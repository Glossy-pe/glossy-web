import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariantBulkCreate } from './variant-bulk-create';

describe('VariantBulkCreate', () => {
  let component: VariantBulkCreate;
  let fixture: ComponentFixture<VariantBulkCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantBulkCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VariantBulkCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
