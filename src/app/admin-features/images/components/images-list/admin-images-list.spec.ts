import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminImagesList } from './admin-images-list';

describe('AdminImagesList', () => {
  let component: AdminImagesList;
  let fixture: ComponentFixture<AdminImagesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminImagesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminImagesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
