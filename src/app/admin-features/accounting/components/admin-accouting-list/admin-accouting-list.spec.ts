import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAccoutingList } from './admin-accouting-list';

describe('AdminAccoutingList', () => {
  let component: AdminAccoutingList;
  let fixture: ComponentFixture<AdminAccoutingList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAccoutingList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAccoutingList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
