import { View } from 'react-native';
import { type ReactNode } from 'react';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { ThemedText } from './themed-text';
export function RewardProgramCard({
  name,
  description,
  type,
  target,
  progress = 0,
  ready = 0,
  balance,
  active = true,
  preview = false,
  enrollment = false,
  identity,
  footer,
}: {
  name: string;
  description: string;
  type: 'visits' | 'points';
  target: number;
  progress?: number;
  ready?: number;
  balance?: number | undefined;
  active?: boolean;
  preview?: boolean;
  enrollment?: boolean;
  identity?: ReactNode;
  footer?: ReactNode;
}) {
  const count = Number.isFinite(target) ? Math.max(0, Math.floor(target)) : 0;
  const earned = Math.max(0, progress);
  const stampCount = Math.min(30, count);
  const columns = stampCount <= 6 ? stampCount : stampCount <= 8 ? 4 : stampCount <= 15 ? 5 : 6;
  return (
    <View style={{ backgroundColor: '#102D25', borderRadius: 18, overflow: 'hidden' }}>
      <View style={{ padding: 20, gap: 16 }}>
        {identity}
        {(!identity || ready > 0) && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <ThemedText
              style={{
                color: '#b5d4c8',
                fontSize: 10,
                lineHeight: 15,
                fontWeight: '700',
                letterSpacing: 1,
              }}
            >
              {enrollment ? 'REWARDS PROGRAM' : preview ? 'CUSTOMER CARD PREVIEW' : 'YOUR REWARDS'}
            </ThemedText>
            <ThemedText
              style={{
                color: '#a1e6c7',
                backgroundColor: '#2b5446',
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 7,
                fontSize: 11,
                lineHeight: 15,
              }}
            >
              {!active
                ? 'Paused'
                : ready > 0
                  ? `${ready} ${ready === 1 ? 'reward ready' : 'rewards ready'}`
                  : 'Active'}
            </ThemedText>
          </View>
        )}
        <View style={{ gap: 7 }}>
          <ThemedText type="card" style={{ color: '#f4f5ed' }}>
            {name}
          </ThemedText>
          <ThemedText type="small" style={{ color: '#d0e2d9' }}>
            {description}
          </ThemedText>
        </View>
        {type === 'visits' && stampCount > 0 ? (
          <View
            accessible
            accessibilityLabel={`${earned} of ${count} visits toward your next reward`}
            style={{ gap: 10, marginVertical: 4 }}
          >
            {Array.from({ length: Math.ceil(stampCount / columns) }, (_, row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 10 }}>
                {Array.from({ length: columns }, (_, column) => {
                  const i = row * columns + column;
                  if (i >= stampCount) return <View key={i} style={{ flex: 1 }} />;
                  return (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderStyle: i < earned ? 'solid' : 'dashed',
                        borderColor: i < earned ? '#b7e6cb' : '#719c88',
                        backgroundColor:
                          i < earned ? '#82c9a6' : i === stampCount - 1 ? '#39644e' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {i < earned ? (
                        <SymbolView
                          name="checkmark"
                          tintColor="#14392b"
                          style={{ width: 20, height: 20 }}
                        />
                      ) : i === stampCount - 1 ? (
                        <SymbolView
                          name="gift"
                          tintColor="#edf5ed"
                          style={{ width: 22, height: 22 }}
                        />
                      ) : (
                        <ThemedText style={{ color: '#c3ddcf', fontSize: 13 }}>{i + 1}</ThemedText>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : type === 'points' ? (
          <>
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}
            >
              <ThemedText
                style={{ color: '#f4f5ed', fontSize: 36, lineHeight: 42, fontWeight: '700' }}
              >
                {enrollment ? count : (balance ?? earned)}
              </ThemedText>
              <ThemedText style={{ color: '#c3ddcf', fontSize: 12 }}>
                {enrollment ? 'points to unlock a reward' : 'available points'}
              </ThemedText>
            </View>
            {!enrollment && (
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: count || 1, now: Math.min(count, earned) }}
                style={{
                  height: 7,
                  backgroundColor: '#3c6152',
                  borderRadius: 5,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 7,
                    backgroundColor: '#8ad8af',
                    width: `${count ? Math.min(100, (earned / count) * 100) : 0}%`,
                  }}
                />
              </View>
            )}
          </>
        ) : null}
        <ThemedText style={{ color: '#c3ddcf', fontSize: 12, lineHeight: 18 }}>
          {enrollment
            ? `Collect ${count} ${type === 'visits' ? 'visits' : 'points'} to unlock a reward`
            : count > 0
              ? `${Math.min(earned, count)} of ${count} ${type === 'visits' ? 'visits' : 'points'}`
              : 'Your progress will appear here'}
        </ThemedText>
        {!preview && !enrollment && count > earned && (
          <ThemedText style={{ color: '#c3ddcf', fontSize: 12, lineHeight: 18 }}>
            {count - earned} more {type === 'visits' ? 'visits' : 'points'} to the next reward.
          </ThemedText>
        )}
      </View>
      {footer}
    </View>
  );
}
