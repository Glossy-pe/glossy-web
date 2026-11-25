import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPresentationSection } from './box-presentation-section';

describe('BoxPresentationSection', () => {
  let component: BoxPresentationSection;
  let fixture: ComponentFixture<BoxPresentationSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxPresentationSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoxPresentationSection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
