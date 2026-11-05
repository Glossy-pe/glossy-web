import { TestBed } from '@angular/core/testing';

import { OrderCalendarService } from './order-calendar.service';

describe('OrderCalendarService', () => {
  let service: OrderCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderCalendarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
