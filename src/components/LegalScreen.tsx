import React from 'react';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import type { LegalSection } from '@/content/legal';
import { useTheme } from '@/theme';

interface LegalScreenProps {
  title: string;
  updated: string;
  sections: LegalSection[];
}

export function LegalScreen({ title, updated, sections }: LegalScreenProps) {
  const { colors, spacing, layout, radius } = useTheme();
  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xxxl
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="display" color={colors.text}>
          {title}
        </Text>
        <Text variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}>
          Last updated: {updated}
        </Text>
        {sections.map((section) => (
          <View key={section.heading} style={{ marginBottom: spacing.xl }}>
            <Text variant="subtitle" color={colors.text} style={{ marginBottom: spacing.sm }}>
              {section.heading}
            </Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text
                key={`p-${index}`}
                variant="body"
                color={colors.textSecondary}
                style={{ marginBottom: spacing.sm }}
              >
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map((bullet, index) => (
              <View
                key={`b-${index}`}
                style={{
                  flexDirection: 'row',
                  marginBottom: spacing.sm,
                  gap: spacing.sm
                }}
              >
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: colors.primary,
                    marginTop: 8
                  }}
                />
                <Text variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                  {bullet}
                </Text>
              </View>
            ))}
          </View>
        ))}
        <View
          style={{
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: spacing.lg
          }}
        >
          <Text variant="caption" color={colors.textMuted} align="center">
            Questions? Contact the Expense Counter team from the privacy page in the app.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
