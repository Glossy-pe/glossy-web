import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatergoryList } from './catergory-list';

describe('CatergoryList', () => {
  let component: CatergoryList;
  let fixture: ComponentFixture<CatergoryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatergoryList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatergoryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
