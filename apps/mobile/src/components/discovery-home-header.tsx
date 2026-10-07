import { PageHeader } from '@/components/page-header';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function DiscoveryHomeHeader({
  area,
  onChooseArea,
  actions,
  children,
}: {
  readonly children?: ReactNode;
  readonly actions?: ReactNode;
  readonly area: string;
  readonly onChooseArea: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <PageHeader />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <SymbolView
            name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
            tintColor={c.accent}
            style={{ width: 20, height: 20 }}
          />
          <ThemedText style={{ flexShrink: 1, fontSize: 19, lineHeight: 25, fontWeight: '600' }}>
            {area}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Explore area: ${area}. Choose an area`}
          onPress={onChooseArea}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.divider,
            backgroundColor: c.backgroundElement,
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ThemedText style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>
            Change area
          </ThemedText>
        </Pressable>
      </View>
      {children}
    </View>
  );
}
