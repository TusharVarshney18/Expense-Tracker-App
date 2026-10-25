import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Switch,
  View
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

import { BrandMark } from '@/components/BrandMark';
import {
  Avatar,
  Button,
  Card,
  ErrorBanner,
  Input,
  ListRow,
  PressableScale,
  Screen,
  SegmentedControl,
  Text
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useBudget } from '@/hooks/useBudget';
import { useLocalToggle } from '@/hooks/useLocalToggle';
import {
  getBiometricEnabled,
  isBiometricSupported,
  setBiometricEnabled
} from '@/lib/biometrics';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { rupeesToPaise } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { useTheme, type ThemeMode } from '@/theme';

const APP_NAME = Constants.expoConfig?.name ?? 'Expense Counter';
const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
const X_PROFILE_URL = 'https://x.com/Tushar_Jsx';
const PORTFOLIO_URL = 'https://portfolio-2-frontend-ten.vercel.app/';

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, minWidth: 0 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceSunken
        }}
      >
        <Ionicons name={icon} size={19} color={disabled ? colors.textMuted : colors.textSecondary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" color={colors.text} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }} numberOfLines={3} ellipsizeMode="tail">
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceSunken, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.surfaceSunken}
        accessibilityLabel={title}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { profile, user, signOut, deleteAccount, refreshProfile } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { colors, spacing, radius, layout, mode, setMode } = useTheme();
  const { blockedIds, unblock, refresh } = useBlockedUsers();
  const { budgetPaise, updateBudget } = useBudget();
  const chatNotifications = useLocalToggle('expense-counter:notify-chat', true);
  const reminderNotifications = useLocalToggle('expense-counter:notify-reminders', true);

  const [biometricEnabled, setBiometric] = useState(false);
  const [biometricSupported, setSupported] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? profile?.full_name ?? '');
  const [upiId, setUpiId] = useState(profile?.upi_id ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [budgetSaved, setBudgetSaved] = useState(false);
  const budgetTouched = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setSupported(await isBiometricSupported());
        setBiometric(await getBiometricEnabled());
        await refresh();
      })();
    }, [refresh])
  );

  useEffect(() => {
    if (!budgetTouched.current) {
      // Sync the locally stored budget once it has loaded from AsyncStorage.
      setBudgetInput((budgetPaise / 100).toFixed(0));
    }
  }, [budgetPaise]);

  const saveProfile = useCallback(async () => {
    if (!userId) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          upi_id: upiId.trim() || null
        })
        .eq('id', userId);
      if (error) throw error;
      await refreshProfile();
      hapticSuccess();
    } catch (err) {
      hapticError();
      setProfileError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  }, [displayName, refreshProfile, upiId, userId]);

  const saveBudget = useCallback(async () => {
    const numeric = Number.parseFloat(budgetInput);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setBudgetError('Enter a monthly budget greater than zero.');
      hapticError();
      return;
    }
    budgetTouched.current = true;
    setBudgetError(null);
    await updateBudget(rupeesToPaise(numeric));
    setBudgetSaved(true);
    hapticSuccess();
    setTimeout(() => setBudgetSaved(false), 1600);
  }, [budgetInput, updateBudget]);

  const toggleBiometric = useCallback(async (value: boolean) => {
    if (value && !(await isBiometricSupported())) {
      hapticError();
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
      'This permanently deletes your profile, personal expenses, shared group expenses and settlements involving you, messages you have sent, your push token and the app data on this device. Groups with other members stay available under a new admin; a group with no other members is deleted. This cannot be undone.',
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

  const openExternal = useCallback((url: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', 'Please try again later.');
    });
  }, []);

  const name = profile?.display_name ?? profile?.full_name ?? user?.email ?? 'Your account';
  const email = profile?.email ?? user?.email ?? '';
  const initials = name;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.sm,
            paddingBottom: layout.tabBarContentInset + spacing.xl
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="title" color={colors.text}>
            Settings
          </Text>
          <Text variant="body" color={colors.textMuted} style={{ marginTop: 4 }}>
            Make it yours. Keep it private.
          </Text>

          <LinearGradient
            colors={[colors.surfaceRaised, colors.primarySoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              marginTop: spacing.lg,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md
            }}
          >
            <Avatar name={initials} size={60} ring />
              <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="subtitle" color={colors.text} numberOfLines={1}>
                {name}
              </Text>
              <Text variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>
                {email}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: spacing.sm
                }}
              >
                <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                <Text variant="caption" color={colors.primary} style={{ fontSize: 10 }}>
                  Private account
                </Text>
              </View>
            </View>
          </LinearGradient>

          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Appearance
          </Text>
          <Card>
            <SegmentedControl
              value={mode}
              onChange={(next) => {
                hapticSuccess();
                setMode(next as ThemeMode);
              }}
              options={[
                { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
                { value: 'light', label: 'Light', icon: 'sunny-outline' },
                { value: 'dark', label: 'Dark', icon: 'moon-outline' }
              ]}
            />
            <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              System follows your phone&apos;s light or dark setting.
            </Text>
          </Card>

          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Monthly budget
          </Text>
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.sm }}>
              <Input
                label="Budget (₹)"
                value={budgetInput}
                onChangeText={(value) => {
                  budgetTouched.current = true;
                  setBudgetInput(value);
                  setBudgetError(null);
                }}
                keyboardType="decimal-pad"
                placeholder="25000"
                icon="flag-outline"
                containerStyle={{ flex: 1, minWidth: 150, marginBottom: 0 }}
                errorText={budgetError}
              />
              <Button
                label={budgetSaved ? 'Saved' : 'Save'}
                onPress={() => void saveBudget()}
                variant="secondary"
                fullWidth={false}
                icon={budgetSaved ? 'checkmark' : undefined}
                style={{ marginBottom: budgetError ? 22 : 0, paddingHorizontal: spacing.lg }}
              />
            </View>
            <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Drives the progress ring on your dashboard. Stored on this device.
            </Text>
          </Card>

          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Shared group profile
          </Text>
          <Card>
            <Input
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Name shown to group members"
              maxLength={80}
              icon="person-outline"
            />
            <Input
              label="UPI ID (optional)"
              value={upiId}
              onChangeText={setUpiId}
              placeholder="name@bank"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
              icon="at-outline"
              containerStyle={{ marginBottom: spacing.sm }}
            />
            {profileError ? <ErrorBanner message={profileError} title="Could not save profile" /> : null}
            <Button label="Save group profile" loading={savingProfile} onPress={() => void saveProfile()} />
          </Card>

          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Security
          </Text>
          <Card>
            <ToggleRow
              icon="finger-print-outline"
              title="Biometric app lock"
              subtitle={
                biometricSupported
                  ? 'Require Face ID, fingerprint or passcode to open the app.'
                  : 'Not available on this device.'
              }
              value={biometricEnabled}
              onValueChange={(value) => void toggleBiometric(value)}
              disabled={!biometricSupported}
            />
          </Card>

          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Notifications
          </Text>
          <Card>
            <ToggleRow
              icon="chatbubble-ellipses-outline"
              title="Chat messages"
              subtitle="Alerts when someone sends you a message."
              value={chatNotifications.value}
              onValueChange={chatNotifications.setValue}
            />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <ToggleRow
              icon="alarm-outline"
              title="Expense reminders"
              subtitle="Gentle nudges to keep your ledger current."
              value={reminderNotifications.value}
              onValueChange={reminderNotifications.setValue}
            />
            <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Preferences are stored on this device.
            </Text>
          </Card>

          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Blocked users
          </Text>
          <Card padded={false}>
            {blockedIds.length === 0 ? (
              <View style={{ padding: spacing.lg }}>
                <Text variant="body" color={colors.textMuted}>
                  You have not blocked anyone. Messages with a blocked user are hidden in both directions.
                </Text>
              </View>
            ) : (
              blockedIds.map((id, index) => (
                <View
                  key={id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing.lg,
                    minHeight: 54,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <Ionicons name="ban-outline" size={17} color={colors.textMuted} />
                    <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                      {id}
                    </Text>
                  </View>
                  <Button
                    label="Unblock"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={() => handleUnblock(id)}
                    style={{ paddingHorizontal: spacing.sm }}
                  />
                </View>
              ))
            )}
          </Card>

          <Text variant="label" color={colors.textMuted} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            About
          </Text>
          <Card padded={false}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg
              }}
            >
              <BrandMark size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="subtitle" color={colors.text} numberOfLines={1}>
                  {APP_NAME}
                </Text>
                <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Version {APP_VERSION}
                </Text>
                <Text variant="caption" color={colors.primary} numberOfLines={1} style={{ marginTop: 2 }}>
                  Made by Tushar · @Tushar_Jsx
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ paddingHorizontal: spacing.lg }}>
              <ListRow
                title="X (Twitter)"
                subtitle="@Tushar_Jsx"
                icon="logo-twitter"
                onPress={() => openExternal(X_PROFILE_URL)}
                accessibilityLabel="Open Tushar's X profile"
              />
              <ListRow
                title="Portfolio"
                subtitle="Tushar Varshney"
                icon="globe-outline"
                onPress={() => openExternal(PORTFOLIO_URL)}
                accessibilityLabel="Open Tushar's portfolio"
                showDivider
              />
              <ListRow
                title="Privacy Policy"
                icon="shield-checkmark-outline"
                onPress={() => router.push('/legal/privacy')}
                showDivider
              />
              <ListRow
                title="Terms of Service"
                icon="document-text-outline"
                onPress={() => router.push('/legal/terms')}
                showDivider
              />
            </View>
          </Card>

          <Text variant="label" color={colors.danger} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            Danger zone
          </Text>
          <Card variant="danger">
            <Text variant="bodyStrong" color={colors.text}>
              Account & data
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4, lineHeight: 18 }}>
              Deleting your account removes your profile, expenses, group entries involving you, messages and this device&apos;s local data. It cannot be undone.
            </Text>
            <Button
              label="Sign out"
              variant="secondary"
              onPress={() => void signOut()}
              style={{ marginTop: spacing.md }}
            />
            <Button
              label={deleting ? 'Deleting…' : 'Delete account'}
              variant="danger"
              loading={deleting}
              onPress={confirmDelete}
              style={{ marginTop: spacing.sm }}
            />
          </Card>

          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Text variant="caption" color={colors.textMuted}>
              Expense Counter · Private by design
            </Text>
            <PressableScale
              onPress={() => openExternal(X_PROFILE_URL)}
              accessibilityLabel="Open Tushar's X profile"
              style={{ minHeight: 44, marginTop: spacing.xxs }}
            >
              <Text variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                Made by Tushar · @Tushar_Jsx
              </Text>
            </PressableScale>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
