import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { forkJoin, Subscription } from 'rxjs';
import { StockWebsocketService } from '../../services/stock-websocket.service';
import { StockAlertCard } from '../../models/stock-depleted-event.model';

@Component({
  selector: 'app-admin-stock-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin-stock-list.html',
  styleUrl: './admin-stock-list.scss'
})
export class AdminStockList implements OnInit, OnDestroy {

  alerts = signal<StockAlertCard[]>([]);
  private sub!: Subscription;

  constructor(private stockWs: StockWebsocketService) {}

ngOnInit(): void {
  this.stockWs.loadActive().subscribe({
    next: (cards) => this.alerts.set(cards),
    error: (err)  => console.error('❌ Error cargando historial:', err)
  });

  this.sub = this.stockWs.depleted$.subscribe(event => {
    this.stockWs.enrichAlert(event).subscribe(card => {
      this.alerts.update(current => [card, ...current]);
    });
  });

  // elimina la card automáticamente cuando vuelve a tener stock 👈
  this.stockWs.restocked$.subscribe(variantId => {
    this.alerts.update(current =>
      current.filter(a => a.variantId !== variantId)
    );
  });

  this.stockWs.connect();
}

  dismiss(alertId: number): void {
    this.stockWs.dismiss(alertId).subscribe(() => {
      this.alerts.update(current => current.filter(a => a.alertId !== alertId));
    });
  }

  clearAll(): void {
    const dismissAll = this.alerts().map(a => this.stockWs.dismiss(a.alertId));
    forkJoin(dismissAll).subscribe(() => this.alerts.set([]));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}