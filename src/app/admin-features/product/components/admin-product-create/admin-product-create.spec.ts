import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminProductCreate } from './admin-product-create';

describe('AdminProductCreate', () => {
  let component: AdminProductCreate;
  let fixture: ComponentFixture<AdminProductCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminProductCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
