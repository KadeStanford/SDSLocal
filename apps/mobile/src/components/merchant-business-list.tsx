import { AppButton } from './app-button';
import { ParishBusinessBrand, BusinessTabs, BusinessSearch } from './business-screen-header';
import { ParishPalette } from './parish-brand';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { storagePublicUrl } from '@/lib/storage-url';
import { getBusinessStatusLabel } from '@sds/business-logic';
import type { BusinessType } from '@sds/types';
export { merchantColors } from '@/hooks/use-merchant-theme';

export type BusinessListFilter = 'all' | 'published' | 'setup';
export interface ManagedBusiness {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly business_type: BusinessType;
  readonly status: 'draft' | 'pending_review' | 'active' | 'suspended' | 'archived';
  readonly primary_color: string | null;
  readonly role: 'owner' | 'staff';
  readonly business_photos:
    | readonly {
        readonly role: string;
        readonly media_assets:
          | {
              readonly storage_path: string;
              readonly status: string;
              readonly alt_text: string | null;
            }
          | readonly {
              readonly storage_path: string;
              readonly status: string;
              readonly alt_text: string | null;
            }[]
          | null;
      }[]
    | null;
}
export function MerchantBusinessList({
  businesses,
  search,
  filter,
  onSearch,
  onFilter,
  onOpen,
  onAdd,
  onPlan,
  onStaffScan,
  planMessage,
}: {
  businesses: readonly ManagedBusiness[];
  search: string;
  filter: BusinessListFilter;
  onSearch: (value: string) => void;
  onFilter: (value: BusinessListFilter) => void;
  onOpen: (id: string, section: 'preview' | null) => void;
  onAdd: () => void;
  onPlan: () => void;
  onStaffScan: () => void;
  planMessage: string;
}) {
  const c = useMerchantTheme();
  const insets = useSafeAreaInsets();
  const [actionsId, setActionsId] = useState<string | null>(null);
  const actions = businesses.find((b) => b.id === actionsId);
  const visible = businesses
    .filter(
      (b) =>
        b.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
        (filter === 'all' ||
          (filter === 'published' ? b.status === 'active' : b.status !== 'active')),
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const groups = [
    { title: 'Published', rows: visible.filter((b) => b.status === 'active') },
    { title: 'Setup & review', rows: visible.filter((b) => b.status !== 'active') },
  ];
  const choose = (action: () => void) => {
    setActionsId(null);
    action();
  };
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{ padding: 20, gap: 12, borderRadius: 12, backgroundColor: ParishPalette.evergreen }}
      >
        <ParishBusinessBrand inverse />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 130, gap: 4 }}>
            <ThemedText
              type="title"
              style={{ color: ParishPalette.ivory, fontSize: 26, lineHeight: 32 }}
            >
              Businesses
            </ThemedText>
            <ThemedText type="small" style={{ color: ParishPalette.ivory }}>
              Select a business to manage
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a business"
            onPress={onAdd}
            style={{
              minHeight: 44,
              paddingHorizontal: 14,
              justifyContent: 'center',
              borderRadius: 8,
              backgroundColor: ParishPalette.mint,
            }}
          >
            <ThemedText type="smallBold" style={{ color: ParishPalette.evergreen }}>
              + Add business
            </ThemedText>
          </Pressable>
        </View>
      </View>
      <BusinessSearch value={search} onChange={onSearch} placeholder="Search businesses" />
      <BusinessTabs
        value={filter}
        onChange={onFilter}
        options={[
          { value: 'all', label: 'All', count: businesses.length },
          { value: 'published', label: 'Published' },
          { value: 'setup', label: 'Setup' },
        ]}
      />
      {groups
        .filter((g) => g.rows.length > 0)
        .map((group) => (
          <View key={group.title} style={{ gap: 8 }}>
            <ThemedText type="smallBold" style={{ color: c.secondary }}>
              {group.title} · {group.rows.length}
            </ThemedText>
            <View style={[s.list, { backgroundColor: c.surface, borderColor: c.border }]}>
              {group.rows.map((business, index) => (
                <View
                  key={business.id}
                  style={[s.row, { borderTopColor: c.border, borderTopWidth: index ? 1 : 0 }]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${business.name}, ${getBusinessStatusLabel(business.status)}, ${business.role === 'owner' ? 'manage business' : 'view business'}`}
                    onPress={() =>
                      onOpen(business.id, business.role === 'owner' ? null : 'preview')
                    }
                    style={({ pressed }) => [s.rowMain, { opacity: pressed ? 0.65 : 1 }]}
                  >
                    <MerchantLogo business={business} />
                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: c.text,
                          fontSize: 16,
                          lineHeight: 22,
                        }}
                      >
                        {business.name}
                      </ThemedText>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: business.status === 'active' ? c.success : c.warning,
                          }}
                        />
                        <ThemedText
                          type="small"
                          style={{
                            color: business.status === 'active' ? c.success : c.secondary,
                            fontSize: 12,
                            lineHeight: 17,
                          }}
                        >
                          {getBusinessStatusLabel(business.status)}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          style={{ color: c.secondary, fontSize: 12, lineHeight: 17 }}
                        >
                          · {business.role === 'owner' ? 'Owner' : 'Staff'}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Actions for ${business.name}`}
                    onPress={() => setActionsId(business.id)}
                    style={s.more}
                  >
                    <ThemedText style={{ color: c.secondary, fontSize: 24, lineHeight: 28 }}>
                      ⋯
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      {!visible.length && (
        <View style={{ paddingVertical: 32, gap: 12 }}>
          <ThemedText type="card" style={{ color: c.text }}>
            {businesses.length ? 'No matching businesses' : 'Add your first business'}
          </ThemedText>
          <ThemedText type="small" style={{ color: c.secondary }}>
            {businesses.length
              ? 'Try a different name or filter.'
              : 'Create a page, add your offerings, and get ready to publish.'}
          </ThemedText>
          {businesses.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSearch('');
                onFilter('all');
              }}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <ThemedText type="smallBold" style={{ color: c.text }}>
                Clear search & filters
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
      {businesses.some((b) => b.role === 'owner') && (
        <View style={{ gap: 8, marginTop: 4 }}>
          <ThemedText type="smallBold" style={{ color: c.secondary }}>
            Workspace settings
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={onPlan}
            style={[s.plan, { backgroundColor: c.background, borderColor: c.border }]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="smallBold" style={{ color: c.text }}>
                Manage subscription
              </ThemedText>
              <ThemedText type="small" style={{ color: c.secondary }}>
                {planMessage}
              </ThemedText>
            </View>
            <ThemedText style={{ color: c.secondary }}>›</ThemedText>
          </Pressable>
        </View>
      )}
      <Modal
        transparent
        visible={!!actions}
        animationType="slide"
        onRequestClose={() => setActionsId(null)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close business actions"
            onPress={() => setActionsId(null)}
            style={{ flex: 1 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              padding: 20,
              paddingBottom: Math.max(20, insets.bottom),
              gap: 8,
              backgroundColor: c.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.border,
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              {actions && <MerchantLogo business={actions} />}
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="card" style={{ color: c.text }}>
                  {actions?.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: c.secondary }}>
                  Business actions
                </ThemedText>
              </View>
            </View>
            {actions && (
              <>
                <ActionRow
                  label={actions.role === 'owner' ? 'Manage business' : 'View business'}
                  onPress={() =>
                    choose(() => onOpen(actions.id, actions.role === 'owner' ? null : 'preview'))
                  }
                />
                <ActionRow
                  label={actions.role === 'owner' ? 'Preview public page' : 'Staff scanner'}
                  onPress={() =>
                    choose(() =>
                      actions.role === 'owner' ? onOpen(actions.id, 'preview') : onStaffScan(),
                    )
                  }
                />
              </>
            )}
            <AppButton
              label="Done"
              variant="secondary"
              onPress={() => setActionsId(null)}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useMerchantTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 52,
          paddingVertical: 14,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: c.background,
          opacity: pressed ? 0.7 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: c.border,
        },
      ]}
    >
      <ThemedText type="smallBold" style={{ color: c.text }}>
        {label}
      </ThemedText>
      <ThemedText style={{ color: c.secondary }}>›</ThemedText>
    </Pressable>
  );
}
function MerchantLogo({ business }: { business: ManagedBusiness }) {
  const c = useMerchantTheme();
  const [failed, setFailed] = useState(false);
  const photo = business.business_photos?.find((p) => p.role === 'logo');
  const asset = Array.isArray(photo?.media_assets) ? photo.media_assets[0] : photo?.media_assets;
  const url = asset?.status === 'ready' && !failed ? storagePublicUrl(asset.storage_path) : null;
  return (
    <View style={[s.logo, { backgroundColor: c.surface, borderColor: c.border }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          accessibilityLabel={`${business.name} logo`}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <ThemedText type="smallBold" style={{ color: c.text, fontSize: 18 }}>
          {business.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0])
            .join('')}
        </ThemedText>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  add: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  search: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
  },
  filter: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summary: { flexDirection: 'row', borderRadius: 12, padding: 20, gap: 20 },
  stat: { flex: 1, gap: 4 },
  list: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  featured: {
    flexDirection: 'column',
    paddingLeft: 18,
    paddingRight: 18,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    minHeight: 88,
  },
  logo: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: { minHeight: 48, width: 44, alignItems: 'center', justifyContent: 'center' },
  plan: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
});
