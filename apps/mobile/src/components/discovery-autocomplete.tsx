import { Pressable, ScrollView, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { DiscoverySuggestion } from '@/lib/discovery-autocomplete';
import { BusinessLogo } from './business-logo';

export function DiscoveryAutocomplete({
  suggestions,
  loading,
  onSelect,
  onSeeResults,
}: {
  readonly suggestions: readonly DiscoverySuggestion[];
  readonly loading: boolean;
  readonly onSelect: (suggestion: DiscoverySuggestion) => void;
  readonly onSeeResults: () => void;
}) {
  const c = useTheme();
  const label = { business: 'Business', item: 'Menu / item', service: 'Service', event: 'Event' };
  const groupLabels = {
    business: 'Businesses',
    item: 'Items',
    service: 'Services',
    event: 'Events',
  };
  // Keep the strongest result's section first while separating result types.
  const kinds = [...new Set(suggestions.map((s) => s.kind))];
  return (
    <View
      accessibilityLabel="Search suggestions"
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.divider,
        backgroundColor: c.backgroundElement,
        overflow: 'hidden',
      }}
    >
      <ScrollView
        testID="discovery-suggestion-scroll"
        style={{ maxHeight: 280, flexGrow: 0 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {kinds.map((kind, groupIndex) => (
          <View key={kind} style={{ borderTopWidth: groupIndex ? 1 : 0, borderColor: c.divider }}>
            <ThemedText
              accessibilityRole="header"
              style={{
                paddingHorizontal: 13,
                paddingTop: 12,
                paddingBottom: 4,
                fontSize: 11,
                lineHeight: 16,
                fontWeight: '600',
                color: c.textSecondary,
              }}
            >
              {groupLabels[kind]}
            </ThemedText>
            {suggestions
              .filter((s) => s.kind === kind)
              .map((s) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.title}. ${label[s.kind]}. ${s.subtitle}`}
                  onPress={() => onSelect(s)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 13,
                    paddingVertical: 12,
                    minHeight: 62,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                    backgroundColor: pressed ? c.backgroundSelected : c.backgroundElement,
                  })}
                >
                  <BusinessLogo
                    name={s.businessName ?? s.title}
                    photos={s.businessPhotos}
                    size={36}
                    decorative
                  />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {s.title}
                    </ThemedText>
                    <ThemedText
                      style={{ fontSize: 11, lineHeight: 15, color: c.textSecondary }}
                      numberOfLines={1}
                    >
                      {s.subtitle}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name="chevron.right"
                    tintColor={c.textSecondary}
                    style={{ width: 12, height: 12 }}
                  />
                </Pressable>
              ))}
          </View>
        ))}
        {loading && (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            accessibilityLiveRegion="polite"
            style={{ padding: 13 }}
          >
            Checking menus and services…
          </ThemedText>
        )}
        {!loading && !suggestions.length && (
          <ThemedText type="small" themeColor="textSecondary" style={{ padding: 15 }}>
            No close matches yet. Try a business, item, service or event.
          </ThemedText>
        )}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        onPress={onSeeResults}
        style={{
          minHeight: 46,
          padding: 13,
          borderTopWidth: 1,
          borderColor: c.divider,
          alignItems: 'center',
        }}
      >
        <ThemedText type="smallBold" style={{ color: c.accent }}>
          See all results
        </ThemedText>
      </Pressable>
    </View>
  );
}
