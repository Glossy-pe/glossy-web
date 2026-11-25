import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductResponseFull } from '../../models/product-response-full.model';
import { CfImagePipe } from '../../../../../shared/pipes/cf-image.pipe';
import { IMAGE_SIZES } from '../../../../../shared/utils/image-url';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, RouterLink, CfImagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  product = input.required<ProductResponseFull>();
  priority = input(false);               // true para las primeras cards

  readonly thumbWidth = IMAGE_SIZES.thumb;

  mainImageUrl = computed(() => {
    const images = this.product().images ?? [];
    return (images.find(i => i.mainImage) ?? images[0])?.url ?? null;
  });

  price = computed(() => this.product().variants?.[0]?.price ?? null);
}