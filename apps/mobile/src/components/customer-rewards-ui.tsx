import { PageHeader } from '@/components/page-header';
import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon as SymbolView } from '@/components/app-icon';

import { CustomerTabs } from './customer-ui';
import { AppButton } from './app-button';
import { BusinessLogo } from './business-logo';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { businessAssetPath, type IdentityPhoto } from '@/lib/business-identity';
import { storagePublicUrl } from '@/lib/storage-url';

export function RewardsHeader({
  view,
  cards,
  following,
  onView,
}: {
  view: 'wallet' | 'following';
  cards: number | undefined;
  following: number;
  onView?: ((view: 'wallet' | 'following') => void) | undefined;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <PageHeader />
      <View style={{ gap: 8 }}>
        <ThemedText
          accessibilityRole="header"
          type="title"
          style={{ fontSize: 28, lineHeight: 34 }}
        >
          {view === 'following' ? 'Following' : 'Rewards wallet'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {view === 'following'
            ? 'Keep your favorite local places close.'
            : 'Your visits, your progress, your next reward.'}
        </ThemedText>
      </View>
      {onView && (
        <View
          style={{
            padding: 12,
            gap: 12,
            backgroundColor: c.backgroundElement,
            borderWidth: 1,
            borderColor: c.divider,
            borderRadius: 18,
          }}
        >
          <CustomerTabs
            value={view}
            onChange={onView}
            options={[
              { value: 'wallet', label: 'Rewards' },
              { value: 'following', label: 'Following' },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {view === 'wallet'
              ? cards === undefined
                ? 'Loading your reward cards'
                : cards + (cards === 1 ? ' reward card' : ' reward cards')
              : following + (following === 1 ? ' business followed' : ' businesses followed')}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

export function FollowingBusinessCard({
  business,
  photos,
  confirming = false,
  pending = false,
  disabled = false,
  onOpen,
  onFollowing,
  onCancel,
}: {
  business: {
    name: string;
    category_summary: string | null;
    city: string | null;
    region_code: string | null;
  };
  photos: readonly IdentityPhoto[];
  confirming?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onOpen: () => void;
  onFollowing: () => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const path = businessAssetPath(photos, 'cover');
  const uri = path ? (/^https?:\/\//i.test(path) ? path : storagePublicUrl(path)) : null;
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.divider,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: c.backgroundElement,
      }}
    >
      <View style={{ padding: 18, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 14,
              overflow: 'hidden',
              backgroundColor: c.backgroundSelected,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {uri && failed !== uri ? (
              <Image
                source={{ uri }}
                contentFit="cover"
                style={{ width: 88, height: 88 }}
                onError={() => setFailed(uri)}
                accessibilityLabel=""
              />
            ) : (
              <BusinessLogo name={business.name} photos={photos} size={40} decorative />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BusinessLogo name={business.name} photos={photos} size={28} decorative />
              <ThemedText type="card" style={{ flex: 1, minWidth: 0 }}>
                {business.name}
              </ThemedText>
            </View>
            {!!business.category_summary && (
              <ThemedText type="small" themeColor="textSecondary">
                {business.category_summary.split(',')[0]}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {[business.city, business.region_code].filter(Boolean).join(', ') || 'Local business'}
            </ThemedText>
          </View>
        </View>
        {confirming && (
          <ThemedText type="small" themeColor="textSecondary">
            Unfollow {business.name}? It will leave your Following list.
          </ThemedText>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <AppButton
            style={{ flexGrow: 1, flexBasis: 130 }}
            label={confirming ? 'Keep following' : 'View business'}
            variant={confirming ? 'secondary' : 'primary'}
            onPress={confirming ? onCancel : onOpen}
            disabled={disabled || pending}
          />
          <AppButton
            style={{ flexGrow: 1, flexBasis: 130 }}
            label={confirming ? 'Unfollow' : 'Following'}
            accessibilityLabel={
              confirming
                ? `Confirm unfollow ${business.name}`
                : `Following ${business.name}. Manage follow`
            }
            variant={confirming ? 'destructive' : 'secondary'}
            onPress={onFollowing}
            disabled={disabled || pending}
            loading={pending}
            icon={
              !confirming ? (
                <SymbolView
                  name="checkmark"
                  tintColor={c.accent}
                  style={{ width: 15, height: 15 }}
                />
              ) : undefined
            }
          />
        </View>
      </View>
    </View>
  );
}
