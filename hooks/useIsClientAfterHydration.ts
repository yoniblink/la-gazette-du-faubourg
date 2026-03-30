import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * `false` pendant SSR + premier rendus alignés à l’hydratation, puis `true` uniquement côté client.
 * Évite les divergences serveur/client sans `useEffect` + setState.
 */
export function useIsClientAfterHydration(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
