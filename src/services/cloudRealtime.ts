/**
 * Live updates from the IoT Cloud backend over one WebSocket (/ws/app):
 * pin values, device online/offline, notifications. Reconnects with backoff.
 */
import { CLOUD_API_URL } from '../config';
import type { CloudPinValue } from './cloudApi';

export type CloudEvent =
  | { type: 'pin'; deviceId: string; pin: string; value: CloudPinValue; source: string; at: string }
  | { type: 'status'; deviceId: string; online: boolean; connected: boolean; lastSeen: string | null }
  | { type: 'notification'; title: string; message: string; deviceId: string | null; createdAt: string }
  | { type: 'reconnected' };

type Listener = (e: CloudEvent) => void;

class CloudRealtime {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private deviceIds: string[] = [];
  private listener: Listener | null = null;
  private ready = false;
  private retry = 0;
  private everReady = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  start(token: string, listener: Listener) {
    this.token = token;
    this.listener = listener;
    this.connect();
  }

  stop() {
    this.token = null;
    this.listener = null;
    this.everReady = false;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }

  subscribe(deviceIds: string[]) {
    this.deviceIds = deviceIds;
    this.sendSubs();
  }

  private connect() {
    if (this.ws || !this.token) return;
    const ws = new WebSocket(CLOUD_API_URL.replace(/^http/, 'ws') + '/ws/app');
    this.ws = ws;
    this.ready = false;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: this.token }));
    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.type === 'ready') {
        if (this.ready) return;
        this.ready = true;
        this.retry = 0;
        this.sendSubs();
        if (this.everReady) this.listener?.({ type: 'reconnected' });
        this.everReady = true;
      } else if (msg.type === 'pin' || msg.type === 'status' || msg.type === 'notification') {
        this.listener?.(msg as CloudEvent);
      }
    };
    ws.onclose = () => {
      this.ws = null;
      this.ready = false;
      if (!this.token) return;
      const delay = Math.min(30_000, 1000 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), delay);
    };
    ws.onerror = () => ws.close();
  }

  private sendSubs() {
    if (this.ready && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', deviceIds: this.deviceIds }));
    }
  }
}

export const cloudRealtime = new CloudRealtime();
