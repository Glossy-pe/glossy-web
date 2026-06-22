import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgenciesMap } from './agencies-map';

describe('AgenciesMap', () => {
  let component: AgenciesMap;
  let fixture: ComponentFixture<AgenciesMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgenciesMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgenciesMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
