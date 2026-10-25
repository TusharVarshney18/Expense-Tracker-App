import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { ResponsiveActions } from '@/components/ui/ResponsiveActions';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { REPORT_REASONS } from '@/lib/constants';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { ReportReason } from '@/types';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}

export function ReportModal({ visible, onClose, onSubmit }: ReportModalProps) {
  const { colors, spacing, radius } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReason(null);
    setDetails('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please choose a reason.');
      hapticError();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason, details.trim());
      hapticSuccess();
      reset();
      onClose();
    } catch (err) {
      hapticError();
      setError(err instanceof Error ? err.message : 'Could not submit report.');
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Report this conversation"
      subtitle="Your report is confidential. Repeated abuse may lead to the account being removed."
      footer={
        <ResponsiveActions
          primaryLabel="Submit report"
          primaryVariant="danger"
          onPrimaryPress={() => void handleSubmit()}
          primaryLoading={submitting}
          secondaryLabel="Cancel"
          secondaryVariant="secondary"
          onSecondaryPress={handleClose}
          disabled={submitting}
        />
      }
    >
      {REPORT_REASONS.map((option) => {
        const selected = reason === option.value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => {
              setReason(option.value);
              setError(null);
            }}
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: 52,
              paddingHorizontal: spacing.md,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor: selected ? `${colors.danger}66` : colors.border,
              backgroundColor: selected ? colors.dangerSoft : colors.surface,
              marginBottom: spacing.sm
            }}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? colors.danger : colors.textMuted}
            />
            <Text variant="bodyStrong" color={selected ? colors.danger : colors.text} style={{ flex: 1 }}>
              {option.label}
            </Text>
          </PressableScale>
        );
      })}

      <Input
        label="Additional details (optional)"
        value={details}
        onChangeText={setDetails}
        placeholder="Tell us what happened"
        multiline
        numberOfLines={3}
        containerStyle={{ marginTop: spacing.md, marginBottom: 0 }}
      />

      {error ? (
        <View style={{ marginTop: spacing.md }}>
          <ErrorBanner message={error} title="Could not submit report" />
        </View>
      ) : null}
    </BottomSheet>
  );
}
