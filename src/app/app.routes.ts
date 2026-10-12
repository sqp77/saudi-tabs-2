import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: '', redirectTo: 'welcome', pathMatch: 'full' },
      { path: 'welcome', loadComponent: () => import('./features/auth/welcome.page').then((m) => m.WelcomePage) },
      { path: 'login', loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage) },
      { path: 'register', loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage) },
    ],
  },
  {
    path: 'tabs',
    loadComponent: () => import('./features/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
      { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage) },
      { path: 'impact', canActivate: [authGuard], loadComponent: () => import('./features/impact/impact.page').then((m) => m.ImpactPage) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage) },
    ],
  },
  { path: 'donate', canActivate: [authGuard], loadComponent: () => import('./features/donate/donate.page').then((m) => m.DonatePage) },
  { path: 'donate/success/:id', canActivate: [authGuard], loadComponent: () => import('./features/donate/success.page').then((m) => m.DonateSuccessPage) },
  { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./features/orders/order-detail.page').then((m) => m.OrderDetailPage) },
  { path: 'orders/:id/chat', canActivate: [authGuard], loadComponent: () => import('./features/orders/order-chat.page').then((m) => m.OrderChatPage) },
  { path: 'orders/:id/receipt', canActivate: [authGuard], loadComponent: () => import('./features/orders/order-receipt.page').then((m) => m.OrderReceiptPage) },
  { path: 'rewards', canActivate: [authGuard], loadComponent: () => import('./features/rewards/rewards.page').then((m) => m.RewardsPage) },
  { path: 'containers', canActivate: [authGuard], loadComponent: () => import('./features/containers/containers.page').then((m) => m.ContainersPage) },
  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./features/notifications/notifications.page').then((m) => m.NotificationsPage) },
  { path: 'assistant', loadComponent: () => import('./features/assistant/assistant.page').then((m) => m.AssistantPage) },
  { path: 'profile/edit', canActivate: [authGuard], loadComponent: () => import('./features/profile/edit-profile.page').then((m) => m.EditProfilePage) },
  { path: 'profile/places', canActivate: [authGuard], loadComponent: () => import('./features/profile/places.page').then((m) => m.PlacesPage) },
  { path: 'info/:slug', loadComponent: () => import('./features/info/info.page').then((m) => m.InfoPage) },
  { path: '**', redirectTo: 'tabs/home' },
];
