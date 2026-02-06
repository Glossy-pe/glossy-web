import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValentineDay } from './valentine-day';

describe('ValentineDay', () => {
  let component: ValentineDay;
  let fixture: ComponentFixture<ValentineDay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValentineDay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValentineDay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
