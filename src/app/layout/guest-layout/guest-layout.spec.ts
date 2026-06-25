import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuestLayout } from './guest-layout';

describe('GuestLayout', () => {
  let fixture: ComponentFixture<GuestLayout>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GuestLayout] }).compileComponents();
    fixture = TestBed.createComponent(GuestLayout);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});