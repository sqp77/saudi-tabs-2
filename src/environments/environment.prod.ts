import { AppConfig } from '../app/core/config/app-config';

export const environment: AppConfig = {
  production: true,
  clientApiUrl: 'https://api.eayni.info/client',
  serviceApiUrl: 'https://api.eayni.info/services',
  uploadPath: 'eayni',
  locationOrder: 'lnglat',
  mapTiles: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  defaultMapCenter: { lat: 24.7136, lng: 46.6753 },
  defaultCountryCode: '966',
  polling: {
    chatMs: 10_000,
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
