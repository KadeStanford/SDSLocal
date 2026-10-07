import { PageHeader } from '@/components/page-header';
import { AppIcon } from '@/components/app-icon';
import { RewardProgramCard } from './reward-program-card';
import { Pressable, View } from 'react-native';
import { BusinessLogo } from './business-logo';

import { CustomerAction } from './customer-ui';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { IdentityPhoto } from '@/lib/business-identity';

export interface RewardWalletCard {
  business_photos?: readonly IdentityPhoto[] | null;
  membership_id: string;
  business_id: string;
  business_name: string;
  primary_color: string;
  program_name: string;
  reward_description: string;
  program_type?: 'visits' | 'points';
  points_per_dollar?: number | null;
  points_required?: number | null;
  earned_points?: number;
  available_points?: number;
  progress_points?: number;
  rewards_ready: number;
  progress_stamps?: number;
  stamps_required?: number;
}
export function rewardProgress(card: RewardWalletCard) {
  const unit = card.program_type === 'points' ? 'points' : 'visits';
  const progress = Math.max(
    0,
    card.program_type === 'points' ? (card.progress_points ?? 0) : (card.progress_stamps ?? 0),
  );
  const target =
    card.program_type === 'points' ? (card.points_required ?? 0) : (card.stamps_required ?? 0);
  return {
    progress,
    target,
    unit,
    percent: target > 0 ? Math.min(100, (progress / target) * 100) : null,
  };
}
function RewardIdentity({ card, inverse = false }: { card: RewardWalletCard; inverse?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <BusinessLogo name={card.business_name} photos={card.business_photos} size={40} decorative />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <ThemedText
          type="smallBold"
          style={inverse ? { color: '#d4e4d9', fontSize: 12 } : undefined}
        >
          {card.business_name}
        </ThemedText>
        {!inverse && (
          <ThemedText type="small" themeColor="textSecondary">
            {card.program_type === 'points' ? 'Points rewards' : 'Visit rewards'}
          </ThemedText>
        )}
      </View>
    </View>
  );
}
export function RewardProgress({
  card,
  detailed = false,
}: {
  card: RewardWalletCard;
  detailed?: boolean;
}) {
  const c = useTheme();
  const { progress, target, unit, percent } = rewardProgress(card);
  const label =
    target > 0
      ? `${progress} of ${target} ${unit} toward your next reward`
      : `${progress} ${unit} recorded`;
  return (
    <View style={{ gap: 12 }}>
      {card.rewards_ready > 0 && (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            backgroundColor: c.backgroundSelected,
          }}
        >
          <ThemedText type="smallBold" style={{ color: c.accent }}>
            {card.rewards_ready} {card.rewards_ready === 1 ? 'reward ready' : 'rewards ready'}
          </ThemedText>
        </View>
      )}
      {detailed && card.program_type === 'points' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
          <ThemedText type="title">{card.available_points ?? 0}</ThemedText>
          <ThemedText themeColor="textSecondary">available points</ThemedText>
        </View>
      )}
      {detailed ? (
        <ThemedText type="smallBold">{label}</ThemedText>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
          <ThemedText
            style={{ fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 }}
          >
            {progress}
            {target > 0 ? ` / ${target}` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {unit} {target > 0 ? 'toward your next reward' : 'recorded'}
          </ThemedText>
        </View>
      )}
      {percent !== null && (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: target, now: Math.min(target, progress), text: label }}
          style={{ height: 8, borderRadius: 4, backgroundColor: c.divider, overflow: 'hidden' }}
        >
          <View
            style={{
              height: '100%',
              width: `${percent}%`,
              backgroundColor: c.accent,
              borderRadius: 3,
            }}
          />
        </View>
      )}
      {detailed && target > 0 && progress < target && (
        <ThemedText type="small" themeColor="textSecondary">
          {target - progress} more {unit} to the next reward.
        </ThemedText>
      )}
    </View>
  );
}
export function RewardsWalletCard({
  card,
  onOpen,
  disabled = false,
}: {
  card: RewardWalletCard;
  onOpen: (membershipId: string) => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.business_name}, ${card.program_name}${card.rewards_ready > 0 ? `, ${card.rewards_ready} rewards ready` : ''}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onOpen(card.membership_id)}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: c.divider,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: c.backgroundElement,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ padding: 20, gap: 18 }}>
        <RewardIdentity card={card} />
        <View style={{ height: 1, backgroundColor: c.divider }} />
        <View style={{ gap: 6 }}>
          <ThemedText type="card" style={{ fontSize: 20, lineHeight: 26 }}>
            {card.program_name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {card.reward_description}
          </ThemedText>
        </View>
        <RewardProgress card={card} />
      </View>
      <View
        style={{
          minHeight: 48,
          paddingHorizontal: 20,
          paddingVertical: 13,
          backgroundColor: c.accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <ThemedText type="smallBold" style={{ color: c.onAccent, fontSize: 16, lineHeight: 22 }}>
          View rewards
        </ThemedText>
        <AppIcon name="chevron-right" size={20} tintColor={c.onAccent} />
      </View>
    </Pressable>
  );
}
export function RewardDetails({
  card,
  canShowCode,
  onShowCode,
  onBack,
}: {
  card: RewardWalletCard;
  canShowCode: boolean;
  onShowCode: () => void;
  onBack: () => void;
}) {
  return (
    <View style={{ gap: 20 }}>
      <PageHeader />
      <View style={{ alignSelf: 'flex-start' }}>
        <CustomerAction label="Rewards" icon="back" onPress={onBack} />
      </View>
      <RewardProgramCard
        identity={<RewardIdentity card={card} inverse />}
        name={card.program_name}
        description={card.reward_description}
        type={card.program_type ?? 'visits'}
        target={rewardProgress(card).target}
        progress={rewardProgress(card).progress}
        ready={card.rewards_ready}
        balance={card.available_points}
      />
      <AppButton label="Show my rewards code" disabled={!canShowCode} onPress={onShowCode} />
      <ThemedText type="small" themeColor="textSecondary">
        Show your code to staff at checkout. The business applies your rewards.
      </ThemedText>
    </View>
  );
}

export function RewardsWalletList({
  cards,
  onOpen,
  disabled = false,
}: {
  cards: readonly RewardWalletCard[];
  onOpen: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 24 }}>
      {[
        { title: 'Ready to enjoy', cards: cards.filter((c) => c.rewards_ready > 0) },
        { title: 'In progress', cards: cards.filter((c) => c.rewards_ready <= 0) },
      ]
        .filter((g) => g.cards.length)
        .map((g) => (
          <View key={g.title} style={{ gap: 12 }}>
            <ThemedText type="card">{g.title}</ThemedText>
            {g.cards.map((card) => (
              <RewardsWalletCard
                key={card.membership_id}
                card={card}
                onOpen={onOpen}
                disabled={disabled}
              />
            ))}
          </View>
        ))}
    </View>
  );
}
