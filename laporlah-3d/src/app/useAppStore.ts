import { useSyncExternalStore } from 'react';
import type { AppState, Store } from './store';

export function useAppState(store: Store): AppState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

const PHONE_QUERY = '(max-width: 760px)';

export function useIsPhone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(PHONE_QUERY);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}
