import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KitDetail } from './kit-detail';

describe('KitDetail', () => {
  let component: KitDetail;
  let fixture: ComponentFixture<KitDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KitDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
