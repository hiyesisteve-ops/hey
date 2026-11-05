import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Linking, Pressable, Text, View } from 'react-native';
import * as arlo from '../arlo/client';
import { LibraryItem } from '../arlo/types';
import { useArlo } from '../ArloContext';
import { c } from '../theme';
import { Card, Dim, Title } from '../ui';

export default function Library() {
  const { session, devices } = useArlo();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setItems(await arlo.getLibrary(session, 7));
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [session]);
  useEffect(() => {
    load();
  }, [load]);

  const name = (id: string) => devices.find((d) => d.deviceId === id)?.deviceName ?? id;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 60 }}
        data={items}
        refreshing={loading}
        onRefresh={load}
        keyExtractor={(i, n) => i.name + n}
        ListHeaderComponent={<Title>Library (7 days)</Title>}
        ListEmptyComponent={
          <Dim>
            {err ? `Error: ${err}` : 'Nothing here. Arlo only keeps cloud recordings for accounts with a plan; use Save on a camera to keep snapshots on your phone for free.'}
          </Dim>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => item.presignedContentUrl && Linking.openURL(item.presignedContentUrl)}
            style={{ marginBottom: 12 }}
          >
            <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {item.presignedThumbnailUrl && (
                <Image source={{ uri: item.presignedThumbnailUrl }} style={{ width: 96, height: 60, borderRadius: 8 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '600' }}>{name(item.deviceId)}</Text>
                <Dim>
                  {item.reason ?? 'clip'} · {item.mediaDurationSecond ?? '?'}s
                </Dim>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
