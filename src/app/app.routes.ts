import { Routes } from '@angular/router';
import { CatergoryList } from './features/category/components/catergory-list/catergory-list';
import { ProductList } from './features/product/components/product-list/product-list';
import { ProductDetail } from './features/product/components/product-detail/product-detail';
import { CartList } from './features/cart/components/cart-list/cart-list';
import { Home } from './features/home/components/home/home';
import { ValentineDay } from './features/valentin-day/components/valentine-day/valentine-day';

export const routes: Routes = [
    { path: 'home', component: Home },
    { path: 'categories', component: CatergoryList },
    { path: 'products', component: ProductList},
    { path: 'products/:id', component: ProductDetail },
    { path: 'san-valentin', component: ValentineDay },
    { path: 'cart', component: CartList},
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: '**', redirectTo: '/products' }
];
