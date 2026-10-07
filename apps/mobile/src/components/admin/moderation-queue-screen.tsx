import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { AdminIcon as AppIcon } from './admin-icon';
import { useTheme } from '@/hooks/use-theme';
import { useMobileModerationQueue } from '@/hooks/use-mobile-moderation';
import { QUEUES } from '@/lib/admin/moderation-types';
import {
  AdminAccessGate,
  AdminFrame,
  AdminSection,
  AdminText,
  formatAdminDate,
} from './admin-frame';
import { useAdminStyles } from './mobile-admin.styles';
const QUEUE_ICONS = {
  business: 'store',
  content_report: 'flag',
  pickup_review: 'shopping-bag',
  event_review: 'calendar-days',
} as const;
import { ModerationBackupPanel } from './moderation-backup-panel';
export function MobileModerationQueueScreen() {
  const s = useAdminStyles(),
    c = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const model = useMobileModerationQueue();
  const [search, setSearch] = useState('');
  const snapshot = model.snapshot;
  return (
    <AdminFrame title="Review workspace">
      <AdminAccessGate access={model.access}>
        <AdminText>
          Choose a queue, read the case and record your decision. Suggestions help you check the
          evidence. The server backup can handle narrowly defined routine cases when you enable it.
        </AdminText>
        <ModerationBackupPanel key={model.access.accountId ?? 'signed-out'} access={model.access} />
        <AdminSection title="Review queues">
          <View style={s.grid}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: model.filters.kind === null }}
              onPress={() => model.filter({ kind: null })}
              style={[
                s.choice,
                s.labelRow,
                { flexBasis: '100%', justifyContent: 'space-between' },
                model.filters.kind === null && s.selected,
              ]}
            >
              <ThemedText style={[s.fieldLabel, model.filters.kind === null && s.mintText]}>
                All queues
              </ThemedText>
              <AppIcon
                name={model.filters.kind === null ? 'circle-check' : 'layout-grid'}
                size={20}
                tintColor={model.filters.kind === null ? '#102D25' : c.textSecondary}
              />
            </Pressable>
            {QUEUES.map((queue) => (
              <Pressable
                key={queue.kind}
                accessibilityRole="button"
                accessibilityLabel={`${queue.label}: ${snapshot?.counts[queue.kind] ?? 'loading'} open`}
                accessibilityState={{ selected: model.filters.kind === queue.kind }}
                onPress={() => model.filter({ kind: queue.kind })}
                style={[
                  s.choice,
                  s.queueTile,
                  (width < 350 || fontScale > 1.3) && { flexBasis: '100%' },
                  model.filters.kind === queue.kind && s.selected,
                ]}
              >
                <View style={[s.labelRow, { justifyContent: 'space-between' }]}>
                  <AppIcon
                    name={QUEUE_ICONS[queue.kind]}
                    size={22}
                    tintColor={model.filters.kind === queue.kind ? '#102D25' : c.text}
                  />
                  <ThemedText
                    style={[s.queueCount, model.filters.kind === queue.kind && s.mintText]}
                  >
                    {snapshot ? (snapshot.counts[queue.kind] ?? 0) : '—'}
                  </ThemedText>
                </View>
                <ThemedText style={[s.queueLabel, model.filters.kind === queue.kind && s.mintText]}>
                  {queue.short}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </AdminSection>
        <AdminSection title="Find a case">
          <ThemedText style={s.muted}>Search title, content or location</ThemedText>
          <TextInput
            accessibilityLabel="Search cases"
            value={search}
            onChangeText={setSearch}
            maxLength={120}
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
            placeholder="Business, content or location"
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => model.filter({ search })}
          />
          <AppButton label="Search" variant="secondary" onPress={() => model.filter({ search })} />
          <View style={s.row}>
            {(['open', 'all'] as const).map((state) => (
              <Pressable
                key={state}
                accessibilityRole="button"
                accessibilityState={{ selected: model.filters.state === state }}
                onPress={() => model.filter({ state })}
                style={[
                  s.choice,
                  { flexBasis: '47%', flexGrow: 1 },
                  model.filters.state === state && s.selected,
                ]}
              >
                <ThemedText style={[s.fieldLabel, model.filters.state === state && s.mintText]}>
                  {state === 'open' ? 'Open cases' : 'All statuses'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </AdminSection>
        {model.loading && (
          <View style={s.section}>
            <ActivityIndicator color={c.accent} />
            <AdminText>Loading cases…</AdminText>
          </View>
        )}
        {model.error && (
          <View style={s.error}>
            <ThemedText accessibilityRole="alert" style={s.body}>
              {model.error}
            </ThemedText>
            <AppButton
              label="Try loading again"
              variant="secondary"
              onPress={() => void model.refresh()}
            />
          </View>
        )}
        {snapshot && (
          <AdminSection title={`${snapshot.total} ${snapshot.total === 1 ? 'case' : 'cases'}`}>
            <AdminText muted>Oldest cases appear first.</AdminText>
            {snapshot.records.length === 0 ? (
              <AdminText>
                {model.filters.search
                  ? 'No cases match this search. Try another term.'
                  : model.filters.state === 'open'
                    ? 'This queue has no open cases.'
                    : 'This queue has no cases yet.'}
              </AdminText>
            ) : (
              snapshot.records.map((record) => (
                <Pressable
                  key={`${record.kind}:${record.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open case: ${record.title}`}
                  onPress={() =>
                    router.push({
                      pathname: '/admin-moderation-case',
                      params: { kind: record.kind, id: record.id },
                    } as Href)
                  }
                  style={[s.choice, s.item]}
                >
                  <ThemedText style={s.title}>{record.title}</ThemedText>
                  <AdminText>{record.subtitle}</AdminText>
                  <View style={s.badge}>
                    <ThemedText style={s.badgeText}>
                      {record.status.replaceAll('_', ' ')}
                    </ThemedText>
                  </View>
                  <View style={s.labelRow}>
                    <AppIcon name="clock" size={16} tintColor={c.textSecondary} />
                    <ThemedText style={[s.muted, s.flexible]}>
                      {formatAdminDate(record.created_at)}
                    </ThemedText>
                  </View>
                  <View style={s.cardAction}>
                    <ThemedText style={s.actionText}>View case</ThemedText>
                    <AppIcon name="arrow-right" size={18} tintColor={c.onAction} />
                  </View>
                </Pressable>
              ))
            )}
            <View style={s.row}>
              <AppButton
                label="Previous cases"
                variant="secondary"
                disabled={model.filters.offset === 0}
                onPress={() =>
                  model.filter({ offset: Math.max(0, model.filters.offset - snapshot.page_size) })
                }
              />
              <AppButton
                label="Next cases"
                variant="secondary"
                disabled={snapshot.offset + snapshot.records.length >= snapshot.total}
                onPress={() => model.filter({ offset: model.filters.offset + snapshot.page_size })}
              />
            </View>
            <AppButton
              label="Refresh queues"
              variant="secondary"
              onPress={() => void model.refresh()}
            />
          </AdminSection>
        )}
      </AdminAccessGate>
    </AdminFrame>
  );
}
