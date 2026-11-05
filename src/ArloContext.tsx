import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as arlo from './arlo/client';
import { Device, Session } from './arlo/types';
import { processEvents } from './watch';

type Ctx = {
  session: Session | null;
  ready: boolean;
  devices: Device[];
  cameras: Device[];
  hubs: Device[];
  refreshing: boolean;
  watching: boolean;
  setWatching: (b: boolean) => void;
  error: string | null;
  setSession: (s: Session | null) => Promise<void>;
  refresh: () => Promise<void>;
};

const KEY = 'arlo.session';
const C = createContext<Ctx>(null as any);
export const useArlo = () => useContext(C);

export function ArloProvider({ children }: { children: React.ReactNode }) {
  const [session, setS] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSession = useCallback(async (s: Session | null) => {
    setS(s);
    try {
      if (s) await SecureStore.setItemAsync(KEY, JSON.stringify(s));
      else await SecureStore.deleteItemAsync(KEY);
    } catch {}
    if (!s) setDevices([]);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) setS(JSON.parse(raw));
      } catch {}
      setReady(true);
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    try {
      const list = await arlo.getDevices(session);
      setDevices(list);
      if (watching) await processEvents(list);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
      if (/401|unauthor|token/i.test(e.message ?? '')) await setSession(null);
    } finally {
      setRefreshing(false);
    }
  }, [session, setSession, watching]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!watching || !session) return;
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [watching, session, refresh]);

  const cameras = devices.filter((d) => /camera|arloq|doorbell/i.test(d.deviceType));
  const hubs = devices.filter((d) => /basestation|arlobridge/i.test(d.deviceType));

  return (
    <C.Provider value={{ session, ready, devices, cameras, hubs, refreshing, watching, setWatching, error, setSession, refresh }}>
      {children}
    </C.Provider>
  );
}
