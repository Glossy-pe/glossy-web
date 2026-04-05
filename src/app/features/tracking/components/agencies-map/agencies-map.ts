import {
  Component,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AgenciaRaw {
  ter_id: number;
  nombre: string;
  zona: string;
  lugar_over: string;
  provincia: string;
  departamento: string;
  latitud: string;
  longitud: string;
  estadoAgencia: string;
  hora_atencion: string;
  [key: string]: unknown;
}

interface AgenciaPin {
  id: number;
  lat: number;
  lng: number;
  nombre: string;
  provincia: string;
  departamento: string;
  estadoAgencia: string;
  searchText: string;
}

interface FormData {
  apPaterno: string;
  apMaterno: string;
  nombre: string;
  dni: string;
  celular: string;
}

@Component({
  selector: 'app-agencies-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agencies-map.html',
  styleUrl: './agencies-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgenciesMap implements OnDestroy {
  private readonly INITIAL_LAT = -12.046374;
  private readonly INITIAL_LNG = -77.042793;
  private readonly BATCH = 60;

  // ── Estado ────────────────────────────────────────────────────────────────
  ready           = signal(false);
  selected        = signal<AgenciaPin | null>(null);
  showSearch      = signal(false);
  showForm        = signal(false);
  searchQuery     = signal('');
  formSubmitted   = signal(false);

  searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (q.length < 2) return [];
    return this.allPins.filter(p => p.searchText.includes(q)).slice(0, 40);
  });

  form: FormData = { apPaterno: '', apMaterno: '', nombre: '', dni: '', celular: '' };

  mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private map!: google.maps.Map;
  private allPins: AgenciaPin[] = [];
  private visibleMarkers = new Map<number, google.maps.Marker>();
  private activeMarkerId: number | null = null;
  private idleListener?: google.maps.MapsEventListener;
  private renderTimer?: ReturnType<typeof setTimeout>;

  constructor(private zone: NgZone) {
    this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const [pins] = await Promise.all([this.loadPins(), this.loadMapsScript()]);
    this.allPins = pins;
    this.initMap();
  }

  private async loadPins(): Promise<AgenciaPin[]> {
    try {
      const res = await fetch('assets/data/agencies.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: AgenciaRaw[] = await res.json();
      return raw
        .map(a => {
          const lat = parseFloat(a.latitud);
          const lng = parseFloat(a.longitud);
          if (isNaN(lat) || isNaN(lng)) return null;
          return {
            id: a.ter_id, lat, lng,
            nombre: a.nombre,
            provincia: a.provincia,
            departamento: a.departamento,
            estadoAgencia: a.estadoAgencia,
            searchText: [a.departamento, a.provincia, a.zona, a.lugar_over, a.nombre]
              .join(' ').toLowerCase(),
          } as AgenciaPin;
        })
        .filter((p): p is AgenciaPin => p !== null);
    } catch (e) {
      console.warn('agencies.json:', e);
      return [];
    }
  }

  private loadMapsScript(): Promise<void> {
    if (window.google?.maps) return Promise.resolve();
    return new Promise((resolve, reject) => {
      (window as any).__mapsReady = resolve;
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDs8OTggHYGLRc_pJbUzN1NVSwjrOx9wYg&callback=__mapsReady&loading=async`;
      s.async = s.defer = true;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  private initMap(): void {
    const el = this.mapContainer()?.nativeElement;
    if (!el) return;

    this.map = new google.maps.Map(el, {
      center: { lat: this.INITIAL_LAT, lng: this.INITIAL_LNG },
      zoom: 12,
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    this.idleListener = this.map.addListener('idle', () => this.scheduleRender());
    this.map.addListener('click', () => this.zone.run(() => this.deselect()));
    this.zone.run(() => this.ready.set(true));
    this.scheduleRender();
  }

  private scheduleRender(): void {
    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => this.renderViewport(), 150);
  }

  private renderViewport(): void {
    const bounds = this.map.getBounds();
    if (!bounds) return;

    const inView = new Set(
      this.allPins
        .filter(p => bounds.contains({ lat: p.lat, lng: p.lng }))
        .map(p => p.id)
    );

    for (const [id, marker] of this.visibleMarkers) {
      if (!inView.has(id)) { marker.setMap(null); this.visibleMarkers.delete(id); }
    }

    this.addInBatches([...inView].filter(id => !this.visibleMarkers.has(id)));
  }

  private addInBatches(ids: number[], offset = 0): void {
    const pinMap = new Map(this.allPins.map(p => [p.id, p]));
    for (const id of ids.slice(offset, offset + this.BATCH)) {
      const pin = pinMap.get(id);
      if (!pin || this.visibleMarkers.has(id)) continue;
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: this.map,
        title: pin.nombre,
        icon: this.icon(false),
        optimized: true,
      });
      marker.addListener('click', () => this.zone.run(() => this.selectPin(pin, marker)));
      this.visibleMarkers.set(id, marker);
    }
    if (offset + this.BATCH < ids.length)
      requestAnimationFrame(() => this.addInBatches(ids, offset + this.BATCH));
  }

  private selectPin(pin: AgenciaPin, marker?: google.maps.Marker): void {
    if (this.activeMarkerId !== null)
      this.visibleMarkers.get(this.activeMarkerId)?.setIcon(this.icon(false));
    if (marker) { marker.setIcon(this.icon(true)); this.activeMarkerId = pin.id; }
    this.selected.set(pin);
    this.showSearch.set(false);
    this.showForm.set(false);
    this.searchQuery.set('');
  }

  deselect(): void {
    if (this.activeMarkerId !== null) {
      this.visibleMarkers.get(this.activeMarkerId)?.setIcon(this.icon(false));
      this.activeMarkerId = null;
    }
    this.selected.set(null);
    this.showForm.set(false);
  }

  private icon(active: boolean): google.maps.Symbol {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: active ? 16 : 12,
      fillColor: active ? '#E11D48' : '#1D4ED8',
      fillOpacity: 1,
      strokeWeight: 2.5,
      strokeColor: '#fff',
    };
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  onSearchInput(value: string): void { this.searchQuery.set(value); }

  clearSearch(): void {
    this.searchQuery.set('');
    this.showSearch.set(false);
  }

  closeSearch(): void { this.showSearch.set(false); this.searchQuery.set(''); }

  pickFromSearch(pin: AgenciaPin): void {
    this.map.setCenter({ lat: pin.lat, lng: pin.lng });
    this.map.setZoom(16);
    const marker = this.visibleMarkers.get(pin.id);
    this.zone.run(() => this.selectPin(pin, marker));
    setTimeout(() => {
      const m = this.visibleMarkers.get(pin.id);
      if (m && this.activeMarkerId === pin.id) m.setIcon(this.icon(true));
    }, 400);
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  openForm(): void {
    this.form = { apPaterno: '', apMaterno: '', nombre: '', dni: '', celular: '' };
    this.formSubmitted.set(false);
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  submitForm(): void {
    const { apPaterno, apMaterno, nombre, dni, celular } = this.form;
    if (!apPaterno || !apMaterno || !nombre || !dni || !celular) return;
    console.log('Selección:', this.selected()?.nombre, this.form);
    this.formSubmitted.set(true);
  }

  goToMyLocation(): void {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        this.map.panTo({ lat: coords.latitude, lng: coords.longitude });
        this.map.setZoom(15);
      },
      err => console.warn('GPS:', err.message)
    );
  }

  ngOnDestroy(): void {
    clearTimeout(this.renderTimer);
    this.idleListener?.remove();
    this.visibleMarkers.forEach(m => m.setMap(null));
    delete (window as any).__mapsReady;
  }
}