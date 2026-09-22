import { StyleSheet, View } from 'react-native';
import { brandColor, readableTextColor } from '@/lib/color-contrast';
import type { IdentityPhoto } from '@/lib/business-identity';
import { BusinessLogo } from './business-logo';
import { ThemedText } from './themed-text';

/** A merchant-owned color field, with foreground contrast independent of app theme. */
export function BusinessBrandHeader({
  name,
  title,
  color,
  photos,
  logoUri,
  trailing = false,
}: {
  readonly name: string;
  readonly title?: string;
  readonly color: string;
  readonly photos?: readonly IdentityPhoto[] | null | undefined;
  readonly logoUri?: string | null | undefined;
  readonly trailing?: boolean;
}) {
  const background = brandColor(color);
  const foreground = readableTextColor(background);
  return (
    <View style={[styles.header, { backgroundColor: background }]}>
      <BusinessLogo name={name} photos={photos} uri={logoUri} size={56} decorative />
      <View style={styles.copy}>
        <ThemedText type={title ? 'smallBold' : 'card'} style={{ color: foreground }}>
          {name}
        </ThemedText>
        {title && (
          <ThemedText type="subtitle" style={{ color: foreground }}>
            {title}
          </ThemedText>
        )}
      </View>
      {trailing && (
        <ThemedText accessible={false} type="subtitle" style={{ color: foreground }}>
          ›
        </ThemedText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, minHeight: 112 },
  copy: { flex: 1, gap: 4 },
});
