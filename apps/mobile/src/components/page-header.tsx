import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from './app-icon';
import { CustomerBrand } from './customer-brand';
import { AlertsButton } from './alerts-button';
import { useTheme } from '@/hooks/use-theme';
import { headerLayout } from '@sds/design-tokens';

/** Callers retain step navigation, draft guards and explicit destinations. */
export function HeaderBack({
  onPress,
  label = 'Back',
  disabled = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: c.backgroundSelected, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
      ]}
    >
      <AppIcon name="chevron-left" size={20} tintColor={c.accent} />
    </Pressable>
  );
}

/** The utility row only. Titles, merchant context and screen actions stay below it. */
type BackEntry = { id: string; onBack: () => void; label: string; disabled: boolean };
const NavigationContext = createContext<{
  entries: BackEntry[];
  register: (entry: BackEntry) => () => void;
} | null>(null);

/** Local to one page, so a mounted background route cannot change another route's Back. */
export function PageHeaderScope({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<BackEntry[]>([]);
  const register = useCallback((entry: BackEntry) => {
    setEntries((current) => [...current.filter((item) => item.id !== entry.id), entry]);
    return () => setEntries((current) => current.filter((item) => item.id !== entry.id));
  }, []);
  return (
    <NavigationContext.Provider value={{ entries, register }}>
      {children}
    </NavigationContext.Provider>
  );
}

/** Nested editors supply their existing guarded callback to the page's single Back control. */
export function NestedHeaderBack({
  onPress,
  label = 'Back',
  disabled = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const context = useContext(NavigationContext),
    id = useId(),
    callback = useRef(onPress);
  callback.current = onPress;
  const register = context?.register;
  useEffect(
    () => register?.({ id, onBack: () => callback.current(), label, disabled }),
    [register, id, label, disabled],
  );
  return context ? null : <PageHeader onBack={onPress} backLabel={label} backDisabled={disabled} />;
}

export function PageHeader({
  onBack,
  backLabel = 'Back',
  backDisabled = false,
  alerts = 'default',
}: {
  onBack?: (() => void) | undefined;
  backLabel?: string;
  backDisabled?: boolean;
  alerts?: 'default' | 'current';
}) {
  const c = useTheme(),
    context = useContext(NavigationContext);
  const nested = alerts === 'current' ? undefined : context?.entries.at(-1);
  const activeBack = nested?.onBack ?? onBack,
    activeLabel = nested?.label ?? backLabel,
    blocked = nested?.disabled ?? backDisabled;
  return (
    <View testID="parish-page-header" style={styles.row}>
      {activeBack && <HeaderBack onPress={activeBack} label={activeLabel} disabled={blocked} />}
      <View style={styles.brand}>
        <CustomerBrand compact />
      </View>
      {alerts === 'current' ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Alerts inbox"
          style={[
            styles.control,
            { backgroundColor: c.backgroundElement, borderColor: c.divider, borderWidth: 1 },
          ]}
        >
          <AppIcon name="bell" size={22} />
        </View>
      ) : (
        <AlertsButton />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    minHeight: headerLayout.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: headerLayout.gap,
  },
  brand: { flex: 1, minWidth: 0 },
  control: {
    width: headerLayout.controlSize,
    minHeight: headerLayout.controlSize,
    flexShrink: 0,
    borderRadius: headerLayout.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
