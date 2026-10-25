import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from './PressableScale';
import { Input } from './Input';
import { useTheme } from '@/theme';

type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'right' | 'secureTextEntry'
>;

/** Password field with an accessible show/hide toggle. */
export function PasswordInput(props: PasswordInputProps) {
  const { colors, spacing } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      secureTextEntry={!visible}
      right={
        <PressableScale
          onPress={() => setVisible((current) => !current)}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          accessibilityHint="Toggles whether your password is visible"
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
          style={{ width: 44, height: 44 }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textMuted}
          />
        </PressableScale>
      }
    />
  );
}
