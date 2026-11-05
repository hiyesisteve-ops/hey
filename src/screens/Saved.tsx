import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { c } from '../theme';
import { Dim, Title } from '../ui';
import { snapDir } from '../storage';

export default function Saved() {
  const [files, setFiles] = useState<File[]>([]);
  const load = useCallback(() => {
    const d = snapDir();
    setFiles(d.exists ? (d.list().filter((x) => x instanceof File) as File[]).reverse() : []);
  }, []);
  useEffect(load, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 60 }}
        data={files}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        refreshing={false}
        onRefresh={load}
        keyExtractor={(f) => f.uri}
        ListHeaderComponent={<Title>Saved on phone</Title>}
        ListEmptyComponent={<Dim>No saved snapshots yet. Open a camera and tap Save. Pull to refresh.</Dim>}
        renderItem={({ item }) => (
          <Pressable
            style={{ flex: 1, marginBottom: 10 }}
            onPress={() => Sharing.shareAsync(item.uri)}
            onLongPress={() => {
              item.delete();
              load();
            }}
          >
            <Image source={{ uri: item.uri }} style={{ height: 110, borderRadius: 10, backgroundColor: '#000' }} />
          </Pressable>
        )}
      />
      <Text style={{ color: c.dim, textAlign: 'center', paddingBottom: 90, fontSize: 12 }}>
        Tap to share/export · long-press to delete
      </Text>
    </View>
  );
}
