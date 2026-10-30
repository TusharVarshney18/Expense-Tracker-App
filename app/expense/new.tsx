import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { subDays } from 'date-fns';

import {
  BottomSheet,
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  PressableScale,
  Screen,
  Text
} from '@/components/ui';
import { useExpenses } from '@/hooks/useExpenses';
import { categoryColor, categoryMeta } from '@/lib/categories';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { hapticError, hapticSuccess, hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

function localDateString(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = typeof error.message === 'string' ? error.message : null;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : null;
    return [code, message].filter(Boolean).join(': ') || 'Could not save expense. Try again.';
  }
  return 'Could not save expense. Try again.';
}

function Key({
  value,
  onPress
}: {
  value: (typeof KEYS)[number];
  onPress: (value: (typeof KEYS)[number]) => void;
}) {
  const { colors, radius } = useTheme();
  const isDelete = value === 'del';
  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityLabel={isDelete ? 'Delete digit' : value === '.' ? 'Decimal point' : `Digit ${value}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flex: 1,
          height: 56,
          borderRadius: radius.input,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
          borderWidth: 1,
          borderColor: colors.border
        }
      ]}
    >
      {isDelete ? (
        <Ionicons name="backspace-outline" size={23} color={colors.text} />
      ) : (
        <Text variant="title" color={colors.text} style={{ fontSize: 23 }}>
          {value}
        </Text>
      )}
    </Pressable>
  );
}

export default function NewExpenseScreen() {
  const router = useRouter();
  const { addExpense } = useExpenses({ loadOnMount: false });
  const { colors, spacing, radius, fonts, layout } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [spentAt, setSpentAt] = useState(localDateString());
  const [dateVisible, setDateVisible] = useState(false);
  const [dateInput, setDateInput] = useState(localDateString());
  const [dateError, setDateError] = useState<string | null>(null);
  const amountFontSize = Math.max(28, Math.min(56, (windowWidth - spacing.xl * 4) / Math.max(amount.length, 1)));

  const pressKey = useCallback(
    (value: (typeof KEYS)[number]) => {
      hapticTap();
      setSaveError(null);
      setAmount((current) => {
        if (value === 'del') return current.slice(0, -1);
        if (value === '.') {
          if (current.includes('.')) return current;
          return current.length === 0 ? '0.' : `${current}.`;
        }
        if (current.includes('.')) {
          const decimals = current.split('.')[1] ?? '';
          if (decimals.length >= 2) return current;
          return `${current}${value}`;
        }
        if (current.length >= 9) return current;
        if (current === '0') return value;
        return `${current}${value}`;
      });
    },
    []
  );

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
      hapticTap();
    }
  };

  const save = async () => {
    const numeric = Number.parseFloat(amount.trim());
    setSaveError(null);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setSaveError('Enter an amount greater than zero.');
      hapticError();
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        amount: numeric,
        category,
        note: note.trim() || null,
        receiptUri,
        spentAt
      });
      hapticSuccess();
      router.replace('/(tabs)');
    } catch (err) {
      hapticError();
      setSaveError(getSaveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const applyDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setDateError('Use YYYY-MM-DD.');
      return;
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      setDateError('That date is not valid.');
      return;
    }
    setSpentAt(value);
    setDateInput(value);
    setDateError(null);
    setDateVisible(false);
    hapticTap();
  };

  const today = new Date();
  const quickDates = [
    { label: 'Today', value: localDateString(today) },
    { label: 'Yesterday', value: localDateString(subDays(today, 1)) },
    { label: '2 days ago', value: localDateString(subDays(today, 2)) }
  ];

  return (
    <Screen padded={false} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm
          }}
        >
          <IconButton icon="chevron-down" label="Close" variant="ghost" onPress={() => router.back()} />
          <Text variant="subtitle" color={colors.text}>
            New expense
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xxl
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.lg }}>
            <Text variant="label" color={colors.textMuted}>
              Amount
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.sm }}>
              <Text
                style={{
                  fontFamily: fonts.money,
                  fontSize: 26,
                  lineHeight: 38,
                  color: amount ? colors.textSecondary : colors.textMuted,
                  marginTop: 9,
                  marginRight: 2
                }}
              >
                ₹
              </Text>
              <Text
                style={{
                  fontFamily: fonts.money,
                  fontSize: amountFontSize,
                  lineHeight: 62,
                  letterSpacing: -2,
                  fontVariant: ['tabular-nums'],
                  color: amount ? colors.text : colors.textMuted
                }}
              >
                {amount || '0'}
              </Text>
            </View>
            <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginTop: spacing.sm }} />
          </View>

          <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
            Category
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
            {EXPENSE_CATEGORIES.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={category === option}
                onPress={() => setCategory(option)}
                icon={categoryMeta(option).icon}
                color={categoryColor(colors, option)}
              />
            ))}
          </View>

          <Input
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
            icon="create-outline"
            maxLength={120}
            returnKeyType="done"
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
            <PressableScale
              onPress={() => {
                setDateInput(spentAt);
                setDateError(null);
                setDateVisible(true);
              }}
              accessibilityLabel="Choose expense date"
              style={{
                flex: 1,
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.input,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.input
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={colors.textMuted}>
                  Date
                </Text>
                <Text variant="bodyStrong" color={colors.text}>
                  {formatDate(`${spentAt}T00:00:00`)}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </PressableScale>
          </View>

          <Text variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
            Receipt (optional)
          </Text>
          {receiptUri ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
              <Image source={{ uri: receiptUri }} style={{ width: 86, height: 86, borderRadius: radius.sm }} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" color={colors.text}>
                  Receipt attached
                </Text>
                <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Stored privately with this expense.
                </Text>
              </View>
              <IconButton icon="trash-outline" label="Remove receipt" variant="danger" onPress={() => setReceiptUri(null)} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              <PressableScale
                onPress={() => void pickFrom('camera')}
                accessibilityLabel="Photograph a receipt"
                style={{
                  flex: 1,
                  minHeight: 56,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface
                }}
              >
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text variant="bodyStrong" color={colors.text}>
                  Camera
                </Text>
              </PressableScale>
              <PressableScale
                onPress={() => void pickFrom('library')}
                accessibilityLabel="Choose a receipt from gallery"
                style={{
                  flex: 1,
                  minHeight: 56,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface
                }}
              >
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text variant="bodyStrong" color={colors.text}>
                  Gallery
                </Text>
              </PressableScale>
            </View>
          )}

          <View
            style={{
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: spacing.sm,
              gap: spacing.sm
            }}
          >
            {[0, 1, 2, 3].map((row) => (
              <View key={row} style={{ flexDirection: 'row', gap: spacing.sm }}>
                {KEYS.slice(row * 3, row * 3 + 3).map((key) => (
                  <Key key={key} value={key} onPress={pressKey} />
                ))}
              </View>
            ))}
          </View>

          {saveError ? (
            <Card variant="danger" style={{ marginTop: spacing.md }}>
              <Text variant="caption" color={colors.danger}>
                {saveError}
              </Text>
            </Card>
          ) : null}

          <Button
            label={saving ? 'Saving…' : 'Save expense'}
            onPress={() => void save()}
            loading={saving}
            disabled={!amount}
            icon="checkmark"
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
          <View style={{ height: layout.tabBarBottomGap }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={dateVisible}
        onClose={() => setDateVisible(false)}
        title="Expense date"
        subtitle="When did this expense happen?"
        footer={
          <Button
            label="Use this date"
            onPress={() => applyDate(dateInput)}
            style={{ marginBottom: spacing.sm }}
          />
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {quickDates.map((option) => (
            <Chip
              key={option.label}
              label={option.label}
              selected={spentAt === option.value}
              onPress={() => {
                setSpentAt(option.value);
                setDateInput(option.value);
                setDateVisible(false);
              }}
            />
          ))}
        </View>
        <Input
          label="Or enter a date"
          value={dateInput}
          onChangeText={setDateInput}
          placeholder="YYYY-MM-DD"
          icon="calendar-outline"
          autoCapitalize="none"
          errorText={dateError}
        />
      </BottomSheet>
    </Screen>
  );
}
