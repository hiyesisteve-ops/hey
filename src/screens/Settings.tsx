import React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { askNotifyPermission } from '../watch';
import { useArlo } from '../ArloContext';
import { c } from '../theme';
import { Button, Card, Dim, Title } from '../ui';

export default function Settings() {
  const { setSession, devices, watching, setWatching } = useArlo();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <Title>Free event recording</Title>
      <Card style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: c.text, flex: 1, marginRight: 12 }}>Watch mode: save motion events + alert me</Text>
          <Switch
            value={watching}
            onValueChange={async (v) => {
              if (v) await askNotifyPermission();
              setWatching(v);
            }}
          />
        </View>
        <Dim>Checks every 15s while the app is open (keep it on screen). Events land in the Saved tab.</Dim>
      </Card>
      <Title>Devices</Title>
      {devices.map((d) => (
        <Card key={d.deviceId} style={{ marginBottom: 10 }}>
          <Text style={{ color: c.text, fontWeight: '700' }}>{d.deviceName}</Text>
          <Dim>
            {d.deviceType} · {d.modelId ?? 'unknown model'} · {d.properties?.connectionState ?? ''}
          </Dim>
        </Card>
      ))}
      <Button kind="danger" style={{ marginTop: 20 }} title="Sign out" onPress={() => setSession(null)} />
      <Dim>
        Unofficial and not affiliated with Arlo. Arlo can change or block the web API at any time, which may break
        features until the client is updated.
      </Dim>
    </ScrollView>
  );
}
