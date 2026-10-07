import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { CustomerBrand } from './customer-brand';
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
  return (
    <View style={{ gap: 20 }}>
      <CustomerBrand />
      <View style={{ gap: 8 }}>
        <ThemedText accessibilityRole="header" type="title">
          {view === 'following' ? 'Your local favorites' : 'Your rewards'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {view === 'following'
            ? 'The businesses you love, all in one place.'
            : 'Every visit brings something back.'}
        </ThemedText>
      </View>
      {onView && (
        <CustomerTabs
          value={view}
          onChange={onView}
          options={[
            { value: 'wallet', label: `Rewards${cards === undefined ? '' : ` · ${cards}`}` },
            { value: 'following', label: `Following · ${following}` },
          ]}
        />
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
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: c.backgroundElement,
      }}
    >
      {uri && failed !== uri && (
        <Image
          source={{ uri }}
          contentFit="cover"
          style={{ width: '100%', aspectRatio: 3 }}
          onError={() => setFailed(uri)}
          accessibilityLabel=""
        />
      )}
      <View style={{ padding: 18, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BusinessLogo name={business.name} photos={photos} size={52} decorative />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <ThemedText type="card">{business.name}</ThemedText>
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
