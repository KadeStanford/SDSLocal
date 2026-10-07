import { View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import {
  businessRatingAccessibilityLabel,
  type BusinessReviewSummary,
} from '@/lib/business-review-summary';
import { ThemedText } from './themed-text';

export function BusinessRating({
  summary,
  compact = false,
}: {
  summary: BusinessReviewSummary;
  compact?: boolean;
}) {
  const c = useTheme();
  const label = businessRatingAccessibilityLabel(summary);
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}
    >
      <ThemedText
        accessible={false}
        type="smallBold"
        style={{
          color: summary.reviewCount > 0 ? c.accent : c.textMuted,
          ...(compact ? { fontSize: 12, lineHeight: 16 } : {}),
        }}
      >
        ★
      </ThemedText>
      <ThemedText
        accessible={false}
        type="smallBold"
        style={compact ? { fontSize: 12, lineHeight: 16 } : undefined}
      >
        {summary.reviewCount > 0 ? summary.averageRating.toFixed(1) : 'No reviews yet'}
      </ThemedText>
      {summary.reviewCount > 0 && (
        <ThemedText
          accessible={false}
          type="small"
          themeColor="textSecondary"
          style={compact ? { fontSize: 12, lineHeight: 16 } : undefined}
        >
          {compact
            ? `(${summary.reviewCount})`
            : `· ${summary.reviewCount} ${summary.reviewCount === 1 ? 'review' : 'reviews'}`}
        </ThemedText>
      )}
    </View>
  );
}
