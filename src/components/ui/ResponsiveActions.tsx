import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';

interface ResponsiveActionsProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel: string;
  onSecondaryPress: () => void;
  primaryVariant?: 'primary' | 'danger';
  secondaryVariant?: 'secondary' | 'ghost';
  primaryLoading?: boolean;
  disabled?: boolean;
}

/** Confirmation actions wrap when labels or available width need more room. */
export function ResponsiveActions({
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  primaryVariant = 'primary',
  secondaryVariant = 'secondary',
  primaryLoading = false,
  disabled = false
}: ResponsiveActionsProps) {
  const { spacing } = useTheme();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const [labelsWrap, setLabelsWrap] = useState(false);
  const stacked = windowWidth < 360 || availableWidth < 296 || fontScale >= 1.35 || labelsWrap;
  const handleLines = (lineCount: number) => {
    if (lineCount > 1) setLabelsWrap(true);
  };
  const actionContainerStyle = stacked
    ? { alignSelf: 'stretch' as const, minWidth: 0 }
    : { flex: 1, minWidth: 0 };
  const actionStyle = stacked ? { minWidth: 0 } : { flex: 1, minWidth: 0 };

  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        setAvailableWidth((current) => (Math.abs(current - nextWidth) > 1 ? nextWidth : current));
      }}
      style={{
        flexDirection: stacked ? 'column' : 'row',
        gap: 12,
        paddingBottom: spacing.sm,
        minWidth: 0
      }}
    >
      <Button
        label={primaryLabel}
        variant={primaryVariant}
        onPress={onPrimaryPress}
        loading={primaryLoading}
        disabled={disabled}
        fullWidth={false}
        onLabelLinesChange={handleLines}
        containerStyle={actionContainerStyle}
        style={actionStyle}
      />
      <Button
        label={secondaryLabel}
        variant={secondaryVariant}
        onPress={onSecondaryPress}
        disabled={disabled}
        fullWidth={false}
        onLabelLinesChange={handleLines}
        containerStyle={actionContainerStyle}
        style={actionStyle}
      />
    </View>
  );
}
