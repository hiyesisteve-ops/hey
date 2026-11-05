import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { c } from './theme';

export function Button({
  title,
  onPress,
  kind = 'primary',
  busy,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
  style?: ViewStyle;
}) {
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.danger : 'transparent';
  const fg = kind === 'primary' ? '#04201c' : kind === 'danger' ? '#fff' : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, borderColor: kind === 'ghost' ? c.border : bg, opacity: pressed || busy ? 0.6 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const Title = ({ children }: { children: React.ReactNode }) => <Text style={s.title}>{children}</Text>;
export const Dim = ({ children }: { children: React.ReactNode }) => <Text style={s.dim}>{children}</Text>;

export const s = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  btnText: { fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14 },
  title: { color: c.text, fontSize: 28, fontWeight: '800', marginBottom: 12 },
  dim: { color: c.dim, fontSize: 13 },
  input: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 12,
    color: c.text,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
});
