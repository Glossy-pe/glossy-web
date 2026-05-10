import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminStockerList } from './admin-stocker-list';

describe('AdminStockerList', () => {
  let component: AdminStockerList;
  let fixture: ComponentFixture<AdminStockerList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminStockerList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminStockerList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
