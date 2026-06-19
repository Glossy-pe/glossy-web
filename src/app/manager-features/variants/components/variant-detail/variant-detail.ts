import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { VariantService } from '../../services/variant.service';
import { VariantResponse } from '../../models/variant-response';
import { VariantMainDetail } from "../variant-main-detail/variant-main-detail";
import { VariantImagesList } from "../variant-images-list/variant-images-list";
import { OrderList } from "../../../orders/components/order-list/order-list";

@Component({
  selector: 'app-variant-detail',
  imports: [CommonModule, VariantMainDetail, VariantImagesList, OrderList],
  templateUrl: './variant-detail.html',
  styleUrl: './variant-detail.scss',
})
export class VariantDetail implements OnInit {

    
    variant = signal<VariantResponse | null>(null);
    
    private variantId = 0;
    private productId = 0;
  
    constructor(
      private route: ActivatedRoute,
      private router: Router,
      private variantService: VariantService
    ) {}
  
    ngOnInit(): void {
      this.productId = Number(this.route.snapshot.paramMap.get('id'));
      this.variantId = Number(this.route.snapshot.paramMap.get('variantId'));
      if (this.variantId) this.loadVariant();
    }
  
    loadVariant(): void {
      this.variantService.getById(this.variantId).subscribe(
        res => {this.variant.set(res)}
      )
    }

    goBack(): void {
      this.router.navigate(['/manager/products', this.productId]);
    }
}