import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminOrderCreate } from './admin-order-create';

describe('AdminOrderCreate', () => {
  let component: AdminOrderCreate;
  let fixture: ComponentFixture<AdminOrderCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminOrderCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
