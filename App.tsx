import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArloProvider, useArlo } from './src/ArloContext';
import Cameras from './src/screens/Cameras';
import Library from './src/screens/Library';
import Login from './src/screens/Login';
import Modes from './src/screens/Modes';
import Saved from './src/screens/Saved';
import Settings from './src/screens/Settings';
import { c } from './src/theme';

const TABS = [
  ['Cameras', '📹', Cameras],
  ['Modes', '🛡️', Modes],
  ['Library', '🎞️', Library],
  ['Saved', '💾', Saved],
  ['Settings', '⚙️', Settings],
] as const;

function Root() {
  const { session, ready } = useArlo();
  const [tab, setTab] = useState(0);
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  if (!session) return <Login />;
  const Screen = TABS[tab][2];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen key={tab} />
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: c.card,
          borderTopWidth: 1,
          borderColor: c.border,
          paddingBottom: 24,
          paddingTop: 8,
        }}
      >
        {TABS.map(([name, icon], i) => (
          <Pressable key={name} onPress={() => setTab(i)} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, opacity: i === tab ? 1 : 0.5 }}>{icon}</Text>
            <Text style={{ color: i === tab ? c.accent : c.dim, fontSize: 11 }}>{name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ArloProvider>
      <StatusBar style="light" />
      <Root />
    </ArloProvider>
  );
}
