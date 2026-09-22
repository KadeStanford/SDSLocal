import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppButton } from '../app-button';
import { ChoicePicker } from '../choice-picker';
import { CommerceField, CommerceToggle } from '../commerce-fields';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { PickupSettings } from '@/lib/square-pickup-settings';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function pickupHoursLabel(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  if (hour === undefined || minute === undefined || !Number.isFinite(hour + minute)) return value;
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
const times = Array.from({ length: 96 }, (_, i) => {
  const value = `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`;
  return { value, label: pickupHoursLabel(value) };
});
const zones = [
  ['America/New_York', 'Eastern Time'],
  ['America/Chicago', 'Central Time'],
  ['America/Denver', 'Mountain Time'],
  ['America/Phoenix', 'Arizona Time'],
  ['America/Los_Angeles', 'Pacific Time'],
  ['America/Anchorage', 'Alaska Time'],
  ['Pacific/Honolulu', 'Hawaii Time'],
].map(([value, label]) => ({ value: value!, label: label! }));

function SettingsSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${summary}`}
        onPress={() => setOpen(!open)}
        style={{
          paddingVertical: 14,
          minHeight: 64,
          borderBottomWidth: 1,
          borderBottomColor: c.divider,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="card">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {summary}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">{open ? '−' : 'Edit'}</ThemedText>
      </Pressable>
      {open && children}
    </View>
  );
}

export function PickupSettingsEditor({
  draft,
  disabled,
  isMobile,
  onChange,
}: {
  draft: PickupSettings;
  disabled: boolean;
  isMobile: boolean;
  onChange: (patch: Partial<PickupSettings>) => void;
}) {
  const c = useTheme();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const activeDays = new Set(draft.pickup_windows.map((w) => w.day)).size;
  const timezone = zones.find((z) => z.value === draft.timezone)?.label ?? draft.timezone;
  const optionsFor = (value: string) =>
    times.some((t) => t.value === value)
      ? times
      : [...times, { value, label: pickupHoursLabel(value) }].sort((a, b) =>
          a.value.localeCompare(b.value),
        );
  return (
    <View style={{ gap: 8 }}>
      <SettingsSection
        title="Pickup hours"
        summary={`${activeDays} ${activeDays === 1 ? 'day' : 'days'} a week · ${timezone}`}
      >
        <View style={{ gap: 4 }}>
          {days.map((day, index) => {
            const windows = draft.pickup_windows
              .map((w, i) => ({ ...w, i }))
              .filter((w) => w.day === index);
            return (
              <View
                key={day}
                style={{ borderBottomWidth: 1, borderBottomColor: c.divider, paddingVertical: 4 }}
              >
                <Pressable
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${day} pickup hours`}
                  accessibilityState={{ expanded: editingDay === index, disabled }}
                  onPress={() => setEditingDay(editingDay === index ? null : index)}
                  style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <ThemedText type="smallBold" style={{ flexBasis: '30%' }}>
                    {day}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                    {windows.length
                      ? windows
                          .map((w) => `${pickupHoursLabel(w.start)} – ${pickupHoursLabel(w.end)}`)
                          .join('\n')
                      : 'Closed'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">›</ThemedText>
                </Pressable>
                {editingDay === index && (
                  <View style={{ gap: 12, paddingBottom: 12 }}>
                    <CommerceToggle
                      label={`Open ${day}`}
                      value={!!windows.length}
                      disabled={disabled}
                      onChange={(enabled) =>
                        onChange({
                          pickup_windows: enabled
                            ? [
                                ...draft.pickup_windows,
                                { day: index, start: '09:00', end: '17:00' },
                              ]
                            : draft.pickup_windows.filter((w) => w.day !== index),
                        })
                      }
                    />
                    {windows.map((w) => (
                      <View key={w.i} style={{ gap: 8 }}>
                        <ChoicePicker
                          label={`${day} opens`}
                          value={w.start}
                          options={optionsFor(w.start)}
                          disabled={disabled}
                          onChange={(start) =>
                            onChange({
                              pickup_windows: draft.pickup_windows.map((other, i) =>
                                i === w.i ? { ...other, start } : other,
                              ),
                            })
                          }
                        />
                        <ChoicePicker
                          label={`${day} closes`}
                          value={w.end}
                          options={optionsFor(w.end)}
                          disabled={disabled}
                          onChange={(end) =>
                            onChange({
                              pickup_windows: draft.pickup_windows.map((other, i) =>
                                i === w.i ? { ...other, end } : other,
                              ),
                            })
                          }
                        />
                        {w.start >= w.end && (
                          <ThemedText type="small" style={{ color: c.errorText }}>
                            Closing time must be after opening time.
                          </ThemedText>
                        )}
                        {windows.length > 1 && (
                          <AppButton
                            label="Remove window"
                            variant="tertiary"
                            disabled={disabled}
                            onPress={() =>
                              onChange({
                                pickup_windows: draft.pickup_windows.filter((_, i) => i !== w.i),
                              })
                            }
                          />
                        )}
                      </View>
                    ))}
                    {!!windows.length && (
                      <View style={{ gap: 8 }}>
                        <AppButton
                          label="Copy to weekdays"
                          variant="secondary"
                          disabled={
                            disabled ||
                            draft.pickup_windows.filter((w) => w.day === 0 || w.day === 6).length +
                              windows.length * 5 >
                              21
                          }
                          onPress={() =>
                            onChange({
                              pickup_windows: [
                                ...draft.pickup_windows.filter((w) => w.day === 0 || w.day === 6),
                                ...[1, 2, 3, 4, 5].flatMap((d) =>
                                  windows.map(({ start, end }) => ({ day: d, start, end })),
                                ),
                              ],
                            })
                          }
                        />
                        <AppButton
                          label="Add another window"
                          variant="tertiary"
                          disabled={disabled || draft.pickup_windows.length >= 21}
                          onPress={() =>
                            onChange({
                              pickup_windows: [
                                ...draft.pickup_windows,
                                { day: index, start: '17:00', end: '20:00' },
                              ],
                            })
                          }
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {timezone} · Set automatically from your pickup location.
        </ThemedText>
        {isMobile && (
          <>
            <CommerceToggle
              label="Allow pickup at upcoming stops"
              value={draft.allow_upcoming_stops}
              disabled={disabled}
              onChange={(allow_upcoming_stops) => onChange({ allow_upcoming_stops })}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Orders must fit both these hours and a published stop.
            </ThemedText>
          </>
        )}
      </SettingsSection>
      <SettingsSection
        title="Preparation & capacity"
        summary={`${draft.preparation_minutes} min prep · ${draft.max_orders_per_slot} orders every ${draft.slot_minutes} min`}
      >
        <CommerceField
          label="Preparation time · minutes"
          keyboardType="number-pad"
          value={Number.isNaN(draft.preparation_minutes) ? '' : String(draft.preparation_minutes)}
          editable={!disabled}
          onChangeText={(text) =>
            onChange({ preparation_minutes: text === '' ? NaN : Number(text) })
          }
        />
        <ThemedText type="small" themeColor="textSecondary">
          How long your team needs to prepare an order.
        </ThemedText>
        <ChoicePicker
          label="Offer a pickup time every"
          value={String(draft.slot_minutes)}
          options={[15, 30, 60].map((n) => ({ value: String(n), label: `${n} minutes` }))}
          disabled={disabled}
          onChange={(value) => onChange({ slot_minutes: Number(value) })}
        />
        <CommerceField
          label="Orders per pickup time"
          keyboardType="number-pad"
          value={Number.isNaN(draft.max_orders_per_slot) ? '' : String(draft.max_orders_per_slot)}
          editable={!disabled}
          onChangeText={(text) =>
            onChange({ max_orders_per_slot: text === '' ? NaN : Number(text) })
          }
        />
        <CommerceField
          label="Minimum advance notice · minutes"
          keyboardType="number-pad"
          value={
            Number.isNaN(draft.minimum_notice_minutes) ? '' : String(draft.minimum_notice_minutes)
          }
          editable={!disabled}
          onChangeText={(text) =>
            onChange({ minimum_notice_minutes: text === '' ? NaN : Number(text) })
          }
        />
        <ThemedText type="small" themeColor="textSecondary">
          Customers must order at least this far ahead. Preparation time still applies.
        </ThemedText>
      </SettingsSection>
    </View>
  );
}
