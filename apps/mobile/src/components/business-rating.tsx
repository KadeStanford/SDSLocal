import { View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import {
  businessRatingAccessibilityLabel,
  type BusinessReviewSummary,
} from '@/lib/business-review-summary';
import { ThemedText } from './themed-text';
import { AppIcon } from './app-icon';

export function BusinessRating({
  summary,
  compact = false,
  compactSize = 12,
}: {
  summary: BusinessReviewSummary;
  compact?: boolean;
  compactSize?: number;
}) {
  const c = useTheme();
  const label = businessRatingAccessibilityLabel(summary);
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}
    >
      <AppIcon name="star" size={compact ? compactSize + 2 : 16} tintColor={summary.reviewCount > 0 ? c.accent : c.textMuted} fill />
      <ThemedText
        accessible={false}
        type="smallBold"
        style={
          compact
            ? { fontSize: compactSize, lineHeight: compactSize === 12 ? 16 : compactSize + 5 }
            : undefined
        }
      >
        {summary.reviewCount > 0 ? summary.averageRating.toFixed(1) : 'No reviews yet'}
      </ThemedText>
      {summary.reviewCount > 0 && (
        <ThemedText
          accessible={false}
          type="small"
          themeColor="textSecondary"
          style={
            compact
              ? { fontSize: compactSize, lineHeight: compactSize === 12 ? 16 : compactSize + 5 }
              : undefined
          }
        >
          {compact
            ? `(${summary.reviewCount})`
            : `· ${summary.reviewCount} ${summary.reviewCount === 1 ? 'review' : 'reviews'}`}
        </ThemedText>
      )}
    </View>
  );
}
