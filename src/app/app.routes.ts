import { Routes } from '@angular/router';
import { authGuard } from './admin-features/authentication/guards/auth.guard';

export const routes: Routes = [
    // Rutas públicas con layout público
    {
        path: '',
        loadComponent: () => import('./shared/layouts/public-layout/components/public-layout/public-layout').then(m => m.PublicLayout),
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', loadComponent: () => import('./features/home/components/home/home').then(m => m.Home) },
            { path: 'categories', loadComponent: () => import('./features/category/components/catergory-list/catergory-list').then(m => m.CatergoryList) },
            { path: 'products', loadComponent: () => import('./features/product/components/product-list/product-list').then(m => m.ProductList) },
            { path: 'products/:id', loadComponent: () => import('./features/product/components/product-detail/product-detail').then(m => m.ProductDetail) },
            { path: 'cart', loadComponent: () => import('./features/cart/components/cart-list/cart-list').then(m => m.CartList) },
            { path: 'san-valentin', loadComponent: () => import('./features/valentin-day/components/valentine-day/valentine-day').then(m => m.ValentineDay) },
        ]
    },
    
    // Rutas admin con layout admin
    {
        path: 'admin',
        loadComponent: () => import('./shared/layouts/admin-layout/components/admin-layout/admin-layout').then(m => m.AdminLayout),
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'products', pathMatch: 'full' },
            { path: 'products', loadComponent: () => import('./admin-features/product/components/product-list/admin-product-list').then(m => m.AdminProductList) },
            { path: 'products/:id', loadComponent: () => import('./admin-features/product/components/admin-product-detail/admin-product-detail').then(m => m.AdminProductDetail) },
            { path: 'categories', loadComponent: () => import('./admin-features/category/components/category-list/admin-category-list').then(m => m.AdminCategoryList) },
            { path: 'images', loadComponent: () => import('./admin-features/images/components/images-list/admin-images-list').then(m => m.AdminImagesList) },
        ]
    },

    // Login sin layout
    { 
        path: 'admin/login', 
        loadComponent: () => import('./admin-features/authentication/components/login/login').then(m => m.Login) 
    },

    { path: '**', redirectTo: 'home' }
];