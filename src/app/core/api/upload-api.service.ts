import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiClient } from './api-client.service';
import { ApiError } from './api-error';
import { extractUploadedUrls } from '../utils/normalize';

/** POST {{SERVICE_URL}}/upload?path=eayni  (multipart, field `file`) */
@Injectable({ providedIn: 'root' })
export class UploadApi {
  private readonly api = inject(ApiClient);

  get available(): boolean {
    return this.api.serviceConfigured;
  }

  async upload(file: Blob, filename: string): Promise<string> {
    const form = new FormData();
    form.append('file', file, filename);
    const res = await this.api.post<unknown>('upload', form, { service: true, params: { path: environment.uploadPath } });
    const [url] = extractUploadedUrls(res);
    if (!url) throw new ApiError('unknown', 'Upload succeeded but no URL was returned', undefined, res);
    return url;
  }
}
