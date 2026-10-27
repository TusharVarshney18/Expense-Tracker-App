import React, { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const { colors, spacing, shadows } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    if (!acceptedTerms) {
      setTermsError('Accept the Terms of Service and Privacy Policy to continue.');
      hapticError();
      return;
    }
    setTermsError(null);
    if (!fullName.trim()) {
      setError('Please enter your name.');
      hapticError();
      return;
    }
    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      hapticError();
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      hapticError();
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
      hapticSuccess();
      // The root route guard redirects once the new session and profile load.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
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
        <AuthSplitCard compact style={{ marginTop: spacing.lg }} />
      </Reveal>

      <Reveal delay={190} style={{ marginTop: spacing.xxl }}>
        <Text variant="display" color={colors.text} accessibilityRole="header">
          Create your account.
        </Text>
        <Text
          variant="body"
          color={colors.textMuted}
          style={{ marginTop: spacing.sm, maxWidth: 340 }}
        >
          Your expenses and messages stay private to you. Always.
        </Text>
      </Reveal>

      <View style={{ marginTop: spacing.xl }}>
        {error ? <AuthError message={error} /> : null}

        <Reveal delay={250}>
          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            placeholder="Tushar"
            icon="person-outline"
            returnKeyType="next"
          />
        </Reveal>

        <Reveal delay={300}>
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

        <Reveal delay={350}>
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            autoComplete="password-new"
            placeholder="At least 8 characters"
            icon="lock-closed-outline"
            returnKeyType="go"
            onSubmitEditing={() => void handleSignUp()}
            hint="Use 8 or more characters."
          />
        </Reveal>

        <Reveal delay={400}>
          <PressableScale
            onPress={() => {
              setAcceptedTerms((current) => !current);
              setTermsError(null);
            }}
            accessibilityLabel="Accept Terms of Service and Privacy Policy"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.sm,
              minHeight: 48,
              paddingVertical: spacing.xs
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: acceptedTerms ? colors.primary : colors.inputBorder,
                backgroundColor: acceptedTerms ? colors.primary : colors.input,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1
              }}
            >
              {acceptedTerms ? (
                <Ionicons name="checkmark" size={15} color={colors.onPrimary} />
              ) : null}
            </View>
            <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
              I agree to the Terms of Service and Privacy Policy.
            </Text>
          </PressableScale>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: spacing.md,
              marginBottom: spacing.xs
            }}
          >
            <Link href="/legal/terms" asChild>
              <PressableScale
                accessibilityLabel="Read Terms of Service"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text variant="caption" color={colors.primary} weight="bold">
                  Read Terms
                </Text>
              </PressableScale>
            </Link>
            <Link href="/legal/privacy" asChild>
              <PressableScale
                accessibilityLabel="Read Privacy Policy"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text variant="caption" color={colors.primary} weight="bold">
                  Read Privacy Policy
                </Text>
              </PressableScale>
            </Link>
          </View>

          {termsError ? (
            <Text
              variant="caption"
              color={colors.danger}
              accessibilityRole="alert"
              style={{ marginBottom: spacing.sm }}
            >
              {termsError}
            </Text>
          ) : null}
        </Reveal>

        <Reveal delay={460}>
          <Button
            label="Create account"
            onPress={() => void handleSignUp()}
            loading={loading}
            disabled={!acceptedTerms || googleLoading || appleLoading}
            icon="arrow-forward"
            iconPosition="right"
            size="lg"
            gradient={false}
            style={[shadows.glow, { marginTop: spacing.sm }]}
          />
        </Reveal>

        <Reveal delay={510}>
          <AuthDivider />
        </Reveal>

        <Reveal delay={560} style={{ marginTop: spacing.lg }}>
          <AppleSignInButton
            onPress={() => void handleAppleSignIn()}
            disabled={loading || googleLoading || appleLoading}
          />
        </Reveal>

        <Reveal delay={610}>
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

        <Reveal delay={660}>
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
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <PressableScale
                accessibilityLabel="Sign in"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text variant="bodyStrong" color={colors.primary}>
                  Sign in
                </Text>
              </PressableScale>
            </Link>
          </View>
        </Reveal>
      </View>
    </AuthScaffold>
  );
}
