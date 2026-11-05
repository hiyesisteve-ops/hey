import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import * as arlo from '../arlo/client';
import { MfaFactor, MfaRequired } from '../arlo/types';
import { useArlo } from '../ArloContext';
import { c } from '../theme';
import { Button, Dim, s } from '../ui';

export default function Login() {
  const { setSession } = useArlo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mfa, setMfa] = useState<MfaRequired | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const doLogin = () =>
    run(async () => {
      try {
        await setSession(await arlo.login(email.trim(), password));
      } catch (e) {
        if (e instanceof MfaRequired) setMfa(e);
        else throw e;
      }
    });

  const sendCode = (f: MfaFactor) =>
    run(async () => {
      setAuthCode(await arlo.startMfa(mfa!, f));
    });

  const verify = () =>
    run(async () => {
      await setSession(await arlo.finishMfa(mfa!, authCode!, otp.trim()));
    });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24 }}
    >
      <Text style={{ color: c.text, fontSize: 36, fontWeight: '800' }}>Freelo</Text>
      <Text style={{ color: c.dim, marginBottom: 28 }}>Your Arlo cameras, no subscription screens.</Text>

      {!mfa ? (
        <>
          <TextInput
            style={s.input}
            placeholder="Arlo email"
            placeholderTextColor={c.dim}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={c.dim}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Sign in" onPress={doLogin} busy={busy} />
        </>
      ) : !authCode ? (
        <>
          <Text style={{ color: c.text, marginBottom: 10 }}>Arlo needs a verification code. Send it to:</Text>
          {mfa.factors.map((f) => (
            <Button
              key={f.factorId}
              kind="ghost"
              style={{ marginBottom: 8 }}
              title={`${f.factorType}${f.displayName ? ' · ' + f.displayName : ''}`}
              onPress={() => sendCode(f)}
              busy={busy}
            />
          ))}
        </>
      ) : (
        <>
          <TextInput
            style={s.input}
            placeholder="6-digit code"
            placeholderTextColor={c.dim}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
          />
          <Button title="Verify" onPress={verify} busy={busy} />
        </>
      )}

      {err && <Text style={{ color: c.danger, marginTop: 12 }}>{err}</Text>}
      <View style={{ marginTop: 24 }}>
        <Dim>
          Unofficial app. Your credentials go only to Arlo's own servers and the login token is kept in your phone's
          secure storage.
        </Dim>
      </View>
    </KeyboardAvoidingView>
  );
}
