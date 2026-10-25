import React, { useState } from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthError, AuthScaffold, Reveal } from '@/components/auth/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, radius, spacing, shadows } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter the email address for your account.');
      hapticError();
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      hapticSuccess();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link.');
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      topSlot={
        <View style={{ marginBottom: spacing.lg }}>
          <PressableScale
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(auth)/sign-in');
              }
            }}
            accessibilityLabel="Back to sign in"
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceRaised
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </PressableScale>
        </View>
      }
    >
      {sent ? (
        <View style={{ marginTop: spacing.xxl }}>
          <Reveal delay={80}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.successSoft,
                borderWidth: 1,
                borderColor: colors.primarySoft,
                marginBottom: spacing.lg
              }}
            >
              <Ionicons name="checkmark" size={28} color={colors.success} />
            </View>
            <Text variant="display" color={colors.text} accessibilityRole="header">
              Check your inbox.
            </Text>
            <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              If an account exists for{' '}
              <Text variant="bodyStrong" color={colors.text}>
                {email.trim()}
              </Text>
              , we sent a link to reset your password. The link expires shortly, so use it soon.
            </Text>
            <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.md }}>
              Nothing there? Check your spam folder or try again.
            </Text>
          </Reveal>

          <Reveal delay={220} style={{ marginTop: spacing.xl }}>
            <Button
              label="Back to sign in"
              onPress={() => router.replace('/(auth)/sign-in')}
              size="lg"
              icon="arrow-forward"
              iconPosition="right"
              gradient={false}
              style={shadows.glow}
            />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => {
                setSent(false);
                setError(null);
              }}
              style={{ marginTop: spacing.sm }}
            />
          </Reveal>
        </View>
      ) : (
        <>
          <Reveal delay={80} style={{ marginTop: spacing.xxl }}>
            <Text variant="display" color={colors.text} accessibilityRole="header">
              Reset your password.
            </Text>
            <Text
              variant="body"
              color={colors.textMuted}
              style={{ marginTop: spacing.sm, maxWidth: 340 }}
            >
              Enter the email you use for Expense Counter and we&apos;ll send you a secure reset
              link.
            </Text>
          </Reveal>

          <View style={{ marginTop: spacing.xl }}>
            {error ? <AuthError message={error} /> : null}

            <Reveal delay={220}>
              <Input
                label="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                icon="mail-outline"
                returnKeyType="send"
                onSubmitEditing={() => void handleSend()}
              />
            </Reveal>

            <Reveal delay={280}>
              <Button
                label="Send reset link"
                onPress={() => void handleSend()}
                loading={loading}
                size="lg"
                icon="paper-plane-outline"
                iconPosition="right"
                gradient={false}
                style={[shadows.glow, { marginTop: spacing.xs }]}
              />
            </Reveal>

            <Reveal delay={340}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginTop: spacing.lg,
                  minHeight: 44
                }}
              >
                <Link href="/(auth)/sign-in" asChild>
                  <PressableScale
                    accessibilityLabel="Back to sign in"
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text variant="bodyStrong" color={colors.primary}>
                      Back to sign in
                    </Text>
                  </PressableScale>
                </Link>
              </View>
            </Reveal>
          </View>
        </>
      )}
    </AuthScaffold>
  );
}
