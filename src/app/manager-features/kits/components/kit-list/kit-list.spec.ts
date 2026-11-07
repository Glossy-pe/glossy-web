import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KitList } from './kit-list';

describe('KitList', () => {
  let component: KitList;
  let fixture: ComponentFixture<KitList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KitList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
