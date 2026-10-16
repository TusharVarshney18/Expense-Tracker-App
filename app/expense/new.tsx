import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { useExpenses } from '@/hooks/useExpenses';
import { COLORS, EXPENSE_CATEGORIES } from '@/lib/constants';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { addExpense } = useExpenses();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickFrom = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Allow camera access to photograph a receipt.'
          : 'Allow photo access to attach a saved receipt.'
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.6,
            allowsEditing: true
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.6,
            allowsEditing: true
          });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    const numeric = Number.parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        amount: numeric,
        category,
        note: note.trim() || null,
        receiptUri
      });
      router.back();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {EXPENSE_CATEGORIES.map((option) => {
              const selected = option === category;
              return (
                <Pressable
                  key={option}
                  onPress={() => setCategory(option)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 16 }} />
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
          />

          <Text style={styles.label}>Receipt (optional)</Text>
          {receiptUri ? (
            <View style={styles.receiptWrapper}>
              <Image source={{ uri: receiptUri }} style={styles.receipt} />
              <Pressable style={styles.removeReceipt} onPress={() => setReceiptUri(null)}>
                <Ionicons name="close-circle" size={26} color={COLORS.danger} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.receiptActions}>
              <Pressable style={styles.receiptButton} onPress={() => void pickFrom('camera')}>
                <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                <Text style={styles.receiptButtonText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.receiptButton} onPress={() => void pickFrom('library')}>
                <Ionicons name="images-outline" size={22} color={COLORS.primary} />
                <Text style={styles.receiptButtonText}>Gallery</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 28 }} />
          <Button label="Save expense" onPress={() => void save()} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.text, textTransform: 'capitalize' },
  chipTextSelected: { color: COLORS.textInverse, fontWeight: '600' },
  receiptWrapper: { alignSelf: 'flex-start' },
  receipt: { width: 140, height: 140, borderRadius: 12 },
  removeReceipt: { position: 'absolute', top: -10, right: -10, backgroundColor: COLORS.surface, borderRadius: 13 },
  receiptActions: { flexDirection: 'row', gap: 12 },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface
  },
  receiptButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 }
});
