import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion as useReducedMotionSetting } from 'react-native-reanimated';

/**
 * Tracks the platform "reduce motion" setting, including changes made while the
 * app is running. Reanimated exposes the value it captured at startup; the
 * AccessibilityInfo listener keeps the rest of the UI in sync.
 */
export function useReducedMotion(): boolean {
  const initial = useReducedMotionSetting();
  const [reduced, setReduced] = useState(initial);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduced(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
