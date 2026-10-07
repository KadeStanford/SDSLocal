import { useState } from 'react';
import { View } from 'react-native';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { MerchantButton, MerchantStatus } from '../merchant-ui';
import { ThemedText } from '../themed-text';
export interface PickupLaunchStep {
  readonly label: string;
  readonly complete: boolean;
}
/** Checklist progress is separate from provider readiness and persisted availability. */
export function PickupLaunchGuide({ steps }: { readonly steps: readonly PickupLaunchStep[] }) {
  const c = useMerchantTheme();
  const [expanded, setExpanded] = useState(false);
  const complete = steps.filter((step) => step.complete).length;
  const next = steps.find((step) => !step.complete);
  return (
    <View
      style={{
        gap: 12,
        padding: 16,
        borderRadius: 20,
        borderWidth: 0,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ThemedText type="smallBold">Ordering setup</ThemedText>
        <MerchantStatus
          label={`${complete} of ${steps.length} complete`}
          tone={next ? 'quiet' : 'success'}
        />
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Online ordering setup"
        accessibilityValue={{ min: 0, max: steps.length, now: complete }}
        style={{ height: 4, borderRadius: 2, backgroundColor: c.border }}
      >
        <View
          style={{
            width: `${steps.length ? (complete / steps.length) * 100 : 0}%`,
            height: 4,
            borderRadius: 2,
            backgroundColor: c.success,
          }}
        />
      </View>
      <ThemedText type="small" style={{ color: c.secondary }}>
        {next ? `Next: ${next.label}` : 'Review order availability and save any changes below.'}
      </ThemedText>
      <MerchantButton
        label={expanded ? 'Hide checklist' : 'View setup checklist'}
        secondary
        onPress={() => setExpanded(!expanded)}
      />
      {expanded && (
        <View style={{ gap: 12 }}>
          {steps.map((step) => (
            <View
              key={step.label}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <ThemedText style={{ color: step.complete ? c.success : c.secondary }}>
                {step.complete ? '✓' : '○'}
              </ThemedText>
              <ThemedText type="small" style={{ flex: 1, color: c.text }}>
                {step.label}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
