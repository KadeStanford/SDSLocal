import { View } from 'react-native';
import { ChoicePicker } from './choice-picker';
import { MerchantButton, MerchantFilters, MerchantSheet } from './merchant-ui';
import { ThemedText } from './themed-text';

export function FollowingFiltersSheet({
  visible,
  onClose,
  feature,
  onFeature,
  category,
  categories,
  onCategory,
  city,
  cities,
  onCity,
  sort,
  onSort,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  feature: 'all' | 'rewards' | 'events';
  onFeature: (value: 'all' | 'rewards' | 'events') => void;
  category: string;
  categories: readonly string[];
  onCategory: (value: string) => void;
  city: string;
  cities: readonly string[];
  onCity: (value: string) => void;
  sort: 'name' | 'recent';
  onSort: (value: 'name' | 'recent') => void;
  onReset: () => void;
}) {
  return (
    <MerchantSheet
      visible={visible}
      title="Filter following"
      onClose={onClose}
      footer={<MerchantButton label="Show businesses" onPress={onClose} />}
    >
      <View style={{ gap: 12 }}>
        <ThemedText type="smallBold">Highlights</ThemedText>
        <MerchantFilters
          value={feature}
          onChange={onFeature}
          options={[
            { value: 'all', label: 'Everything' },
            { value: 'rewards', label: 'Rewards' },
            { value: 'events', label: 'Upcoming events' },
          ]}
        />
      </View>
      <ChoicePicker
        label="Category"
        value={category}
        onChange={onCategory}
        options={[
          { value: 'all', label: 'All categories' },
          ...categories.map((value) => ({ value, label: value })),
        ]}
      />
      <ChoicePicker
        label="Location"
        value={city}
        onChange={onCity}
        options={[
          { value: 'all', label: 'All cities' },
          ...cities.map((value) => ({ value, label: value })),
        ]}
      />
      <View style={{ gap: 12 }}>
        <ThemedText type="smallBold">Sort by</ThemedText>
        <MerchantFilters
          value={sort}
          onChange={onSort}
          options={[
            { value: 'name', label: 'A–Z' },
            { value: 'recent', label: 'Recently added' },
          ]}
        />
      </View>
      <MerchantButton label="Reset filters" secondary onPress={onReset} />
    </MerchantSheet>
  );
}
