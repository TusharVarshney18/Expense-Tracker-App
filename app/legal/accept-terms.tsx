import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Link } from 'expo-router';

import { Button, Card, ErrorBanner, Screen, Text } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useTheme } from '@/theme';

export default function AcceptTermsScreen() {
  const { acceptTerms } = useAuth();
  const { colors, spacing, layout } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setSaving(true);
    setError(null);
    try {
      await acceptTerms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your acceptance. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: layout.screenPadding, gap: spacing.lg }}
      >
        <Text variant="display" color={colors.text}>Before you continue</Text>
        <Text variant="body" color={colors.textSecondary}>
          Expense Counter includes private chat. Please review the rules and privacy details before using it.
        </Text>
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            <Link href="/legal/terms"><Text variant="bodyStrong" color={colors.primary}>Terms of Service</Text></Link>
            <Link href="/legal/privacy"><Text variant="bodyStrong" color={colors.primary}>Privacy Policy</Text></Link>
          </View>
        </Card>
        {error ? <ErrorBanner title="Could not save acceptance" message={error} /> : null}
        <Button
          label="I agree and continue"
          onPress={() => void handleAccept()}
          loading={saving}
          accessibilityHint="Records acceptance of the current Terms of Service and Privacy Policy."
        />
      </ScrollView>
    </Screen>
  );
}
