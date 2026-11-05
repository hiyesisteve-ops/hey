// UNOFFICIAL Arlo web-API client. Arlo publishes no public API; these endpoints
// were reverse-engineered by the community (pyaarlo, etc.) and can change or be
// blocked at any time. Everything here talks only to Arlo's own servers.
import { Device, LibraryItem, MfaFactor, MfaRequired, Session } from './types';

const AUTH = 'https://ocapi-app.arlo.com/api';
const API = 'https://myapi.arlo.com/hmsweb';

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://my.arlo.com',
  Referer: 'https://my.arlo.com/',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  'Auth-Version': '2',
  schemaVersion: '1',
  Source: 'arloCamWeb',
};

async function call(url: string, init: RequestInit & { headers?: Record<string, string> }) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok || (json && json.meta && json.meta.code && json.meta.code >= 400) || (json && json.success === false)) {
    const msg =
      json?.data?.message || json?.data?.reason || json?.meta?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  call(url, { method: 'POST', headers: { ...BASE_HEADERS, ...headers }, body: JSON.stringify(body) });

const b64 = (s: string) => globalThis.btoa(unescape(encodeURIComponent(s)));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Step 1: email + password. Throws MfaRequired if Arlo wants a code. */
export async function login(email: string, password: string): Promise<Session> {
  const r = await post(`${AUTH}/auth`, {
    email,
    password: b64(password),
    language: 'en',
    EnvSource: 'prod',
  });
  const d = r.data;
  const session = { token: d.token as string, userId: d.userId as string };
  // Ask which second factors exist for this account.
  try {
    const f = await call(`${AUTH}/getFactors?data=${d.issued}`, {
      method: 'GET',
      headers: { ...BASE_HEADERS, Authorization: b64(session.token) },
    });
    const factors: MfaFactor[] = (f.data?.items ?? []).filter(
      (x: MfaFactor) => x.factorType !== 'BROWSER',
    );
    if (factors.length > 0 && !d.authCompleted) {
      throw new MfaRequired(factors, session.userId, session.token);
    }
  } catch (e) {
    if (e instanceof MfaRequired) throw e;
    // If the factor lookup itself fails and login already succeeded, carry on.
  }
  return session;
}

/** Step 2a: ask Arlo to send the code to the chosen factor. */
export async function startMfa(m: MfaRequired, factor: MfaFactor): Promise<string> {
  const r = await post(
    `${AUTH}/startAuth`,
    { factorId: factor.factorId, factorType: '', userId: m.userId },
    { Authorization: b64(m.partialToken) },
  );
  return r.data.factorAuthCode as string;
}

/** Step 2b: submit the code. */
export async function finishMfa(m: MfaRequired, factorAuthCode: string, otp: string): Promise<Session> {
  const r = await post(
    `${AUTH}/finishAuth`,
    { factorAuthCode, otp, isBrowserTrusted: true },
    { Authorization: b64(m.partialToken) },
  );
  return { token: r.data.token as string, userId: m.userId };
}

const authHeaders = (s: Session, extra: Record<string, string> = {}) => ({
  ...BASE_HEADERS,
  Authorization: s.token,
  ...extra,
});

export async function getDevices(s: Session): Promise<Device[]> {
  const r = await call(`${API}/v2/users/devices?t=${Date.now()}`, { method: 'GET', headers: authHeaders(s) });
  return r.data as Device[];
}

/** Send a command to a device through Arlo's "notify" endpoint. */
async function notify(
  s: Session,
  target: Device,
  body: { action: string; resource: string; properties?: Record<string, unknown> },
) {
  return post(
    `${API}/users/devices/notify/${target.deviceId}`,
    {
      from: `${s.userId}_web`,
      to: target.deviceId,
      publishResponse: true,
      transId: `web!${uid()}`,
      ...body,
    },
    authHeaders(s, { xcloudid: target.xCloudId ?? '' }),
  );
}

/** Base station (or the camera itself when it has no hub). */
export const hubOf = (devices: Device[], cam: Device) =>
  devices.find((d) => d.deviceId === cam.parentId) ?? cam;

export const setMode = (s: Session, hub: Device, modeId: string) =>
  notify(s, hub, { action: 'set', resource: 'modes', properties: { active: modeId } });

export const setSiren = (s: Session, hub: Device, on: boolean) =>
  notify(s, hub, {
    action: 'set',
    resource: 'siren',
    properties: { sirenState: on ? 'on' : 'off', duration: 300, volume: 8, pattern: 'alarm' },
  });

export const setSpotlight = (s: Session, hub: Device, cam: Device, on: boolean) =>
  notify(s, hub, { action: 'set', resource: `cameras/${cam.deviceId}`, properties: { spotlight: { enabled: on } } });

export const setPrivacy = (s: Session, hub: Device, cam: Device, on: boolean) =>
  notify(s, hub, { action: 'set', resource: `cameras/${cam.deviceId}`, properties: { privacyActive: on } });

export const setMotionSensitivity = (s: Session, hub: Device, cam: Device, level: number) =>
  notify(s, hub, {
    action: 'set',
    resource: `cameras/${cam.deviceId}`,
    properties: { motionDetection: { armed: true, sensitivity: level, zones: [] } },
  });

export const requestSnapshot = (s: Session, hub: Device, cam: Device) =>
  post(
    `${API}/users/devices/fullFrameSnapshot`,
    {
      from: `${s.userId}_web`,
      to: hub.deviceId,
      action: 'set',
      resource: `cameras/${cam.deviceId}`,
      publishResponse: true,
      transId: `web!${uid()}`,
      properties: { activityState: 'fullFrameSnapshot' },
    },
    authHeaders(s, { xcloudid: hub.xCloudId ?? '' }),
  );

/** Returns a stream URL (usually rtsps://). Playback support varies by phone. */
export async function startStream(s: Session, hub: Device, cam: Device): Promise<string> {
  const r = await post(
    `${API}/users/devices/startStream`,
    {
      from: `${s.userId}_web`,
      to: hub.deviceId,
      action: 'set',
      resource: `cameras/${cam.deviceId}`,
      publishResponse: true,
      transId: `web!${uid()}`,
      responseUrl: '',
      properties: { activityState: 'startUserStream', cameraId: cam.deviceId },
    },
    authHeaders(s, { xcloudid: hub.xCloudId ?? '' }),
  );
  return (r.data.url as string).replace(/^rtsp:/, 'rtsps:');
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
export async function getLibrary(s: Session, days = 7): Promise<LibraryItem[]> {
  const to = new Date();
  const from = new Date(Date.now() - days * 86400_000);
  const r = await post(`${API}/users/library`, { dateFrom: ymd(from), dateTo: ymd(to) }, authHeaders(s));
  return (r.data ?? []) as LibraryItem[];
}
