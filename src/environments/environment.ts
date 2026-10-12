import { AppConfig } from '../app/core/config/app-config';
import { baseEnvironment } from './environment.base';

/**
 * Development configuration.
 *
 * The Postman collection references two variables that are NOT defined inside it:
 *   {{CLIENT_URL}}  -> the client REST API base URL        (clientApiUrl)
 *   {{SERVICE_URL}} -> the shared services API (S3 upload) (serviceApiUrl)
 *
 * Fill them in here (or in `environment.prod.ts` for release builds). Until a
 * base URL is set the app runs in an "API not configured" state and says so.
 *
 * `locationOrder`: the collection never documents whether `location: [a, b]`
 * is [lat, lng] or [lng, lat]. Verified on the live API (2026-10-12): user
 * records store `location` as a GeoJSON Point and `/order/geo/address` only
 * resolves [lng, lat] correctly, so 'lnglat' is the default.
 */
export const environment: AppConfig = {
  ...baseEnvironment,
  clientApiUrl: 'https://api.eayni.info/client',
  serviceApiUrl: 'https://api.eayni.info/services',
};
