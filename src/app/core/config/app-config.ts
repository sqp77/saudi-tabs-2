export type LocationOrder = 'latlng' | 'lnglat';

export interface AppConfig {
  production: boolean;
  /** {{CLIENT_URL}} in the Postman collection. */
  clientApiUrl: string;
  /** {{SERVICE_URL}} in the Postman collection (upload + fcm relay). */
  serviceApiUrl: string;
  uploadPath: string;
  locationOrder: LocationOrder;
  mapTiles: { url: string; attribution: string; maxZoom: number };
  defaultMapCenter: { lat: number; lng: number };
  defaultCountryCode: string;
  polling: { chatMs: number };
  features: {
    rewards: boolean;
    containers: boolean;
    chat: boolean;
    assistant: boolean;
    pushNotifications: boolean;
  };
  assistant: { proxyUrl: string };
}

export const APP_NAME = 'EAYNI';
export const APP_VERSION = '2.0.0';
