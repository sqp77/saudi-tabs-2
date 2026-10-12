import { AppConfig } from '../app/core/config/app-config';
import { baseEnvironment } from './environment.base';

/**
 * `pnpm start:mock` — points the app at mock-server/server.mjs ONLY.
 * Never put production URLs here: the smoke test registers accounts and
 * submits orders against whatever this file targets.
 */
export const environment: AppConfig = {
  ...baseEnvironment,
  clientApiUrl: 'http://localhost:4300',
  serviceApiUrl: 'http://localhost:4300',
  polling: { chatMs: 5_000 },
};
