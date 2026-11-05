import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import * as arlo from '../arlo/client';
import { useArlo } from '../ArloContext';
import { c } from '../theme';
import { Button, Card, Dim, Title } from '../ui';

export default function Modes() {
  const { session, hubs, cameras } = useArlo();
  const [active, setActive] = useState<Record<string, string>>({});
  const [siren, setSirenState] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  // Cameras without a base station act as their own hub.
  const targets = hubs.length ? hubs : cameras;

  const act = async (key: string, fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(key);
    try {
      await fn();
      after?.();
    } catch (e: any) {
      Alert.alert('Arlo said no', e.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <Title>Modes & Siren</Title>
      {targets.map((h) => (
        <Card key={h.deviceId} style={{ marginBottom: 14 }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 17, marginBottom: 10 }}>{h.deviceName}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              ['mode1', 'Armed'],
              ['mode0', 'Disarmed'],
            ].map(([id, label]) => (
              <Button
                key={id}
                style={{ flex: 1 }}
                kind={active[h.deviceId] === id ? 'primary' : 'ghost'}
                title={label}
                busy={busy === h.deviceId + id}
                onPress={() =>
                  act(h.deviceId + id, () => arlo.setMode(session!, h, id), () =>
                    setActive((a) => ({ ...a, [h.deviceId]: id })),
                  )
                }
              />
            ))}
          </View>
          <Button
            style={{ marginTop: 10 }}
            kind={siren[h.deviceId] ? 'danger' : 'ghost'}
            title={siren[h.deviceId] ? 'Siren ON – tap to stop' : 'Sound siren'}
            busy={busy === h.deviceId + 'siren'}
            onPress={() =>
              act(h.deviceId + 'siren', () => arlo.setSiren(session!, h, !siren[h.deviceId]), () =>
                setSirenState((s) => ({ ...s, [h.deviceId]: !s[h.deviceId] })),
              )
            }
          />
        </Card>
      ))}
      <Dim>
        Armed/Disarmed use Arlo's default modes (mode1/mode0). The highlighted button shows the last mode set from this
        app, not a live read-back.
      </Dim>
    </ScrollView>
  );
}
