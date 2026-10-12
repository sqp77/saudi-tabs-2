import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind = 'network' | 'unauthorized' | 'validation' | 'notFound' | 'server' | 'notConfigured' | 'unknown';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof HttpErrorResponse) {
      const body = err.error as unknown;
      const serverMessage = extractMessage(body);
      if (err.status === 0) return new ApiError('network', serverMessage ?? err.message, 0, body);
      if (err.status === 401 || err.status === 403) return new ApiError('unauthorized', serverMessage ?? 'Unauthorized', err.status, body);
      if (err.status === 404) return new ApiError('notFound', serverMessage ?? 'Not found', 404, body);
      if (err.status === 400 || err.status === 422) return new ApiError('validation', serverMessage ?? 'Validation error', err.status, body);
      if (err.status >= 500) return new ApiError('server', serverMessage ?? 'Server error', err.status, body);
      return new ApiError('unknown', serverMessage ?? err.message, err.status, body);
    }
    if (err instanceof Error) return new ApiError('unknown', err.message);
    return new ApiError('unknown', String(err));
  }
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return typeof body === 'string' ? body : undefined;
  const b = body as Record<string, unknown>;
  for (const k of ['message', 'msg', 'error', 'detail', 'title']) {
    const v = b[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v.join(', ');
    if (v && typeof v === 'object' && typeof (v as Record<string, unknown>)['message'] === 'string') return (v as Record<string, unknown>)['message'] as string;
  }
  if (Array.isArray(b['errors'])) {
    const first = b['errors'][0] as Record<string, unknown> | string;
    if (typeof first === 'string') return first;
    if (first && typeof first['msg'] === 'string') return first['msg'] as string;
    if (first && typeof first['message'] === 'string') return first['message'] as string;
  }
  return undefined;
}
