import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useConversations } from '@/hooks/useConversations';

import { hapticSelect } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { active: 'wallet', inactive: 'wallet-outline', label: 'Home' },
  groups: { active: 'people', inactive: 'people-outline', label: 'Groups' },
  chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline', label: 'Chat' },
  settings: { active: 'settings', inactive: 'settings-outline', label: 'Settings' }
};

function TabItem({
  focused,
  icon,
  label,
  onPress,
  badge,
  itemHeight
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge: number;
  itemHeight: number;
}) {
  const { colors, radius, spacing } = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [focused, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.7 + progress.value * 0.3 }]
  }));

  return (
    <PressableScale
      onPress={() => {
        hapticSelect();
        onPress();
      }}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      style={{ flex: 1, minHeight: itemHeight, gap: 2, minWidth: 0 }}
      containerStyle={{ flex: 1, minWidth: 0 }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: spacing.xs,
            right: spacing.xs,
            borderRadius: radius.pill,
            backgroundColor: colors.primarySoft,
            borderWidth: 1,
            borderColor: `${colors.primary}22`
          },
          indicatorStyle
        ]}
      />
      <View style={{ width: '100%', maxWidth: 48, minHeight: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={21} color={focused ? colors.primary : colors.textMuted} />
        {badge > 0 ? <View style={{ position: 'absolute', right: 2, top: -1, minWidth: 16, minHeight: Math.max(16, Math.round(itemHeight * 0.32)), borderRadius: 999, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}><Text variant="caption" color={colors.onPrimary} style={{ fontSize: 9, lineHeight: 12, textAlign: 'center' }} numberOfLines={1}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      </View>
      <Text
        variant="caption"
        weight={focused ? 'bold' : 'medium'}
        style={{
          fontSize: 10,
          lineHeight: 13,
          color: focused ? colors.primary : colors.textMuted,
          flexShrink: 1,
          minWidth: 0,
          textAlign: 'center'
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, radius, layout, shadows } = useTheme();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { pendingRequestCount } = useConversations();
  const barHeight = Math.max(layout.tabBarHeight, Math.ceil(layout.tabBarHeight * Math.min(fontScale, 1.5)));
  const itemHeight = Math.max(54, barHeight - 10);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: layout.screenPadding,
        right: layout.screenPadding,
        bottom: Math.max(insets.bottom, layout.tabBarBottomGap) + layout.tabBarBottomGap,
        height: barHeight,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.tabBarBorder,
        backgroundColor: colors.tabBar,
        ...shadows.floating
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const meta = ICONS[route.name] ?? {
          active: 'ellipse' as const,
          inactive: 'ellipse-outline' as const,
          label: options.title ?? route.name
        };

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true
          });
          if (!focused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        return (
          <TabItem
            key={route.key}
            focused={focused}
            icon={focused ? meta.active : meta.inactive}
            label={meta.label}
            onPress={onPress}
            badge={route.name === 'chat' ? pendingRequestCount : 0}
            itemHeight={itemHeight}
          />
        );
      })}
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} pointerEvents="none" />
    </View>
  );
}
