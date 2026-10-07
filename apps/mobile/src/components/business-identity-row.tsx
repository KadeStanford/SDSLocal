import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import type { IdentityPhoto } from '@/lib/business-identity';
import { BusinessLogo } from './business-logo';
import { ThemedText } from './themed-text';

export function BusinessIdentityRow({
  name,
  photos,
  uri,
  size = 30,
  textStyle,
  numberOfLines,
}: {
  readonly name: string;
  readonly numberOfLines?: number | undefined;
  readonly photos?: readonly IdentityPhoto[] | null | undefined;
  readonly uri?: string | null | undefined;
  readonly size?: number;
  readonly textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.row}>
      <BusinessLogo name={name} photos={photos} uri={uri} size={size} decorative />
      <ThemedText
        numberOfLines={numberOfLines}
        type="small"
        themeColor="textSecondary"
        style={[styles.name, textStyle]}
      >
        {name}
      </ThemedText>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, minWidth: 0 },
});
