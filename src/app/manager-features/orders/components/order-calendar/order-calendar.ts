import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions, DatesSetArg, DayCellContentArg, EventApi, EventInput,
} from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

import { OrderService } from '../../services/order.service';
import { OrderCalendarService } from '../../services/order-calendar.service';
import { OrderCalendarItem } from '../../models/order-calendar.model';
import { OrderStatusResponse } from '../../models/order-status-response.model';

const PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];
const DEFAULT_COLOR = '#9ca3af';

/** Debe coincidir con el breakpoint `sm` de Tailwind (640px) */
const MOBILE_QUERY = '(max-width: 639px)';

/** Hora local sin zona: 2026-11-05T16:30:00 (nunca toISOString) */
function toLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/** Opciones que cambian según el tamaño de pantalla */
function responsiveOptions(mobile: boolean): CalendarOptions {
  return mobile
    ? {
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
        footerToolbar: { center: 'dayGridMonth,timeGridDay,listWeek' },
        titleFormat: { year: 'numeric', month: 'short' },
        height: 'auto',
        dayMaxEvents: 2,
        // En táctil, mantener pulsado ~0.4s para arrastrar un evento
        eventLongPressDelay: 400,
        longPressDelay: 400,
      }
    : {
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        },
        footerToolbar: false,
        titleFormat: { year: 'numeric', month: 'long' },
        height: 'calc(100vh - 12rem)',
        dayMaxEvents: 3,
        eventLongPressDelay: 1000,
        longPressDelay: 1000,
      };
}

@Component({
  selector: 'app-order-calendar',
  imports: [FullCalendarModule],
  templateUrl: './order-calendar.html',
  styleUrl: './order-calendar.scss',
})
export class OrderCalendar {
  private api = inject(OrderCalendarService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private calendar = viewChild(FullCalendarComponent);
  private mq = window.matchMedia(MOBILE_QUERY);

  private range$ = new Subject<{ from: string; to: string }>();

  isMobile  = signal(this.mq.matches);
  orders    = signal<OrderCalendarItem[]>([]);
  statuses  = signal<OrderStatusResponse[]>([]);
  isLoading = signal(false);
  errorMsg  = signal<string | null>(null);

  totalInRange = computed(() => this.orders().length);

  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    locale: esLocale,
    initialView: this.mq.matches ? 'listWeek' : 'dayGridMonth',
    firstDay: 1,
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' },
    allDaySlot: false,
    nowIndicator: true,
    scrollTime: '08:00:00',
    navLinks: true, // tocar el número de un día abre la vista Día
    moreLinkText: (n) => `+${n} más`,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    editable: true,
    events: [],
    datesSet: (arg) => this.onDatesSet(arg),
    eventClick: (info) => this.router.navigate(['/manager/orders', info.event.id]),
    eventDrop: (info) => this.onEventDrop(info.event, info.revert),
    ...responsiveOptions(this.mq.matches),
  });

  constructor() {
    // Reaccionar a rotación de pantalla / cambio de tamaño
    const onChange = (e: MediaQueryListEvent) => this.applyResponsive(e.matches);
    this.mq.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => this.mq.removeEventListener('change', onChange));

    this.orderService.getStatuses().subscribe({
      next: (s) => { this.statuses.set(s); this.refreshOptions(); },
      error: (err) => console.error(err),
    });

    // switchMap cancela la petición anterior si el usuario cambia de mes rápido
    this.range$
      .pipe(
        tap(() => { this.isLoading.set(true); this.errorMsg.set(null); }),
        switchMap((r) =>
          this.api.getRange(r.from, r.to).pipe(
            catchError((err) => {
              console.error(err);
              this.errorMsg.set('No se pudo cargar el calendario.');
              return of([] as OrderCalendarItem[]);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((list) => {
        this.orders.set(list);
        this.isLoading.set(false);
        this.refreshOptions();
      });
  }

  colorOf(statusId: number | null): string {
    const i = this.statuses().findIndex((s) => s.id === statusId);
    return i >= 0 ? PALETTE[i % PALETTE.length] : DEFAULT_COLOR;
  }

  private applyResponsive(mobile: boolean): void {
    this.isMobile.set(mobile);
    this.calendarOptions.update((opts) => ({ ...opts, ...responsiveOptions(mobile) }));

    // La vista semanal en cuadrícula no cabe en móvil: pasar a lista
    const api = this.calendar()?.getApi();
    if (api && mobile && api.view.type === 'timeGridWeek') {
      api.changeView('listWeek');
    }
  }

  private onDatesSet(arg: DatesSetArg): void {
    // En vista mes, start/end incluye los días de relleno del mes anterior/siguiente
    this.range$.next({ from: toLocal(arg.start), to: toLocal(arg.end) });
  }

  private onEventDrop(event: EventApi, revert: () => void): void {
    this.errorMsg.set(null);
    this.api.setSchedule(Number(event.id), toLocal(event.start!)).subscribe({
      next: (updated) => this.applyUpdate(updated),
      error: (err) => {
        console.error(err);
        revert();
        this.errorMsg.set('No se pudo mover la orden. Se restauró su fecha anterior.');
      },
    });
  }

  private applyUpdate(updated: OrderCalendarItem): void {
    this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    this.refreshOptions();
  }

  // ---------- eventos y contador por día ----------

  private refreshOptions(): void {
    const counts = new Map<string, number>();
    const events: EventInput[] = [];

    for (const o of this.orders()) {
      if (!o.scheduledSendAt) continue;

      const day = o.scheduledSendAt.substring(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);

      const color = this.colorOf(o.orderStatusId);
      events.push({
        id: String(o.id),
        title: `${o.orderCode} · ${o.customerName}`,
        start: o.scheduledSendAt,
        backgroundColor: color,
        borderColor: color,
      });
    }

    this.calendarOptions.update((opts) => ({
      ...opts,
      events,
      dayCellContent: (arg: DayCellContentArg) => {
        const n = counts.get(toLocal(arg.date).substring(0, 10)) ?? 0;
        const badge = n
          ? `<span class="fc-count-badge" title="${n} pedido(s)">${n}</span>`
          : '';
        return { html: `${badge}<span>${arg.dayNumberText}</span>` };
      },
    }));
  }
}