import { View, Pressable } from 'react-native';
import { ThemedText } from './themed-text';
import { MenuSetupTabs } from './menu-workspace-ui';
import { MerchantSearch } from './merchant-ui';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from './app-icon';
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
  const c = useTheme();
  return (
    <View
      style={{
        gap: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: c.divider,
        borderRadius: 20,
        backgroundColor: c.backgroundElement,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText style={{ fontSize: 20, lineHeight: 26, fontWeight: '700' }}>
            Customer inquiries
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Quotes, questions and new projects
          </ThemedText>
        </View>
        {isOwner && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Customize request form"
            onPress={onCustomize}
            style={{
              minHeight: 48,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: c.accent,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <AppIcon name="file-text" size={18} tintColor="#FFFFFF" />
            <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
              Intake form
            </ThemedText>
          </Pressable>
        )}
      </View>
      <MerchantSearch
        value={search}
        onChange={setSearch}
        placeholder="Search customers or requests"
      />
      <MenuSetupTabs
        value={filter}
        options={filters.map((f) => ({ value: f.value, label: f.label + ' · ' + f.count }))}
        onChange={setFilter}
      />
    </View>
  );
}
