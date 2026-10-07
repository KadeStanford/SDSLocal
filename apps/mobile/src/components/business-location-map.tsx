import { useMemo } from 'react';
import { groupMapStops, stopMapCamera } from '@/lib/business-stop-map';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureResponderEvent, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';

export interface BusinessLocationMapStop {
  readonly id: string;
  readonly title: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface BusinessLocationMapCoordinate {
  readonly latitude: number;
  readonly longitude: number;
}

interface BusinessLocationMapProps {
  readonly stops: readonly BusinessLocationMapStop[];
  readonly draftCoordinate?: BusinessLocationMapCoordinate;
  readonly draftTitle?: string;
  readonly height?: number;
  readonly onCoordinateSelect?: (coordinate: BusinessLocationMapCoordinate) => void;
  /** Temporarily suspends the screen edge-back gesture while the map is being touched. */
  readonly onInteractionChange?: (active: boolean) => void;
}

type MapsModule = typeof import('expo-maps');

function loadMapsModule(): MapsModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // Keep the JS bundle usable in an older development build while the native
    // module is being installed. The next development build will render maps.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-maps') as MapsModule;
  } catch {
    return null;
  }
}

const mapsModule = loadMapsModule();

function validCoordinate(value: BusinessLocationMapCoordinate | undefined) {
  return Boolean(
    value &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180,
  );
}

export function BusinessLocationMap({
  stops,
  draftCoordinate,
  draftTitle = 'New stop',
  height = 220,
  onCoordinateSelect,
  onInteractionChange,
}: BusinessLocationMapProps) {
  const mode = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[mode];
  const usableStops = useMemo(
    () =>
      stops.filter((stop) =>
        validCoordinate({ latitude: stop.latitude, longitude: stop.longitude }),
      ),
    [stops],
  );
  const usableDraft = validCoordinate(draftCoordinate) ? draftCoordinate : undefined;
  const camera = stopMapCamera(usableDraft ? [...usableStops, usableDraft] : usableStops);
  const markers = [
    ...groupMapStops(usableStops).map((stop) => ({
      id: stop.id,
      title: stop.visits > 1 ? `${stop.title} · ${stop.visits} scheduled visits` : stop.title,
      coordinates: { latitude: stop.latitude, longitude: stop.longitude },
      tintColor: Brand.primaryBright,
    })),
    ...(usableDraft
      ? [
          {
            id: 'draft-stop',
            title: draftTitle,
            coordinates: usableDraft,
            tintColor: Brand.danger,
          },
        ]
      : []),
  ];

  if (!mapsModule) {
    return (
      <View style={[styles.fallback, { height, backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="smallBold">
          Map preview available in the latest development build
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Your map pin can still be saved and opened in Maps below.
        </ThemedText>
      </View>
    );
  }

  const mapProps = {
    // Give the native map an explicit surface so its built-in legal attribution
    // stays anchored to the lower-left corner in both editor and preview.
    style: {
      width: '100%' as const,
      height: '100%' as const,
      flex: 1,
      borderRadius: Radius.medium,
      overflow: 'hidden' as const,
    },
    cameraPosition: camera,
    markers,
    ...(onCoordinateSelect
      ? {
          onMapClick: (event: { coordinates: { latitude?: number; longitude?: number } }) => {
            const latitude = event.coordinates.latitude;
            const longitude = event.coordinates.longitude;
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              onCoordinateSelect({ latitude, longitude });
            }
          },
        }
      : {}),
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    // Keep the back gesture disabled while either finger of a pinch remains
    // down. The map's native recognizer needs the full touch sequence.
    if (event.nativeEvent.touches.length === 0) onInteractionChange?.(false);
  };

  const mapSurfaceProps = onInteractionChange
    ? {
        onTouchStart: () => onInteractionChange(true),
        onTouchMove: () => onInteractionChange(true),
        onTouchEnd: handleTouchEnd,
        onTouchCancel: () => onInteractionChange(false),
      }
    : {};

  if (Platform.OS === 'ios') {
    return (
      <View {...mapSurfaceProps} style={[styles.mapSurface, { height }]}>
        <mapsModule.AppleMaps.View
          {...mapProps}
          key={JSON.stringify(camera)}
          colorScheme={
            mode === 'dark'
              ? mapsModule.AppleMaps.MapColorScheme.DARK
              : mapsModule.AppleMaps.MapColorScheme.LIGHT
          }
          uiSettings={{ compassEnabled: false, scaleBarEnabled: true }}
        />
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View {...mapSurfaceProps} style={[styles.mapSurface, { height }]}>
        <mapsModule.GoogleMaps.View
          {...mapProps}
          key={JSON.stringify(camera)}
          colorScheme={
            mode === 'dark'
              ? mapsModule.GoogleMaps.MapColorScheme.DARK
              : mapsModule.GoogleMaps.MapColorScheme.LIGHT
          }
          uiSettings={{ compassEnabled: false, scaleBarEnabled: true }}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  mapSurface: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  fallback: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Brand.border,
    justifyContent: 'center',
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
