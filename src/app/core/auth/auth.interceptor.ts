import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { NO_REFRESH, SKIP_AUTH } from '../api/api-client.service';
import { TokenStore } from './token-store.service';
import { AuthService } from './auth.service';

/**
 * Adds `Authorization: Bearer` (collection-level auth) and `Accept-Language`
 * to every API call; on 401 it refreshes the token once (single-flight) and
 * replays the request, otherwise signs the user out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const i18n = inject(I18nService);
  const store = inject(TokenStore);
  const auth = inject(AuthService);

  const isApi = req.url.startsWith(environment.clientApiUrl) || (environment.serviceApiUrl && req.url.startsWith(environment.serviceApiUrl));
  if (!isApi) return next(req);

  const decorate = (r: HttpRequest<unknown>, token?: string): HttpRequest<unknown> => {
    const headers: Record<string, string> = { 'Accept-Language': i18n.lang() };
    if (token && !r.context.get(SKIP_AUTH)) headers['Authorization'] = `Bearer ${token}`;
    return r.clone({ setHeaders: headers });
  };

  return next(decorate(req, store.accessToken)).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.context.get(NO_REFRESH) &&
        !req.context.get(SKIP_AUTH) &&
        store.tokens()?.refreshToken
      ) {
        return from(auth.refresh()).pipe(
          switchMap((ok) => {
            if (!ok) return throwError(() => err);
            return next(decorate(req, store.accessToken));
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
