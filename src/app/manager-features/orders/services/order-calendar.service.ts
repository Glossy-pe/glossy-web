import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrderCalendarItem } from '../models/order-calendar.model';

@Injectable({
  providedIn: 'root',
})
export class OrderCalendarService {
  private readonly baseUrl = `${environment.apiUrl}/api/manager/orders`;

  constructor(private http: HttpClient) {}

  getRange(from: string, to: string): Observable<OrderCalendarItem[]> {
    const params = new HttpParams().set('from', from).set('to', to);

    return this.http.get<OrderCalendarItem[]>(`${this.baseUrl}/calendar`, { params });
  }

  setSchedule(id: number, scheduledSendAt: string | null): Observable<OrderCalendarItem> {
    return this.http.patch<OrderCalendarItem>(
      `${this.baseUrl}/${id}/scheduled-send-at`,
      { scheduledSendAt }
    );
  }
}