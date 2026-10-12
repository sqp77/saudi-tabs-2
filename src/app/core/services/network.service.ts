import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly online = signal(true);

  constructor() {
    void Network.getStatus().then((s) => this.online.set(s.connected)).catch(() => undefined);
    void Network.addListener('networkStatusChange', (s) => this.online.set(s.connected)).catch(() => undefined);
  }
}
