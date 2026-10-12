import { AppConfig } from '../app/core/config/app-config';

/**
 * Shared defaults for non-production builds. `environment.ts` (dev) and
 * `environment.mock.ts` both extend this file; `environment.prod.ts` is
 * self-contained on purpose so release settings are explicit.
 */
export const baseEnvironment: AppConfig = {
  production: false,
  clientApiUrl: '',
  serviceApiUrl: '',
  uploadPath: 'eayni',
  locationOrder: 'lnglat',
  mapTiles: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  defaultMapCenter: { lat: 24.7136, lng: 46.6753 }, // Riyadh
  defaultCountryCode: '966',
  polling: {
    chatMs: 8_000,
  },
  features: {
    rewards: true,
    containers: true,
    chat: true,
    assistant: true,
    pushNotifications: false,
  },
  assistant: {
    proxyUrl: '',
  },
};
