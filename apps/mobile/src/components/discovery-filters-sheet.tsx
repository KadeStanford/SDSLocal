import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import type { DiscoveryFeature } from '@/lib/discovery-core';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';

export type DiscoveryFilters = {
  category: string;
  city: string;
  audience: 'all' | 'following';
  feature: DiscoveryFeature;
  sort: 'name' | 'recent' | 'nearby';
};
export const defaultDiscoveryFilters: DiscoveryFilters = {
  category: 'all',
  city: 'all',
  audience: 'all',
  feature: 'all',
  sort: 'name',
};
type Props = {
  initial: DiscoveryFilters;
  categories: readonly { label: string; value: string }[];
  cities: readonly string[];
  followingCount?: number;
  pickupEnabled: boolean;
  countResults: (draft: DiscoveryFilters) => number;
  onApply: (draft: DiscoveryFilters) => Promise<boolean>;
  onClose: () => void;
  error?: string | null;
  searchActive?: boolean;
};

export function DiscoveryFiltersSheet(props: Props) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" visible onRequestClose={props.onClose}>
      <View style={[s.overlay, { paddingTop: Math.max(insets.top, 24) }]}>
        <Pressable
          accessibilityLabel="Close filters"
          accessibilityRole="button"
          onPress={props.onClose}
          style={s.backdrop}
        />
        <View
          style={[
            s.sheet,
            { backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <DiscoveryFiltersContent {...props} />
        </View>
      </View>
    </Modal>
  );
}

// Separate content also lets the review harness render the actual mobile controls.
export function DiscoveryFiltersContent(props: Props) {
  const c = useTheme();
  const [draft, setDraft] = useState(props.initial);
  const [page, setPage] = useState<'filters' | 'category' | 'city'>('filters');
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState(false);
  const patch = (next: Partial<DiscoveryFilters>) => setDraft((old) => ({ ...old, ...next }));
  const options =
    page === 'category'
      ? props.categories
      : [
          { label: 'All areas', value: 'all' },
          ...props.cities.map((city) => ({ label: city, value: city })),
        ];
  const features: { value: DiscoveryFeature; label: string }[] = [
    { value: 'all', label: 'Everything' },
    { value: 'open-now', label: 'Open now' },
    ...(props.pickupEnabled
      ? [
          { value: 'pickup' as const, label: 'Order ahead' },
          { value: 'accepting-pickup' as const, label: 'Accepting pickup' },
        ]
      : []),
    { value: 'rewards', label: 'Rewards' },
    { value: 'events', label: 'Upcoming events' },
  ];
  const open = (next: 'category' | 'city') => {
    setSearch('');
    setPage(next);
  };
  const results = props.countResults(draft);
  return (
    <>
      <View style={[s.header, { borderColor: c.divider }]}>
        {page !== 'filters' && (
          <AppButton
            label="Back to filters"
            iconOnly
            variant="secondary"
            onPress={() => setPage('filters')}
            icon={<SymbolView name="chevron.left" tintColor={c.text} style={s.icon} />}
          />
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <ThemedText style={s.title}>
            {page === 'filters' ? 'Refine your search' : page === 'category' ? 'Category' : 'Area'}
          </ThemedText>
          {page === 'filters' && (
            <ThemedText type="small" themeColor="textSecondary">
              Find the places that fit your day.
            </ThemedText>
          )}
        </View>
        <AppButton
          label="Close filters"
          iconOnly
          variant="secondary"
          onPress={props.onClose}
          disabled={applying}
          icon={<SymbolView name="xmark" tintColor={c.text} style={s.icon} />}
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        style={{ flexShrink: 1 }}
      >
        {page === 'filters' ? (
          <>
            <View
              style={[s.group, { backgroundColor: c.backgroundElement, borderColor: c.divider }]}
            >
              {(
                [
                  {
                    key: 'category',
                    title: 'Category',
                    value:
                      props.categories.find((x) => x.value === draft.category)?.label ??
                      'All categories',
                    icon: 'square.grid.2x2',
                  },
                  {
                    key: 'city',
                    title: 'Area',
                    value: draft.city === 'all' ? 'All areas' : draft.city,
                    icon: 'mappin.and.ellipse',
                  },
                ] as const
              ).map((row, i) => (
                <Pressable
                  key={row.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.title}: ${row.value}`}
                  onPress={() => open(row.key)}
                  style={[s.selector, i === 0 && { borderBottomWidth: 1, borderColor: c.divider }]}
                >
                  <View style={[s.iconTile, { backgroundColor: c.backgroundSelected }]}>
                    <SymbolView name={row.icon} tintColor={c.accent} style={s.icon} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {row.title}
                    </ThemedText>
                    <ThemedText type="smallBold">{row.value}</ThemedText>
                  </View>
                  <SymbolView
                    name="chevron.right"
                    tintColor={c.textSecondary}
                    style={{ width: 14, height: 14 }}
                  />
                </Pressable>
              ))}
            </View>
            <View style={s.section}>
              <ThemedText type="smallBold">What are you looking for?</ThemedText>
              <View accessibilityRole="radiogroup" style={s.grid}>
                {features.map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: draft.feature === option.value }}
                    onPress={() => patch({ feature: option.value })}
                    style={[
                      s.choice,
                      {
                        backgroundColor:
                          draft.feature === option.value
                            ? c.backgroundSelected
                            : c.backgroundElement,
                        borderColor: draft.feature === option.value ? c.accent : c.divider,
                      },
                    ]}
                  >
                    <Radio selected={draft.feature === option.value} />
                    <ThemedText type="smallBold" style={{ flex: 1 }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={s.section}>
              <ThemedText type="smallBold">Sort results</ThemedText>
              <View
                accessibilityRole="radiogroup"
                style={[s.group, { backgroundColor: c.backgroundElement, borderColor: c.divider }]}
              >
                {(
                  [
                    { value: 'name', label: props.searchActive ? 'Best match' : 'Name · A–Z' },
                    { value: 'nearby', label: 'Nearest to me' },
                    { value: 'recent', label: 'Recently added' },
                  ] as const
                ).map((option, i) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: draft.sort === option.value }}
                    onPress={() => patch({ sort: option.value })}
                    style={[s.sortRow, i < 2 && { borderBottomWidth: 1, borderColor: c.divider }]}
                  >
                    <ThemedText type="smallBold" style={{ flex: 1 }}>
                      {option.label}
                    </ThemedText>
                    <Radio selected={draft.sort === option.value} />
                  </Pressable>
                ))}
              </View>
            </View>
            {props.followingCount !== undefined && (
              <View
                style={[
                  s.following,
                  { backgroundColor: c.backgroundElement, borderColor: c.divider },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText type="smallBold">Only places I follow</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {props.followingCount} businesses in your collection
                  </ThemedText>
                </View>
                <Switch
                  accessibilityLabel="Only places I follow"
                  value={draft.audience === 'following'}
                  onValueChange={(on) => patch({ audience: on ? 'following' : 'all' })}
                  trackColor={{ false: c.divider, true: c.accent }}
                />
              </View>
            )}
            {props.error && (
              <ThemedText accessibilityRole="alert" type="small">
                {props.error}
              </ThemedText>
            )}
          </>
        ) : (
          <>
            <View
              style={[s.search, { backgroundColor: c.backgroundElement, borderColor: c.divider }]}
            >
              <SymbolView name="magnifyingglass" tintColor={c.textSecondary} style={s.icon} />
              <TextInput
                accessibilityLabel={page === 'category' ? 'Search categories' : 'Search areas'}
                placeholder={page === 'category' ? 'Search categories' : 'Search areas'}
                placeholderTextColor={c.textSecondary}
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, minHeight: 48, color: c.text, fontSize: 16 }}
              />
            </View>
            <View
              accessibilityRole="radiogroup"
              style={[s.group, { backgroundColor: c.backgroundElement, borderColor: c.divider }]}
            >
              {options
                .filter((x) => x.label.toLowerCase().includes(search.trim().toLowerCase()))
                .map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: draft[page] === option.value }}
                    accessibilityLabel={option.label}
                    onPress={() => {
                      patch({ [page]: option.value });
                      setPage('filters');
                    }}
                    style={[
                      s.sortRow,
                      { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.divider },
                    ]}
                  >
                    <ThemedText style={{ flex: 1 }} type="smallBold">
                      {option.label}
                    </ThemedText>
                    <Radio selected={draft[page] === option.value} />
                  </Pressable>
                ))}
              {!options.some((x) =>
                x.label.toLowerCase().includes(search.trim().toLowerCase()),
              ) && (
                <ThemedText style={{ padding: 20 }} type="small">
                  No matches. Try another search.
                </ThemedText>
              )}
            </View>
          </>
        )}
      </ScrollView>
      {page === 'filters' && (
        <View style={[s.footer, { borderColor: c.divider }]}>
          <AppButton
            label="Reset"
            variant="secondary"
            disabled={applying}
            onPress={() => setDraft({ ...defaultDiscoveryFilters })}
            style={{ minWidth: 84 }}
          />
          <AppButton
            label={`Show ${results} ${results === 1 ? 'place' : 'places'}`}
            loading={applying}
            onPress={() => {
              setApplying(true);
              void props.onApply(draft).finally(() => setApplying(false));
            }}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </>
  );
}

function Radio({ selected }: { selected: boolean }) {
  const c = useTheme();
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: selected ? 6 : 1.5,
        borderColor: selected ? c.accent : c.textSecondary,
        flexShrink: 0,
      }}
    />
  );
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  icon: { width: 20, height: 20 },
  content: { padding: 20, gap: 24 },
  group: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  selector: { padding: 16, minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 54,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortRow: { padding: 16, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  following: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  footer: { padding: 20, paddingBottom: 4, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
});
