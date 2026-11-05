import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { saveImage } from '../storage';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as arlo from '../arlo/client';
import { Device } from '../arlo/types';
import { useArlo } from '../ArloContext';
import { c } from '../theme';
import { Button, Card, Dim, Title } from '../ui';

export default function Cameras() {
  const { cameras, refresh, refreshing, error } = useArlo();
  const [open, setOpen] = useState<Device | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
      >
        <Title>Cameras</Title>
        {error && <Text style={{ color: c.danger, marginBottom: 8 }}>{error}</Text>}
        {cameras.length === 0 && !refreshing && <Dim>No cameras found. Pull to refresh.</Dim>}
        {cameras.map((cam) => (
          <Pressable key={cam.deviceId} onPress={() => setOpen(cam)} style={{ marginBottom: 14 }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {cam.properties?.presignedLastImageUrl ? (
                <Image source={{ uri: cam.properties.presignedLastImageUrl }} style={{ height: 190, backgroundColor: '#000' }} />
              ) : (
                <View style={{ height: 190, backgroundColor: '#000' }} />
              )}
              <View style={{ padding: 12 }}>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 17 }}>{cam.deviceName}</Text>
                <Dim>
                  {cam.properties?.connectionState ?? 'unknown'}
                  {cam.properties?.batteryLevel != null ? ` · 🔋 ${cam.properties.batteryLevel}%` : ''}
                  {cam.properties?.signalStrength != null ? ` · 📶 ${cam.properties.signalStrength}/5` : ''}
                </Dim>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
      {open && <CameraModal cam={open} onClose={() => setOpen(null)} />}
    </View>
  );
}

function CameraModal({ cam, onClose }: { cam: Device; onClose: () => void }) {
  const { session, devices, refresh } = useArlo();
  const hub = arlo.hubOf(devices, cam);
  const live = devices.find((d) => d.deviceId === cam.deviceId) ?? cam;
  const img = live.properties?.presignedFullFrameSnapshotUrl ?? live.properties?.presignedLastImageUrl;
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [spot, setSpot] = useState(false);
  const [privacy, setPrivacy] = useState(!!live.properties?.privacyActive);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const guard = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    try {
      await fn();
      Haptics.selectionAsync();
    } catch (e: any) {
      Alert.alert('Arlo said no', e.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const snap = () =>
    guard('snap', async () => {
      await arlo.requestSnapshot(session!, hub, cam);
      await new Promise((r) => setTimeout(r, 2500));
      await refresh();
    });

  // "Live" fallback: grab a fresh frame every few seconds.
  useEffect(() => {
    if (!auto) return;
    timer.current = setInterval(snap, 6000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const save = () =>
    guard('save', async () => {
      if (!img) throw new Error('No image yet');
      await saveImage(img, cam.deviceName);
    });

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
        <Title>{cam.deviceName}</Title>
        {streamUrl ? (
          <Stream url={streamUrl} />
        ) : img ? (
          <Image source={{ uri: img }} style={{ height: 230, borderRadius: 14, backgroundColor: '#000' }} resizeMode="contain" />
        ) : (
          <View style={{ height: 230, backgroundColor: '#000', borderRadius: 14 }} />
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button style={{ flex: 1 }} title="Snapshot" onPress={snap} busy={busy === 'snap'} />
          <Button
            style={{ flex: 1 }}
            kind="ghost"
            title={streamUrl ? 'Stop live' : 'Live video'}
            busy={busy === 'stream'}
            onPress={() =>
              streamUrl
                ? setStreamUrl(null)
                : guard('stream', async () => setStreamUrl(await arlo.startStream(session!, hub, cam)))
            }
          />
          <Button style={{ flex: 1 }} kind="ghost" title="Save" onPress={save} busy={busy === 'save'} />
        </View>

        <Card style={{ marginTop: 16 }}>
          <Row label="Auto-refresh picture (every 6s)">
            <Switch value={auto} onValueChange={setAuto} />
          </Row>
          <Row label="Spotlight">
            <Switch
              value={spot}
              onValueChange={(v) => {
                setSpot(v);
                guard('spot', () => arlo.setSpotlight(session!, hub, cam, v));
              }}
            />
          </Row>
          <Row label="Privacy mode (lens off)">
            <Switch
              value={privacy}
              onValueChange={(v) => {
                setPrivacy(v);
                guard('priv', () => arlo.setPrivacy(session!, hub, cam, v));
              }}
            />
          </Row>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={{ color: c.text, fontWeight: '700', marginBottom: 8 }}>Motion sensitivity</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[20, 40, 60, 80, 100].map((n) => (
              <Button
                key={n}
                kind="ghost"
                style={{ flex: 1, paddingHorizontal: 0 }}
                title={String(n)}
                onPress={() => guard('mot', () => arlo.setMotionSensitivity(session!, hub, cam, n))}
              />
            ))}
          </View>
        </Card>

        <Dim>
          Live video uses Arlo's stream URL; some phones can't play it. If it stays black use Snapshot or auto-refresh.
        </Dim>
        <Button style={{ marginTop: 16 }} kind="ghost" title="Close" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
    <Text style={{ color: c.text }}>{label}</Text>
    {children}
  </View>
);

function Stream({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return <VideoView player={player} style={{ height: 230, borderRadius: 14, backgroundColor: '#000' }} nativeControls />;
}
