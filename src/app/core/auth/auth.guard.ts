import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/welcome'], { queryParams: { redirect: state.url } });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  return auth.isAuthenticated() ? router.createUrlTree(['/tabs/home']) : true;
};
