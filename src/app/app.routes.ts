import { Routes } from '@angular/router';

export const routes: Routes = [
  // Rutas admin con layout y guard
  {
    path: 'manager',
    // canActivate: [authGuard],          // ← descomenta cuando lo implementes
    loadComponent: () => import('./manager-features/layout/manager-layout/manager-layout').then(m => m.ManagerLayout),
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },

      // Rutas de productos
      {
        path: 'products',
        loadComponent: () => import('./manager-features/products/components/product-list/product-list').then(m => m.ProductList)
      },
      {
        path: 'products/create',          // usa solo ProductDetail para crear un producto
        loadComponent: () => import('./manager-features/products/components/product-detail/product-detail').then(m => m.ProductDetail)
      },
      {
        path: 'products/:id',
        loadComponent: () => import('./manager-features/products/components/product-detail/product-detail').then(m => m.ProductDetail)
      },
      {
        path: 'products/:id/edit',
        loadComponent: () => import('./manager-features/products/components/product-detail/product-detail').then(m => m.ProductDetail)
      },
      {
        path: 'products/:id/variants/new',
        loadComponent: () => import('./manager-features/variants/components/variant-form/variant-form').then(m => m.VariantForm)
      },
      {
        path: 'products/:id/variants/:variantId',
        loadComponent: () => import('./manager-features/variants/components/variant-detail/variant-detail').then(m => m.VariantDetail)
      },
      {
        path: 'products/:id/variants/:variantId/edit',
        loadComponent: () => import('./manager-features/variants/components/variant-form/variant-form').then(m => m.VariantForm)
      },

      // Rutas de órdenes
      {
        path: 'orders',
        loadComponent: () => import('./manager-features/orders/components/order-list/order-list').then(m => m.OrderList)
      },
      {
        path: 'orders/create',          // estático antes que :id
        loadComponent: () => import('./manager-features/orders/components/order-form/order-form').then(m => m.OrderForm)
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./manager-features/orders/components/order-detail/order-detail').then(m => m.OrderDetail)
      },
      {
        path: 'orders/:id/edit',
        loadComponent: () => import('./manager-features/orders/components/order-form/order-form').then(m => m.OrderForm)
      },
      {
        path: 'orders/:id/order-items',          // estático antes que :id
        loadComponent: () => import('./manager-features/order-items/components/order-item-list/order-item-list').then(m => m.OrderItemList)
      },
      {
        path: 'orders/:id/order-items/new',
        loadComponent: () => import('./manager-features/order-items/components/order-item-form/order-item-form').then(m => m.OrderItemForm)
      },
      {
        path: 'orders/:id/order-items/:itemId/detail',
        loadComponent: () => import('./manager-features/order-items/components/order-item-detail/order-item-detail').then(m => m.OrderItemDetail)
      },
      {
        path: 'orders/:id/order-items/:itemId/edit',
        loadComponent: () => import('./manager-features/order-items/components/order-item-form/order-item-form').then(m => m.OrderItemForm)
      },
      
    ]
  },

  // Ruta login fuera del layout admin
  {
    path: 'manager/login',
    loadComponent: () => import('./manager-features/authentication/components/login/login').then(m => m.Login)
  },

  // Rutas públicas (cuando las tengas)
  // {
  //   path: '',
  //   loadComponent: () => import('./public-features/layout/public-layout/public-layout').then(m => m.PublicLayout),
  //   children: [...]
  // },

  { path: '**', redirectTo: 'manager/products' }
];