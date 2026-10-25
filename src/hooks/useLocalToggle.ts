import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** A boolean setting stored on the device. */
export function useLocalToggle(key: string, defaultValue: boolean) {
  const [value, setValueState] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key).then((stored) => {
      if (!active) return;
      if (stored === 'true' || stored === 'false') setValueState(stored === 'true');
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [key]);

  const setValue = useCallback(
    (next: boolean) => {
      setValueState(next);
      void AsyncStorage.setItem(key, next ? 'true' : 'false');
    },
    [key]
  );

  return { value, setValue, loaded };
}
