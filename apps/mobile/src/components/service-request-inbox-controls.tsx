import { View, Pressable } from 'react-native';
import { ThemedText } from './themed-text';
import { MenuSetupTabs } from './menu-workspace-ui';
import { MerchantSearch } from './merchant-ui';
export function ServiceRequestInboxControls<T extends string>({
  isOwner,
  onCustomize,
  filter,
  setFilter,
  filters,
  search,
  setSearch,
}: {
  isOwner: boolean;
  onCustomize: () => void;
  filter: T;
  setFilter: (v: T) => void;
  filters: readonly { value: T; label: string; count: number }[];
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
          Your customer request inbox
        </ThemedText>
        {isOwner && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Customize request form"
            onPress={onCustomize}
            style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}
          >
            <ThemedText type="smallBold" themeColor="accent">
              Intake form
            </ThemedText>
          </Pressable>
        )}
      </View>
      <MenuSetupTabs
        underline
        value={filter}
        options={filters.map((f) => ({ value: f.value, label: f.label + ' · ' + f.count }))}
        onChange={setFilter}
      />
      <MerchantSearch
        value={search}
        onChange={setSearch}
        placeholder="Search customers or requests"
      />
    </View>
  );
}
