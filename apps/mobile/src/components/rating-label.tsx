import { View } from 'react-native';
import { AppIcon } from './app-icon';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

/** A legible rating with the same star geometry used throughout the app. */
export function RatingLabel({ rating }: { rating: number }) {
  const c = useTheme();
  return <View accessibilityLabel={`${rating} out of 5 stars`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <AppIcon name="star" size={16} fill tintColor={c.accent} />
    <ThemedText type="smallBold">{rating} / 5</ThemedText>
  </View>;
}
