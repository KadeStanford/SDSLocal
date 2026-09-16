import { createContext, type PropsWithChildren, useContext } from 'react';

interface NotificationContextValue {
  readonly status: 'unsupported';
  readonly errorMessage: null;
  readonly enable: () => Promise<boolean>;
  readonly deactivate: () => Promise<void>;
}

const value: NotificationContextValue = {
  status: 'unsupported',
  errorMessage: null,
  enable: async () => false,
  deactivate: async () => undefined,
};
const NotificationContext = createContext(value);

export function NotificationProvider({ children }: PropsWithChildren) {
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export const notificationDeviceDescription = 'the installed mobile app';
