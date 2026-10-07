import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useMobileModerationQueue } from '@/hooks/use-mobile-moderation';
import { QUEUES } from '@/lib/admin/moderation-types';
import {
  AdminAccessGate,
  AdminFrame,
  AdminSection,
  AdminText,
  formatAdminDate,
} from './admin-frame';
import { adminStyles as s } from './mobile-admin.styles';
import {ModerationBackupPanel} from './moderation-backup-panel';
export function MobileModerationQueueScreen() {
  const model = useMobileModerationQueue();
  const [search, setSearch] = useState('');
  const snapshot = model.snapshot;
  return (
    <AdminFrame title="Admin">
      <AdminAccessGate access={model.access}>
        <AdminText>
          Choose a queue, read the case and record your decision. Suggestions help you check the
          evidence. The server backup can handle narrowly defined routine cases when you enable it.
        </AdminText>
        <ModerationBackupPanel key={model.access.accountId??'signed-out'} access={model.access}/>
        <AdminSection title="Review queues">
          <View style={s.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: model.filters.kind === null }}
              onPress={() => model.filter({ kind: null })}
              style={[s.choice, model.filters.kind === null && s.selected]}
            >
              <AdminText>All queues</AdminText>
            </Pressable>
            {QUEUES.map((queue) => (
              <Pressable
                key={queue.kind}
                accessibilityRole="button"
                accessibilityLabel={`${queue.label}: ${snapshot?.counts[queue.kind] ?? 'loading'} open`}
                accessibilityState={{ selected: model.filters.kind === queue.kind }}
                onPress={() => model.filter({ kind: queue.kind })}
                style={[s.choice, model.filters.kind === queue.kind && s.selected]}
              >
                <AdminText>
                  {queue.short}
                  {snapshot ? ` · ${snapshot.counts[queue.kind] ?? 0}` : ''}
                </AdminText>
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
                style={[s.choice, model.filters.state === state && s.selected]}
              >
                <AdminText>{state === 'open' ? 'Open cases' : 'All statuses'}</AdminText>
              </Pressable>
            ))}
          </View>
        </AdminSection>
        {model.loading && (
          <View style={s.section}>
            <ActivityIndicator />
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
                  <AdminText muted>
                    {record.status.replaceAll('_', ' ')} · {formatAdminDate(record.created_at)}
                  </AdminText>
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
