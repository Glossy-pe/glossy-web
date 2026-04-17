import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, forkJoin, map, switchMap } from 'rxjs';
import { Client } from '@stomp/stompjs';
import { HttpClient } from '@angular/common/http';
import { StockDepletedEvent, StockAlertCard } from '../models/stock-depleted-event.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StockWebsocketService implements OnDestroy {

  private client!: Client;
  private depletedSubject = new Subject<StockDepletedEvent>();
  depleted$ = this.depletedSubject.asObservable();

  private restockedSubject = new Subject<number>();
  restocked$ = this.restockedSubject.asObservable();

  private readonly BASE = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // carga alertas y las enriquece con datos de variante
  loadActive(): Observable<StockAlertCard[]> {
    return this.http.get<StockDepletedEvent[]>(`${this.BASE}/api/stock-alerts`).pipe(
      map(alerts => alerts.map(alert => this.enrichAlert(alert))),
      // forkJoin espera que todas las llamadas terminen
      obs => new Observable(subscriber => {
        obs.subscribe({
          next: (enrichCalls) => {
            forkJoin(enrichCalls).subscribe({
              next: (cards) => subscriber.next(cards),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
          },
          error: (err) => subscriber.error(err)
        });
      })
    );
  }

  // enriquece un evento individual con datos de la variante
enrichAlert(alert: StockDepletedEvent): Observable<StockAlertCard> {
  return this.http.get<any>(`${this.BASE}/variants/${alert.variantId}`).pipe(
    switchMap(variant =>
      this.http.get<any>(`${this.BASE}/products/full/${variant.productId}`).pipe(
        map(product => ({
          alertId:     alert.id,
          variantId:   alert.variantId,
          productName: variant.productName,
          toneName:    variant.toneName,
          mainImageUrl: product.images?.find((img: any) => img.mainImage)?.url
                        ?? product.images?.[0]?.url
                        ?? null,
          images:      variant.images ?? [],
          occurredAt:  alert.timestamp
        }))
      )
    )
  );
}

  dismiss(id: number): Observable<void> {
    return this.http.patch<void>(`${this.BASE}/api/stock-alerts/${id}/dismiss`, {});
  }

connect(): void {
    this.client = new Client({
    brokerURL: `${environment.wsUrl}/stock`,
    heartbeatIncoming: 10000, // 👈 ping cada 10s para mantener viva la conexión
    heartbeatOutgoing: 10000,
    
    onConnect: () => {

      // canal de agotados
      this.client.subscribe('/topic/stock', (message) => {
        this.depletedSubject.next(JSON.parse(message.body));
      });

      // canal de reabastecidos 👈
      this.client.subscribe('/topic/stock/restocked', (message) => {
        const { variantId } = JSON.parse(message.body);
        this.restockedSubject.next(variantId);
      });

    },
    reconnectDelay: 5000,
  });
  this.client.activate();
}

  ngOnDestroy(): void {
    this.client?.deactivate();
    this.depletedSubject.complete();
  }
}