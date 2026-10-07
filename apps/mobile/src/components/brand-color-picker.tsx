import { useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { MerchantButton, MerchantSheet } from './merchant-ui';
import { ThemedText } from './themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { colorText, hexToHsv, hsvToHex } from '@/lib/brand-color';

const swatches = [
  '#176B4D',
  '#122F27',
  '#80C5A4',
  '#2563A0',
  '#37487B',
  '#72558E',
  '#AB4F74',
  '#B23E37',
  '#D37836',
  '#B38A35',
  '#64776A',
  '#303B37',
];
export function BrandColorEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const c = useMerchantTheme(),
    id = useId().replace(/:/g, ''),
    [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hex, setHex] = useState(value),
    [width, setWidth] = useState(300);
  const update = (next: typeof hsv) => {
    setHsv(next);
    const color = hsvToHex(next.h, next.s, next.v);
    setHex(color);
    onChange(color);
  };
  const pick = (color: string) => {
    setHsv(hexToHsv(color));
    setHex(color);
    onChange(color);
  };
  const color = hsvToHex(hsv.h, hsv.s, hsv.v);
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderRadius: 14,
          backgroundColor: c.background,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 12,
            backgroundColor: color,
            borderWidth: 1,
            borderColor: c.border,
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="smallBold">Color preview</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {color}
          </ThemedText>
        </View>
        <View style={{ backgroundColor: color, padding: 12, borderRadius: 9 }}>
          <ThemedText type="smallBold" style={{ color: colorText(color) }}>
            Aa
          </ThemedText>
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <ThemedText type="smallBold">Palette</ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {swatches.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={'Choose ' + s}
              accessibilityState={{ selected: color === s }}
              onPress={() => pick(s)}
              style={{
                width: 44,
                height: 44,
                padding: 4,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: color === s ? c.text : 'transparent',
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 20,
                  backgroundColor: s,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                {color === s && <ThemedText style={{ color: colorText(s) }}>✓</ThemedText>}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <ThemedText type="smallBold">Choose any shade</ThemedText>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Color saturation and brightness"
          accessibilityValue={{
            text: `Saturation ${Math.round(hsv.s * 100)} percent, brightness ${Math.round(hsv.v * 100)} percent`,
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Increase saturation' },
            { name: 'decrement', label: 'Decrease saturation' },
            { name: 'lighter', label: 'Increase brightness' },
            { name: 'darker', label: 'Decrease brightness' },
          ]}
          onAccessibilityAction={(e) => {
            const action = e.nativeEvent.actionName;
            update({
              ...hsv,
              s: Math.max(
                0,
                Math.min(
                  1,
                  hsv.s + (action === 'increment' ? 0.05 : action === 'decrement' ? -0.05 : 0),
                ),
              ),
              v: Math.max(
                0,
                Math.min(
                  1,
                  hsv.v + (action === 'lighter' ? 0.05 : action === 'darker' ? -0.05 : 0),
                ),
              ),
            });
          }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) =>
            update({
              ...hsv,
              s: Math.min(1, Math.max(0, e.nativeEvent.locationX / width)),
              v: 1 - Math.min(1, Math.max(0, e.nativeEvent.locationY / 170)),
            })
          }
          onResponderMove={(e) =>
            update({
              ...hsv,
              s: Math.min(1, Math.max(0, e.nativeEvent.locationX / width)),
              v: 1 - Math.min(1, Math.max(0, e.nativeEvent.locationY / 170)),
            })
          }
          style={{ height: 170, borderRadius: 12, overflow: 'hidden' }}
        >
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id={id + 'sat'} x1="0%" x2="100%" y1="0%" y2="0%">
                  <Stop offset="0" stopColor="#fff" />
                  <Stop offset="1" stopColor={hsvToHex(hsv.h, 1, 1)} />
                </LinearGradient>
                <LinearGradient id={id + 'val'} x1="0%" x2="0%" y1="0%" y2="100%">
                  <Stop offset="0" stopColor="#000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={'url(#' + id + 'sat)'} />
              <Rect width="100%" height="100%" fill={'url(#' + id + 'val)'} />
            </Svg>
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.max(0, Math.min(width - 22, hsv.s * width - 11)),
              top: Math.max(0, Math.min(148, (1 - hsv.v) * 170 - 11)),
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 3,
              borderColor: '#fff',
              backgroundColor: color,
              boxShadow: '0 1px 3px #0008',
            }}
          />
        </View>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Hue"
          accessibilityValue={{ min: 0, max: 359, now: Math.round(hsv.h) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            update({
              ...hsv,
              h: (hsv.h + (e.nativeEvent.actionName === 'increment' ? 10 : 350)) % 360,
            })
          }
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) =>
            update({
              ...hsv,
              h: Math.min(359, Math.max(0, (e.nativeEvent.locationX / width) * 359)),
            })
          }
          onResponderMove={(e) =>
            update({
              ...hsv,
              h: Math.min(359, Math.max(0, (e.nativeEvent.locationX / width) * 359)),
            })
          }
          style={{ height: 44, justifyContent: 'center' }}
        >
          <View pointerEvents="none" style={{ height: 18, borderRadius: 9, overflow: 'hidden' }}>
            <Svg width="100%" height="18">
              <Defs>
                <LinearGradient id={id + 'hue'} x1="0%" x2="100%" y1="0%" y2="0%">
                  {['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00'].map((v, i) => (
                    <Stop key={i} offset={i / 6} stopColor={v} />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={'url(#' + id + 'hue)'} />
            </Svg>
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.max(0, Math.min(width - 28, (hsv.h / 359) * width - 14)),
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 3,
              borderColor: '#fff',
              backgroundColor: hsvToHex(hsv.h, 1, 1),
              boxShadow: '0 1px 4px #0005',
            }}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ThemedText type="smallBold" style={{ flex: 1 }}>
          Hex color
        </ThemedText>
        <TextInput
          accessibilityLabel="Exact hex color"
          value={hex}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          onChangeText={(next) => {
            setHex(next);
            if (/^#[\da-f]{6}$/i.test(next)) pick(next.toUpperCase());
          }}
          onBlur={() => setHex(color)}
          style={{
            minHeight: 48,
            width: 130,
            color: c.text,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            backgroundColor: c.background,
          }}
        />
      </View>
    </View>
  );
}
export function BrandColorPicker({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const c = useMerchantTheme(),
    [draft, setDraft] = useState<string | null>(null);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Choose ' + label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setDraft(value)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          minHeight: 76,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            backgroundColor: value,
            borderWidth: 1,
            borderColor: c.border,
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="smallBold">{label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tap to choose a color
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </Pressable>
      <MerchantSheet
        visible={draft !== null}
        title={label}
        onClose={() => setDraft(null)}
        footer={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <MerchantButton brand label="Cancel" secondary onPress={() => setDraft(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <MerchantButton
                brand
                label="Use color"
                onPress={() => {
                  if (draft) onChange(draft);
                  setDraft(null);
                }}
              />
            </View>
          </View>
        }
      >
        {draft !== null && <BrandColorEditor value={draft} onChange={setDraft} />}
      </MerchantSheet>
    </>
  );
}
