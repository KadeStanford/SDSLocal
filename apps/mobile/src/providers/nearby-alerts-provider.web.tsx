import { createContext, type PropsWithChildren, useContext } from 'react';

import { defaultNearbyAlertRadiusMiles } from '@/lib/nearby-alerts-core';

const value = {
  status: 'unsupported' as const,
  accountEnabled: false,
  radiusMiles: defaultNearbyAlertRadiusMiles,
  businesses: [],
  loading: false,
  busy: false,
  errorMessage: null,
  isStaging: false,
  enable: async () => undefined,
  disable: async () => undefined,
  setRadius: async () => undefined,
  setBusinessEnabled: async () => undefined,
  refresh: async () => undefined,
  openSettings: async () => undefined,
  sendTest: async () => undefined,
  clearForAccount: async () => undefined,
};
const NearbyAlertsContext = createContext(value);

export function NearbyAlertsProvider({ children }: PropsWithChildren) {
  return <NearbyAlertsContext.Provider value={value}>{children}</NearbyAlertsContext.Provider>;
}

export function useNearbyAlerts() {
  return useContext(NearbyAlertsContext);
}
