import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client.service';
import type { AppNotification, Container, ContainerAction, Driver, Paginated, PointsSummary, Reward, UpdateProfileRequest, UserProfile } from '../models';
import { normalizeContainer, normalizeDriver, normalizeNotification, normalizePoints, normalizeProfile, normalizeReward, toArray, toPaginated } from '../utils/normalize';

/** Endpoints under /account (bearer token required). */
@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly api = inject(ApiClient);

  /** GET /account/me */
  async me(): Promise<UserProfile> {
    return normalizeProfile(await this.api.get('account/me'));
  }

  /** PUT /account/profile */
  async updateProfile(body: UpdateProfileRequest): Promise<UserProfile> {
    return normalizeProfile(await this.api.put('account/profile', body));
  }

  /** DELETE /account */
  deleteAccount(): Promise<unknown> {
    return this.api.delete('account');
  }

  /** GET /account/notifications */
  async notifications(page = 1): Promise<Paginated<AppNotification>> {
    return toPaginated(await this.api.get('account/notifications', { params: { page } }), normalizeNotification, page);
  }

  /** GET /account/drivers — list of drivers (no live positions documented). */
  async drivers(): Promise<Driver[]> {
    return toArray(await this.api.get('account/drivers')).map((d) => normalizeDriver(d)).filter((d): d is Driver => !!d);
  }

  /** GET /account/containers?lat=&long= */
  async containers(lat: number, lng: number, page = 1): Promise<Paginated<Container>> {
    return toPaginated(await this.api.get('account/containers', { params: { lat, long: lng, page } }), normalizeContainer, page);
  }

  /** GET /account/containers/activity */
  async containerActivity(page = 1): Promise<Paginated<Container>> {
    return toPaginated(await this.api.get('account/containers/activity', { params: { page } }), normalizeContainer, page);
  }

  /** POST /account/containers/:container/:action  (actions: empty | maintenance | requested) */
  containerAction(containerId: string, action: ContainerAction, extra?: { image?: string; weight?: string }): Promise<unknown> {
    return this.api.post(`account/containers/${encodeURIComponent(containerId)}/${action}`, extra ?? {});
  }

  /** GET /account/rewards */
  async rewards(page = 1): Promise<Paginated<Reward>> {
    return toPaginated(await this.api.get('account/rewards', { params: { page } }), normalizeReward, page);
  }

  /** POST /account/rewards/:reward/redeem */
  redeem(rewardId: string): Promise<unknown> {
    return this.api.post(`account/rewards/${encodeURIComponent(rewardId)}/redeem`, {});
  }

  /** GET /account/points */
  async points(): Promise<PointsSummary> {
    return normalizePoints(await this.api.get('account/points'));
  }
}
