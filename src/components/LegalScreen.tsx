import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { COLORS } from '@/lib/constants';
import type { LegalSection } from '@/content/legal';

interface LegalScreenProps {
  title: string;
  updated: string;
  sections: LegalSection[];
}

export function LegalScreen({ title, updated, sections }: LegalScreenProps) {
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>Last updated: {updated}</Text>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={`p-${index}`} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map((bullet, index) => (
              <View key={`b-${index}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'\u2022'}</Text>
                <Text style={styles.bullet}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  updated: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, marginBottom: 20 },
  section: { marginBottom: 20 },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 6
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
    marginBottom: 8
  },
  bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 4 },
  bulletDot: { fontSize: 14, lineHeight: 21, color: COLORS.primary, marginRight: 8 },
  bullet: { flex: 1, fontSize: 14, lineHeight: 21, color: COLORS.text }
});
