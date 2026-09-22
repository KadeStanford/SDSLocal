import { useMemo } from 'react';
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
  const colors = Colors.dark;
  const usableStops = useMemo(
    () =>
      stops.filter((stop) =>
        validCoordinate({ latitude: stop.latitude, longitude: stop.longitude }),
      ),
    [stops],
  );
  const usableDraft = validCoordinate(draftCoordinate) ? draftCoordinate : undefined;
  const center = usableDraft ?? usableStops[0] ?? { latitude: 30.5044, longitude: -90.4809 };
  const markers = [
    ...usableStops.map((stop) => ({
      id: stop.id,
      title: stop.title,
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
    cameraPosition: {
      coordinates: { latitude: center.latitude, longitude: center.longitude },
      zoom: usableStops.length > 1 ? 11 : 13,
    },
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
          colorScheme={mapsModule.AppleMaps.MapColorScheme.DARK}
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
          colorScheme={mapsModule.GoogleMaps.MapColorScheme.DARK}
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
