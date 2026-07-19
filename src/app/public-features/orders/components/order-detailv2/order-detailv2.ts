import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface Product {
  id: string;
  brand: string;
  name: string;
  shade: string;
  price: number;
  qty: number;
  imageColor: string; // Color base para simular el packaging estético
  emoji: string;
}

interface RecommendedProduct {
  id: string;
  brand: string;
  name: string;
  shade: string;
  price: number;
  imageColor: string;
  emoji: string;
  isLiked: boolean;
}

@Component({
  selector: 'app-order-detailv2',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './order-detailv2.html',
  styleUrl: './order-detailv2.scss',
})
export class OrderDetailv2 {

    // Navigation Menu Active Item State
  activeMenu = signal<string>('orders');

  // Interactive Toast message state
  toastMessage = signal<string>('');

  // Invoice modal trigger state
  showInvoiceModal = signal<boolean>(false);

  // Loading simulation state
  isProcessingBuyAgain = signal<boolean>(false);

  // Menu items list
  menuItems = signal([
    { id: 'dashboard', label: 'My Dashboard', icon: '🏠' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
    { id: 'wishlist', label: 'Wishlist', icon: '♡' },
    { id: 'favorites', label: 'My Favorites', icon: '🌸' },
    { id: 'club', label: 'Luvienne Club', icon: '👑' },
    { id: 'gifts', label: 'Gift Box', icon: '🎁' },
    { id: 'diary', label: 'Beauty Diary', icon: '📒' },
    { id: 'address', label: 'Address Book', icon: '📍' },
    { id: 'settings', label: 'Account Settings', icon: '⚙️' },
  ]);

  // Main Ordered Items Array State (Signal)
  orderedItems = signal<Product[]>([
    {
      id: 'item-1',
      brand: 'dasique',
      name: 'Blending Mood Cheek',
      shade: '#02 Rosy Cloud',
      price: 24000,
      qty: 1,
      imageColor: '#FEE5E6',
      emoji: '🌸'
    },
    {
      id: 'item-2',
      brand: 'Beauty of Joseon',
      name: 'Glow Deep Serum',
      shade: 'Rice + Alpha-Arbutin',
      price: 28000,
      qty: 1,
      imageColor: '#F5EFEB',
      emoji: '🧴'
    },
    {
      id: 'item-3',
      brand: 'rom&nd',
      name: 'Glasting Water Tint',
      shade: '#05 Rose Splash',
      price: 16000,
      qty: 1,
      imageColor: '#FCD7D9',
      emoji: '💄'
    },
    {
      id: 'item-4',
      brand: 'CLIO',
      name: 'Kill Cover Cushion',
      shade: '#03 Linen',
      price: 60000,
      qty: 1,
      imageColor: '#FFF4EA',
      emoji: '🪞'
    }
  ]);

  // Computed signal to calculate total amount instantly
  totalAmount = computed(() => {
    return this.orderedItems().reduce((total, item) => total + (item.price * item.qty), 0);
  });

  // Recommended Products Carousel State (Signal)
  recommendedProducts = signal<RecommendedProduct[]>([
    {
      id: 'rec-1',
      brand: 'peripera',
      name: 'Ink Mood Glowy Tint',
      shade: '#15 Beauty Peak Rose',
      price: 11000,
      imageColor: '#FFE3E5',
      emoji: '🧪',
      isLiked: false
    },
    {
      id: 'rec-2',
      brand: 'dasique',
      name: 'Shadow Palette',
      shade: '#03 Nude Potion',
      price: 34000,
      imageColor: '#FFF0E5',
      emoji: '🎨',
      isLiked: false
    },
    {
      id: 'rec-3',
      brand: 'TIRTIR',
      name: 'Mask Fit Red Cushion',
      shade: '#21N Ivory',
      price: 27000,
      imageColor: '#FCD3D7',
      emoji: '❤️',
      isLiked: false
    },
    {
      id: 'rec-4',
      brand: 'ETUDE',
      name: 'Dr. Mascara Fixer',
      shade: 'Long Lash',
      price: 6000,
      imageColor: '#F8EDEB',
      emoji: '🖌️',
      isLiked: false
    },
    {
      id: 'rec-5',
      brand: 'goodal',
      name: 'Houttuynia Cordata',
      shade: 'Calming Moisture Cream',
      price: 22000,
      imageColor: '#EDF6F0',
      emoji: '🌿',
      isLiked: false
    }
  ]);

  // Wishlist count computed dynamically from recommended items liked + initial value
  wishlistCount = computed(() => {
    const activeLikes = this.recommendedProducts().filter(p => p.isLiked).length;
    return 8 + activeLikes; // 8 is initial mock count matching UI mockup
  });

  // Action: Set Active Navigation tab
  setActiveMenu(menuId: string) {
    this.activeMenu.set(menuId);
    this.triggerToast(`Viewing your ${menuId.toUpperCase()} page!`);
  }

  // Action: Copy simulated order ID to clipboard
  copyOrderNumber() {
    navigator.clipboard.writeText('LVN-2024-0523');
    this.triggerToast('Order Number Copied to Clipboard! 📋');
  }

  // Action: Toggle Invoice Modal View
  toggleInvoiceModal() {
    this.showInvoiceModal.update(val => !val);
  }

  // Action: Simulate buying again with state loader
  simulateBuyAgain() {
    this.isProcessingBuyAgain.set(true);
    setTimeout(() => {
      this.isProcessingBuyAgain.set(false);
      this.triggerToast('All items added back to your Shopping Cart! 🛒');
    }, 1500);
  }

  // Action: Add recommended items to cart
  addRecommendedToCart(product: RecommendedProduct) {
    this.triggerToast(`${product.name} added to cart! 🛍️`);
  }

  // Action: Toggle Heart Favorite state
  toggleLike(product: RecommendedProduct) {
    this.recommendedProducts.update(prods => {
      return prods.map(p => {
        if (p.id === product.id) {
          const updatedState = !p.isLiked;
          if (updatedState) {
            this.triggerToast(`Added ${product.name} to Wishlist! ❤️`);
          } else {
            this.triggerToast(`Removed ${product.name} from Wishlist.`);
          }
          return { ...p, isLiked: updatedState };
        }
        return p;
      });
    });
  }

  // Helper trigger interactive toast messages elegantly
  triggerToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => {
      // Clear message only if it's still the active one
      if (this.toastMessage() === message) {
        this.toastMessage.set('');
      }
    }, 3000);
  }

  // Simulates printing action
  printSimulatedInvoice() {
    this.triggerToast('Simulating Invoice Print... 🖨️');
    this.toggleInvoiceModal();
  }
  
}
