import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef,
  NgZone, OnDestroy, inject, viewChild,
} from '@angular/core';
import { CampaignService } from './campaign.service';

interface Flake { x: number; y: number; r: number; vy: number; sway: number; phase: number; color: string; }

const COLORS = ['rgba(160,200,240,.70)', 'rgba(255,141,161,.45)', 'rgba(200,190,245,.65)'];

@Component({
  selector: 'app-snow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (campaign.active()) {
      <canvas #cv aria-hidden="true"
        class="pointer-events-none fixed inset-0 z-30 h-full w-full"></canvas>
    }
  `,
})
export class Snow implements AfterViewInit, OnDestroy {
  protected readonly campaign = inject(CampaignService);
  private readonly zone = inject(NgZone);
  private readonly cv = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  private raf = 0;
  private cleanup?: () => void;

  ngAfterViewInit(): void {
    const canvas = this.cv()?.nativeElement;
    if (!canvas || this.campaign.reducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.zone.runOutsideAngular(() => {
      let w = 0, h = 0;
      let flakes: Flake[] = [];

      const make = (): Flake => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.5 + Math.random() * 3,
        vy: 0.4 + Math.random() * 0.9,
        sway: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth; h = window.innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.max(25, Math.min(70, Math.floor(w / 18)));
        flakes = Array.from({ length: count }, make);
      };

      const frame = (t: number) => {
        ctx.clearRect(0, 0, w, h);
        for (const f of flakes) {
          f.y += f.vy;
          f.x += Math.sin(t / 1500 + f.phase) * f.sway;
          if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
          if (f.x > w + 10) f.x = -10;
          if (f.x < -10) f.x = w + 10;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
        this.raf = requestAnimationFrame(frame);
      };

      const onVisibility = () => {
        cancelAnimationFrame(this.raf);
        if (!document.hidden) this.raf = requestAnimationFrame(frame);
      };

      resize();
      this.raf = requestAnimationFrame(frame);
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', onVisibility);

      this.cleanup = () => {
        cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    });
  }

  ngOnDestroy(): void { this.cleanup?.(); }
}