import React, { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';

import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { AuthError, AuthDivider, AuthScaffold, Reveal } from '@/components/auth/AuthScaffold';
import { AuthSplitCard } from '@/components/auth/AuthSplitCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/context/AuthProvider';
import { signInWithApple } from '@/lib/appleAuth';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { signInWithGoogle } from '@/lib/oauth';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { colors, spacing, shadows } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      hapticError();
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      hapticSuccess();
      // The root route guard redirects to Accept Terms or Home once the
      // session and profile have loaded.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === 'success') {
        hapticSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue with Google.');
      hapticError();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setAppleLoading(true);
    try {
      const result = await signInWithApple();
      if (result === 'success') {
        hapticSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue with Apple.');
      hapticError();
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <AuthScaffold>
      <Reveal delay={80}>
        <AuthSplitCard />
      </Reveal>

      <Reveal delay={190} style={{ marginTop: spacing.xxxl }}>
        <Text variant="display" color={colors.text} accessibilityRole="header">
          Welcome back.
        </Text>
        <Text
          variant="body"
          color={colors.textMuted}
          style={{ marginTop: spacing.sm, maxWidth: 320 }}
        >
          Your expenses, shared balances and conversations in one private place.
        </Text>
      </Reveal>

      <View style={{ marginTop: spacing.xl }}>
        {error ? <AuthError message={error} /> : null}

        <Reveal delay={260}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            icon="mail-outline"
            returnKeyType="next"
          />
        </Reveal>

        <Reveal delay={320}>
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            placeholder="Your password"
            icon="lock-closed-outline"
            returnKeyType="go"
            onSubmitEditing={() => void handleSignIn()}
          />
        </Reveal>

        <Reveal delay={370}>
          <View style={{ alignItems: 'flex-end', marginTop: -spacing.sm }}>
            <Link href="/(auth)/forgot-password" asChild>
              <PressableScale
                accessibilityLabel="Forgot password"
                style={{ minHeight: 44, justifyContent: 'center', paddingLeft: spacing.md }}
              >
                <Text variant="bodyStrong" color={colors.primary} style={{ fontSize: 13, lineHeight: 18 }}>
                  Forgot password?
                </Text>
              </PressableScale>
            </Link>
          </View>
        </Reveal>

        <Reveal delay={420}>
          <Button
            label="Sign in"
            onPress={() => void handleSignIn()}
            loading={loading}
            disabled={googleLoading || appleLoading}
            icon="arrow-forward"
            iconPosition="right"
            size="lg"
            gradient={false}
            style={[shadows.glow, { marginTop: spacing.xs }]}
          />
        </Reveal>

        <Reveal delay={470}>
          <AuthDivider />
        </Reveal>

        <Reveal delay={520} style={{ marginTop: spacing.lg }}>
          <AppleSignInButton
            onPress={() => void handleAppleSignIn()}
            disabled={loading || googleLoading || appleLoading}
          />
        </Reveal>

        <Reveal delay={570}>
          <Button
            label="Continue with Google"
            variant="outline"
            icon="logo-google"
            onPress={() => void handleGoogleSignIn()}
            loading={googleLoading}
            disabled={loading || appleLoading}
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
        </Reveal>

        <Reveal delay={620}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: spacing.lg,
              minHeight: 44
            }}
          >
            <Text variant="body" color={colors.textMuted}>
              New here?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <PressableScale
                accessibilityLabel="Create an account"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text variant="bodyStrong" color={colors.primary}>
                  Create an account
                </Text>
              </PressableScale>
            </Link>
          </View>
        </Reveal>
      </View>
    </AuthScaffold>
  );
}
