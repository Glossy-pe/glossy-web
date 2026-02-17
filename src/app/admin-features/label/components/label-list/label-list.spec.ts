import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelList } from './label-list';

describe('LabelList', () => {
  let component: LabelList;
  let fixture: ComponentFixture<LabelList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabelList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
