import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChristmasTreeBg } from './christmas-tree-bg';

describe('ChristmasTreeBg', () => {
  let component: ChristmasTreeBg;
  let fixture: ComponentFixture<ChristmasTreeBg>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChristmasTreeBg]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChristmasTreeBg);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
