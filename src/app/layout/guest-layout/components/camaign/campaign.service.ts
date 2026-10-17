import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { CAMPAIGN } from './campaign.config';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly doc = inject(DOCUMENT);
  private readonly welcomeKey = `glossy-welcome-${CAMPAIGN.id}-${CAMPAIGN.start.slice(0, 4)}`;

  readonly active = signal(this.isActive());
  readonly welcomeVisible = signal(false);
  readonly reducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    if (this.active()) {
      this.doc.documentElement.setAttribute('data-campaign', CAMPAIGN.id);
      this.welcomeVisible.set(!this.safeGet(this.welcomeKey));
    }
  }

  dismissWelcome(): void {
    this.welcomeVisible.set(false);
    try { localStorage.setItem(this.welcomeKey, '1'); } catch {}
  }

  private isActive(): boolean {
    if (!CAMPAIGN.enabled) return false;
    if (CAMPAIGN.ignoreDates) return true;
    const now = Date.now();
    return now >= new Date(`${CAMPAIGN.start}T00:00:00`).getTime()
        && now <= new Date(`${CAMPAIGN.end}T23:59:59`).getTime();
  }

  private safeGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
}