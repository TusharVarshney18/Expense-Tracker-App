import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/context/AuthProvider';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import {
  getBiometricEnabled,
  isBiometricSupported,
  setBiometricEnabled
} from '@/lib/biometrics';
import { COLORS } from '@/lib/constants';

export default function SettingsScreen() {
  const { profile, user, signOut, deleteAccount } = useAuth();
  const { blockedIds, unblock, refresh } = useBlockedUsers();

  const [biometricEnabled, setBiometric] = useState(false);
  const [biometricSupported, setSupported] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setSupported(await isBiometricSupported());
        setBiometric(await getBiometricEnabled());
        await refresh();
      })();
    }, [refresh])
  );

  const toggleBiometric = useCallback(async (value: boolean) => {
    if (value && !(await isBiometricSupported())) {
      Alert.alert(
        'Biometrics unavailable',
        'Set up a fingerprint or face unlock in your device settings first.'
      );
      return;
    }
    await setBiometricEnabled(value);
    setBiometric(value);
  }, []);

  const handleUnblock = useCallback(
    (id: string) => {
      Alert.alert('Unblock user', 'You will be able to see each other\'s messages again.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            void unblock(id).catch((err) =>
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not unblock.')
            );
          }
        }
      ]);
    },
    [unblock]
  );

  const performDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      setDeleting(false);
      Alert.alert(
        'Deletion failed',
        err instanceof Error ? err.message : 'Could not delete your account. Try again.'
      );
    }
  }, [deleteAccount]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, all your expenses, every message you have sent, your push token and the app data on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'There is no way to recover your data after this step.',
              [
                { text: 'Keep my account', style: 'cancel' },
                { text: 'Delete forever', style: 'destructive', onPress: () => void performDelete() }
              ]
            );
          }
        }
      ]
    );
  }, [performDelete]);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <Avatar name={profile?.full_name ?? user?.email ?? '?'} size={56} />
          <View style={styles.profileText}>
            <Text style={styles.name}>{profile?.full_name ?? 'Your account'}</Text>
            <Text style={styles.email}>{profile?.email ?? user?.email ?? ''}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.rowTitle}>Biometric app lock</Text>
              <Text style={styles.rowSubtitle}>
                {biometricSupported
                  ? 'Require Face ID, fingerprint or passcode to open the app.'
                  : 'Not available on this device.'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(value) => void toggleBiometric(value)}
              disabled={!biometricSupported}
              trackColor={{ true: COLORS.primary, false: COLORS.border }}
              thumbColor={COLORS.surface}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Blocked users</Text>
        <View style={styles.card}>
          {blockedIds.length === 0 ? (
            <Text style={styles.muted}>
              You have not blocked anyone. Messages with a blocked user are hidden in
              both directions.
            </Text>
          ) : (
            blockedIds.map((id, index) => (
              <View
                key={id}
                style={[styles.blockedRow, index > 0 && styles.blockedRowBorder]}
              >
                <Text style={styles.blockedId} numberOfLines={1}>
                  {id}
                </Text>
                <Pressable onPress={() => handleUnblock(id)}>
                  <Text style={styles.unblock}>Unblock</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.card}>
          <Link href="/legal/privacy" asChild>
            <Pressable style={styles.linkRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              <Text style={styles.rowTitle}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </Pressable>
          </Link>
          <View style={styles.divider} />
          <Link href="/legal/terms" asChild>
            <Pressable style={styles.linkRow}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              <Text style={styles.rowTitle}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </Pressable>
          </Link>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
          <View style={{ height: 12 }} />
          <Button
            label={deleting ? 'Deleting…' : 'Delete account'}
            variant="danger"
            loading={deleting}
            onPress={confirmDelete}
          />
          <Text style={styles.dangerNote}>
            Deleting your account removes your profile, expenses, messages and push
            token, and wipes this device's local data. It cannot be undone.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  profileText: { marginLeft: 14, flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16
  },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchText: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  rowSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 3, lineHeight: 18 },
  muted: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  blockedRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  blockedId: { flex: 1, fontSize: 13, color: COLORS.text, marginRight: 12 },
  unblock: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 10
  },
  dangerNote: { fontSize: 12, color: COLORS.danger, marginTop: 12, lineHeight: 17 }
});
