import { HttpClient, HttpContext, HttpContextToken, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError } from './api-error';

/** Marks a request as not requiring the bearer token (public endpoints). */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
/** Marks a request that must not trigger a token refresh on 401. */
export const NO_REFRESH = new HttpContextToken<boolean>(() => false);

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  noRefresh?: boolean;
  /** Use the services base URL ({{SERVICE_URL}}) instead of the client API. */
  service?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get configured(): boolean {
    return !!environment.clientApiUrl;
  }

  get serviceConfigured(): boolean {
    return !!environment.serviceApiUrl;
  }

  url(path: string, service = false): string {
    const base = (service ? environment.serviceApiUrl : environment.clientApiUrl).replace(/\/+$/, '');
    return `${base}/${path.replace(/^\/+/, '')}`;
  }

  get<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    return this.run<T>('GET', path, undefined, opts);
  }

  post<T = unknown>(path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
    return this.run<T>('POST', path, body, opts);
  }

  put<T = unknown>(path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
    return this.run<T>('PUT', path, body, opts);
  }

  delete<T = unknown>(path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
    return this.run<T>('DELETE', path, body, opts);
  }

  private async run<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body: unknown, opts: RequestOptions): Promise<T> {
    const configured = opts.service ? this.serviceConfigured : this.configured;
    if (!configured) throw new ApiError('notConfigured', 'API base URL is not configured');
    let params = new HttpParams();
    for (const [k, v] of Object.entries(opts.params ?? {})) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    const headers = new HttpHeaders(opts.headers ?? {});
    const context = new HttpContext().set(SKIP_AUTH, !!opts.skipAuth).set(NO_REFRESH, !!opts.noRefresh);
    try {
      return await firstValueFrom(
        this.http.request<T>(method, this.url(path, opts.service), { body, params, headers, context }),
      );
    } catch (e) {
      throw ApiError.from(e);
    }
  }
}
