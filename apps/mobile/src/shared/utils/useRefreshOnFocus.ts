import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * A hook that triggers a refetch function whenever the screen comes into focus.
 * Useful for ensuring data is updated when navigating back to a screen.
 */
export function useRefreshOnFocus<T>(refetch: () => Promise<T> | void) {
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );
}
