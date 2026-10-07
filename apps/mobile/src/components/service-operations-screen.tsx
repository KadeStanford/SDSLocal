import { PageHeaderScope, NestedHeaderBack } from './page-header';
import { FocusedOperationsHeader } from './focused-operations-header';
import { useState, useCallback } from 'react';
import { Alert, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useServiceOperations } from '@/providers/service-operations-provider';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { AppIcon as SymbolView } from '@/components/app-icon';

import { AppointmentWorkspace } from './appointment-workspace';

import { EmptyState, ListLoading, StateNotice } from './data-state';
import { ServiceRequestsContent } from '@/app/service-requests';
export function ServiceOperationsScreen({ kind }: { kind: 'appointments' | 'requests' }) {
  const { businesses, loading, error, refresh } = useServiceOperations();
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<'schedule' | 'setup'>('schedule');
  const c = useTheme();
  const bottom = useScreenBottomPadding();
  const business = businesses.find((b) => b.id === selected) ?? businesses[0];
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const choose = (id: string) => {
    const apply = () => {
      setDirty(false);
      setView('schedule');
      setSelected(id);
    };
    if (dirty)
      Alert.alert('Discard unsaved setup changes?', 'Your appointment setup has unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: apply },
      ]);
    else apply();
  };
  const heading = (
    <FocusedOperationsHeader
      title={kind === 'appointments' ? 'Appointment schedule' : 'Requests & estimates'}
      subtitle={
        kind === 'appointments' ? 'Your day, at a glance.' : 'New inquiries, all in one place.'
      }
      businesses={businesses}
      selected={business?.id}
      onChange={choose}
      action={
        kind === 'appointments' && view === 'schedule' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={view === 'schedule' ? 'Booking setup' : 'Back to schedule'}
            onPress={() => setView(view === 'schedule' ? 'setup' : 'schedule')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.backgroundElement,
            }}
          >
            <SymbolView
              name={view === 'schedule' ? 'slider.horizontal.3' : 'calendar'}
              tintColor={c.text}
              style={{ width: 21, height: 21 }}
            />
          </Pressable>
        ) : undefined
      }
    />
  );
  if (kind === 'requests' && business)
    return (
      <PageHeaderScope>
        <ServiceRequestsContent
          key={business.id}
          businessId={business.id}
          embedded
          header={
            <>
              {view === 'setup' && (
                <NestedHeaderBack label="Back to schedule" onPress={() => setView('schedule')} />
              )}
              {heading}
              {!!error && <StateNotice kind="error" message={error} />}
            </>
          }
        />
      </PageHeaderScope>
    );
  return (
    <PageHeaderScope>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={{ flex: 1, backgroundColor: c.background }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: bottom, gap: 20 }}
        >
          {view === 'setup' && (
            <NestedHeaderBack label="Back to schedule" onPress={() => setView('schedule')} />
          )}
          {heading}
          {!!error && <StateNotice kind="error" message={error} />}
          {loading && !business ? (
            <ListLoading label="Loading your businesses" />
          ) : business ? (
            <AppointmentWorkspace
              key={business.id}
              businessId={business.id}
              businessTimezone={business.timezone || 'America/Chicago'}
              onDirtyChange={setDirty}
              view={view}
              onViewChange={setView}
            />
          ) : (
            <EmptyState
              title="No eligible businesses"
              message="Appointments and requests are available for service businesses you own."
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </PageHeaderScope>
  );
}
