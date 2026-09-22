import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';
import { HorizontalScrollRow } from '../horizontal-scroll-row';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  groupedPickupTimes,
  pickupPlaceKey,
  pickupPlaces,
  pickupTimeLabel,
} from '@/lib/pickup-order-flow';
import { pickupClockLabel, pickupTimezoneLabel } from '@/lib/pickup-checkout-presentation';
import { pickupLabel, type PickupSlot } from '@/lib/square-commerce-core';

const sameSlot = (a: PickupSlot | null | undefined, b: PickupSlot | null | undefined) =>
  Boolean(a && b && a.at === b.at && a.stopId === b.stopId);

function PickupChoice({
  title,
  detail,
  selected,
  onPress,
  opensPicker = false,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
  opensPicker?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole={opensPicker ? 'button' : 'radio'}
      accessibilityLabel={`${title}, ${detail}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 72,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: selected ? c.backgroundSelected : c.backgroundElement,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: selected ? 7 : 2,
          borderColor: selected ? c.actionPrimary : c.textSecondary,
        }}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      {opensPicker && (
        <ThemedText accessibilityElementsHidden importantForAccessibility="no">
          ›
        </ThemedText>
      )}
    </Pressable>
  );
}

/** Draft choices remain local until confirmation; cancel preserves the committed pickup. */
export function PickupTimePicker({
  slots,
  place,
  slot,
  onClose,
  onConfirm,
}: {
  slots: PickupSlot[];
  place: string;
  slot: PickupSlot | null;
  onClose: () => void;
  onConfirm: (slot: PickupSlot) => void;
}) {
  const c = useTheme();
  const reducedMotion = useReducedMotion();
  const dates = groupedPickupTimes(slots, place);
  const [draft, setDraft] = useState(slot);
  const [dateKey, setDateKey] = useState(
    () => dates.find((d) => d.slots.some((s) => sameSlot(s, slot)))?.key ?? dates[0]?.key,
  );
  const date = dates.find((d) => d.key === dateKey) ?? dates[0];
  const selected = date?.slots.find((s) => sameSlot(s, draft)) ?? null;
  return (
    <Modal
      visible
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}
        edges={['top', 'left', 'right']}
      >
        <View
          style={{
            maxHeight: '88%',
            minHeight: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: c.background,
            overflow: 'hidden',
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ThemedText type="card" style={{ flex: 1 }}>
                Choose pickup time
              </ThemedText>
              <AppButton label="Cancel" variant="tertiary" onPress={onClose} />
            </View>
            {date?.slots[0] && (
              <ThemedText type="small" themeColor="textSecondary">
                All times in {pickupTimezoneLabel(date.slots[0])}
              </ThemedText>
            )}
          </View>
          <ScrollView
            style={{ flexShrink: 1, minHeight: 0 }}
            contentContainerStyle={{ padding: 16, gap: 20 }}
          >
            <HorizontalScrollRow contentContainerStyle={{ gap: 8 }}>
              {dates.map((d) => (
                <Pressable
                  key={d.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: d.key === date?.key }}
                  onPress={() => {
                    setDateKey(d.key);
                    setDraft(null);
                  }}
                  style={{
                    minHeight: 48,
                    padding: 12,
                    borderRadius: 12,
                    justifyContent: 'center',
                    backgroundColor:
                      d.key === date?.key ? c.backgroundSelected : c.backgroundElement,
                  }}
                >
                  <ThemedText type="smallBold">{d.label}</ThemedText>
                </Pressable>
              ))}
            </HorizontalScrollRow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {date?.slots.map((s) => {
                const active = sameSlot(s, selected);
                const ambiguous = date.slots.some(
                  (other) => other.at !== s.at && pickupClockLabel(other) === pickupClockLabel(s),
                );
                return (
                  <Pressable
                    key={s.at}
                    accessibilityRole="radio"
                    accessibilityLabel={`${date.label}, ${pickupTimeLabel(s)}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => setDraft(s)}
                    style={{
                      flexBasis: '46%',
                      flexGrow: 1,
                      minHeight: 48,
                      padding: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: active ? c.actionPrimary : c.backgroundElement,
                    }}
                  >
                    <ThemedText type="smallBold" style={{ color: active ? c.onAction : c.text }}>
                      {ambiguous ? pickupTimeLabel(s) : pickupClockLabel(s)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {!date && (
              <ThemedText>
                No pickup times are available. Close this picker and refresh pickup options.
              </ThemedText>
            )}
          </ScrollView>
          <SafeAreaView
            edges={['bottom']}
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderTopColor: c.divider,
            }}
          >
            <AppButton
              label={selected ? `Use ${pickupClockLabel(selected)}` : 'Choose a time'}
              disabled={!selected}
              onPress={() => {
                if (selected) onConfirm(selected);
              }}
            />
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function PickupScheduler({
  slots,
  place,
  slot,
  onPlace,
  onSlot,
}: {
  slots: PickupSlot[];
  place: string | null;
  slot: PickupSlot | null;
  onPlace: (place: string) => void;
  onSlot: (slot: PickupSlot | null) => void;
}) {
  const places = pickupPlaces(slots);
  const dates = groupedPickupTimes(slots, place);
  const first = dates[0]?.slots[0];
  const current = dates.flatMap((d) => d.slots).find((s) => sameSlot(s, slot)) ?? null;
  const soonest = sameSlot(first, current);
  const selectedPlace = places.find((p) => pickupPlaceKey(p) === place);
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <ThemedText type="small" themeColor="textSecondary">
          PICKUP LOCATION
        </ThemedText>
        {places.length > 1
          ? places.map((p) => (
              <AppButton
                key={pickupPlaceKey(p)}
                label={`${p.title} · ${p.address}`}
                variant={place === pickupPlaceKey(p) ? 'primary' : 'secondary'}
                onPress={() => {
                  setPickerOpen(false);
                  onPlace(pickupPlaceKey(p));
                }}
              />
            ))
          : selectedPlace && (
              <>
                <ThemedText type="card">{selectedPlace.title}</ThemedText>
                <ThemedText themeColor="textSecondary">{selectedPlace.address}</ThemedText>
              </>
            )}
      </View>
      {!place && <ThemedText>Choose a location to see pickup times.</ThemedText>}
      {first && (
        <View style={{ gap: 12 }}>
          <ThemedText type="card">When would you like it?</ThemedText>
          <PickupChoice
            title="Soonest available"
            detail={pickupLabel(first)}
            selected={soonest}
            onPress={() => onSlot(first)}
          />
          <PickupChoice
            title={current && !soonest ? 'Scheduled pickup' : 'Choose another time'}
            detail={
              current && !soonest ? pickupLabel(current) : 'Pick a day and time that works for you'
            }
            selected={!!current && !soonest}
            opensPicker
            onPress={() => setPickerOpen(true)}
          />
        </View>
      )}
      {!!place && !first && (
        <ThemedText>
          No pickup times are available. Refresh pickup options to check again.
        </ThemedText>
      )}
      {pickerOpen && place && (
        <PickupTimePicker
          key={place}
          slots={slots}
          place={place}
          slot={current}
          onClose={() => setPickerOpen(false)}
          onConfirm={(next) => {
            onSlot(next);
            setPickerOpen(false);
          }}
        />
      )}
    </View>
  );
}
