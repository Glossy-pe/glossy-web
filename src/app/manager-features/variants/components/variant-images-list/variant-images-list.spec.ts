import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariantImagesList } from './variant-images-list';

describe('VariantImagesList', () => {
  let component: VariantImagesList;
  let fixture: ComponentFixture<VariantImagesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantImagesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VariantImagesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
