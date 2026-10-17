import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampaignService } from './campaign.service';

@Component({
  selector: 'app-christmas-welcome',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (campaign.welcomeVisible()) {
      <div class="xmas-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-6 backdrop-blur-[2px]"
           role="dialog" aria-modal="true" aria-label="Bienvenida navideña"
           (click)="campaign.dismissWelcome()">
        <div class="xmas-card relative w-full max-w-sm rounded-3xl border-2 border-dashed border-[#FFDDE4] bg-white p-8 text-center shadow-xl"
             (click)="$event.stopPropagation()">
          <div class="xmas-float text-5xl">🎄</div>
          <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-[#FF8DA1]">Edición navideña</p>
          <h2 class="mt-1 text-2xl font-black text-gray-700">¡Feliz Navidad!</h2>
          <p class="mt-2 text-sm text-gray-500">Encuentra los regalos perfectos entre nuestros nuevos ingresos ✨</p>

          <a routerLink="/guest/products" [queryParams]="{ sort: 'newest' }"
             (click)="campaign.dismissWelcome()"
             class="mt-5 block rounded-full bg-[#FF8DA1] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:brightness-95">
            Ver nuevos ingresos 🎁
          </a>
          <button type="button" (click)="campaign.dismissWelcome()"
            class="mt-3 cursor-pointer text-[11px] font-bold text-gray-400 transition-colors hover:text-[#FF8DA1]">
            Seguir navegando
          </button>
        </div>
      </div>
    }
  `,
})
export class ChristmasWelcome {
  protected readonly campaign = inject(CampaignService);
}