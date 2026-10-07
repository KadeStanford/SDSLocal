import { Image } from 'expo-image';
import { View } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { AppButton } from './app-button';

/** Public offerings use the same inset gallery proportions as the pickup menu. */
export function BusinessOfferingCard({
  name,
  description,
  price,
  image,
  featured,
  onOptions,
}: {
  name: string;
  description: string;
  price: string | null;
  image: string | null;
  featured: boolean;
  onOptions?: () => void;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.divider,
        backgroundColor: c.backgroundElement,
        boxShadow: '0 6px 20px rgba(10, 34, 21, 0.08)',
      }}
    >
      {!!image && (
        <Image
          source={{ uri: image }}
          contentFit="cover"
          accessibilityLabel={`${name} photo`}
          style={{ width: '100%', height: 165, borderRadius: 12 }}
        />
      )}
      <View style={{ paddingHorizontal: 6, paddingTop: image ? 16 : 6, gap: 8 }}>
        {featured && (
          <ThemedText type="caption" themeColor="accent">
            HOUSE FAVORITE
          </ThemedText>
        )}
        <ThemedText type="card" style={{ fontSize: 18, lineHeight: 24, letterSpacing: -0.25 }}>
          {name}
        </ThemedText>
        {!!description && (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          paddingHorizontal: 6,
          paddingTop: 20,
          paddingBottom: 6,
        }}
      >
        <ThemedText
          type="smallBold"
          style={{ flex: 1, fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] }}
        >
          {price}
        </ThemedText>
        {onOptions && (
          <AppButton
            label="More"
            accessibilityLabel={`More options for ${name}`}
            variant="secondary"
            icon={
              <SymbolView
                name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                tintColor={c.accent}
                style={{ width: 18, height: 18 }}
              />
            }
            onPress={onOptions}
            style={{ minHeight: 44, paddingHorizontal: 14 }}
          />
        )}
      </View>
    </View>
  );
}
