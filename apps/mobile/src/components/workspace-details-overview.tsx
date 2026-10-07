import { View } from 'react-native';
import { MerchantButton } from './merchant-ui';
import { ThemedText } from './themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';

export function WorkspaceDetailsOverview({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: readonly { label: string; value: string }[];
  onEdit?: () => void;
}) {
  const c = useMerchantTheme();
  return (
    <View style={{ gap: 16 }}>
      <ThemedText type="small" themeColor="textSecondary">
        Current saved details
      </ThemedText>
      <View
        style={{
          borderWidth: 0,
          borderColor: c.border,
          backgroundColor: c.surface,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={{ padding: 16, gap: 4, borderTopWidth: index ? 1 : 0, borderTopColor: c.border }}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {row.label}
            </ThemedText>
            {row.label === 'Brand colors' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {row.value.split(' · ').map((color, i) => (
                  <View
                    key={i}
                    accessibilityLabel={i === 0 ? 'Primary brand color' : 'Accent brand color'}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: color,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  />
                ))}
              </View>
            ) : (
              <ThemedText type="smallBold">
                {row.label === 'Business type'
                  ? row.value.charAt(0).toUpperCase() + row.value.slice(1)
                  : row.value || 'Not added'}
              </ThemedText>
            )}
          </View>
        ))}
      </View>
      {onEdit && <MerchantButton label={`Edit ${title.toLocaleLowerCase()}`} onPress={onEdit} />}
    </View>
  );
}
