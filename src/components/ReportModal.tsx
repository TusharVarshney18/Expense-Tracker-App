import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { COLORS, REPORT_REASONS } from '@/lib/constants';
import type { ReportReason } from '@/types';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}

export function ReportModal({ visible, onClose, onSubmit }: ReportModalProps) {
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
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason, details.trim());
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report.');
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report this conversation</Text>
          <Text style={styles.subtitle}>
            Your report is confidential. Repeated abuse may lead to the account
            being removed.
          </Text>

          {REPORT_REASONS.map((option) => {
            const selected = reason === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setReason(option.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <Text style={styles.optionLabel}>{option.label}</Text>
              </Pressable>
            );
          })}

          <TextField
            label="Additional details (optional)"
            value={details}
            onChangeText={setDetails}
            placeholder="Tell us what happened"
            multiline
            numberOfLines={3}
            style={styles.details}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={handleClose}
              style={styles.actionBtn}
            />
            <Button
              label="Submit report"
              variant="danger"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, marginBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    marginRight: 12
  },
  radioSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  optionLabel: { fontSize: 15, color: COLORS.text, flex: 1 },
  details: { height: 84, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: COLORS.danger, fontSize: 13, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 }
});
