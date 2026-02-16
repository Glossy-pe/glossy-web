import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialNews } from './social-news';

describe('SocialNews', () => {
  let component: SocialNews;
  let fixture: ComponentFixture<SocialNews>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialNews]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocialNews);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
