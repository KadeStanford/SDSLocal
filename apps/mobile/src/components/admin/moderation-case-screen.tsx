import {caseBrief} from '@/lib/admin/case-brief';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useMobileModerationCase } from '@/hooks/use-mobile-moderation';
import { useAuth } from '@/providers/auth-provider';
import {
  DECISION_LABELS,
  availableDecisions,
  type Decision,
  type QueueKind,
} from '@/lib/admin/moderation-types';
import {
  DEFAULT_RULES,
  decisionGuidance,
  recommend,
  type RuleConfig,
} from '@/lib/admin/moderation-rules';
import {
  AdminAccessGate,
  AdminFrame,
  AdminSection,
  AdminText,
  formatAdminDate,
} from './admin-frame';
import { adminStyles as s } from './mobile-admin.styles';
const RULE_OPTIONS = [
  ['missingData', 'Missing required fields'],
  ['duplicates', 'Possible duplicates'],
  ['spam', 'Promotional content patterns'],
  ['bursts', 'Closely timed submissions'],
] as const;
export function MobileModerationCaseScreen({
  kind,
  id,
}: {
  kind: QueueKind | null;
  id: string | null;
}) {
  const { session } = useAuth();
  return (
    <ScopedModerationCaseScreen
      key={`${session?.user.id ?? 'signed-out'}:${kind ?? 'invalid'}:${id ?? 'invalid'}`}
      kind={kind}
      id={id}
    />
  );
}

function ScopedModerationCaseScreen({ kind, id }: { kind: QueueKind | null; id: string | null }) {
  const model = useMobileModerationCase(kind, id);
  const blocked = ['signed_out', 'denied', 'error'].includes(model.access.status);
  return (
    <ModerationCaseForm
      key={`${blocked ? 'blocked' : 'current'}:${model.result?.audit_id ?? 'draft'}`}
      kind={kind}
      id={id}
      model={model}
    />
  );
}

function ModerationCaseForm({
  kind,
  id,
  model,
}: {
  kind: QueueKind | null;
  id: string | null;
  model: ReturnType<typeof useMobileModerationCase>;
}) {
  const [action, setAction] = useState<Decision | null>(null),
    [reason, setReason] = useState(''),
    [privateNote, setPrivateNote] = useState('');
  const [confirming, setConfirming] = useState(false),
    [showSettings, setShowSettings] = useState(false);
  const [rules, setRules] = useState<RuleConfig>({ ...DEFAULT_RULES });
  const record = model.record;
  const recommendation = useMemo(() => (record ? recommend(record, rules) : null), [record, rules]);
  const brief = record ? caseBrief(record,rules) : null;
  const guidance = record && action ? decisionGuidance(record, action) : null;
  const locked = model.busy || model.pending !== null;
  const allowed = record ? availableDecisions(record) : [];
  const canReview =
    !!action &&
    allowed.includes(action) &&
    reason.trim().length >= 10 &&
    reason.length <= 1000 &&
    privateNote.length <= 2000 &&
    !locked &&
    (action !== 'approve' || record?.readiness?.ready === true);
  const back = () => router.replace('/admin-moderation' as Href);
  return (
    <AdminFrame title="Review case" backLabel="queues" onBack={back}>
      <AdminAccessGate access={model.access}>
        {!kind || !id ? (
          <AdminSection title="Case link unavailable">
            <AdminText>
              This case link is invalid. Return to the queues and select a case.
            </AdminText>
          </AdminSection>
        ) : (
          <>
            {model.loading && (
              <View style={s.section}>
                <ActivityIndicator />
                <AdminText>Loading this case…</AdminText>
              </View>
            )}
            {model.result && (
              <View style={s.notice}>
                <ThemedText accessibilityRole="alert" style={s.title}>
                  {model.result.replayed ? 'Earlier decision confirmed' : 'Decision saved'}
                </ThemedText>
                <AdminText>Audit entry {model.result.audit_id} recorded.</AdminText>
                <AdminText>
                  {model.result.notification_state === 'inbox_available'
                    ? 'The public outcome is available to the affected account in Alerts.'
                    : model.result.notification_state === 'no_account'
                      ? 'This review has no linked account to receive an inbox outcome.'
                      : 'This review step does not send an outcome alert.'}
                </AdminText>
              </View>
            )}
            {model.error && (
              <View style={s.error}>
                <ThemedText accessibilityRole="alert" style={s.body}>
                  {model.error}
                </ThemedText>
              </View>
            )}
            {model.pending && (
              <AdminSection title="Result not yet confirmed">
                <AdminText>
                  Your earlier decision is kept unchanged: {DECISION_LABELS[model.pending.action]}.
                </AdminText>
                <AdminText>
                  Retry sends the same decision and request ID. You can also refresh history to
                  inspect the current case.
                </AdminText>
                <AppButton
                  label="Retry same decision"
                  loading={model.busy}
                  onPress={() => void model.save(null, '', '', true)}
                />
              </AdminSection>
            )}
            {!model.loading && (
              <AppButton
                label={model.pending ? 'Refresh case and history' : 'Refresh case'}
                variant="secondary"
                disabled={model.busy}
                onPress={() => void model.refresh()}
              />
            )}
            {record && (
              <>
                <AdminSection title={record.title}>
                  <AdminText>{record.subtitle}</AdminText>
                  <AdminText muted>
                    {record.status.replaceAll('_', ' ')} · {formatAdminDate(record.created_at)}
                  </AdminText>
                  {brief&&<><AdminText>{brief.happened}</AdminText>{brief.backup&&<AdminText>{brief.backup}</AdminText>}</>}
                  <AdminText>{record.text || 'No written review. A star rating alone is allowed.'}</AdminText>
                  {Boolean(record.context.address) && (
                    <AdminText muted>{record.context.address}</AdminText>
                  )}
                  {showSettings && Boolean(record.context.phone) && (
                    <AdminText>Phone: {record.context.phone}</AdminText>
                  )}
                  {showSettings && Boolean(record.context.email) && (
                    <AdminText>Email: {record.context.email}</AdminText>
                  )}
                  {showSettings && Boolean(record.context.website) && (
                    <AdminText>Website: {record.context.website}</AdminText>
                  )}
                  {record.context.rating !== undefined && (
                    <AdminText>Rating: {record.context.rating}/5</AdminText>
                  )}
                </AdminSection>
                {Boolean(record.reason || record.details) && (
                  <AdminSection title="Report context">
                    <AdminText>
                      {record.reason?.replaceAll('_', ' ') ?? 'Reason unspecified'}
                    </AdminText>
                    {Boolean(record.details) && <AdminText>{record.details}</AdminText>}
                    <AdminText muted>
                      A report is an allegation. Compare it with the actual content before deciding.
                    </AdminText>
                  </AdminSection>
                )}
                {showSettings && record.readiness && (
                  <AdminSection title="Publication checks">
                    <AdminText>
                      {record.readiness.ready
                        ? 'Required checks pass. Review the profile before approving.'
                        : 'Required information needs attention.'}
                    </AdminText>
                    {record.readiness.checks.map((check) => (
                      <AdminText key={check.key}>
                        {check.complete === true
                          ? 'Complete'
                          : check.complete === null
                            ? 'Unconfirmed'
                            : 'Missing'}{' '}
                        · {check.label}
                      </AdminText>
                    ))}
                  </AdminSection>
                )}
                {recommendation && brief && (
                  <AdminSection title="What to do next">
                    <AdminText>{brief.nextStep}</AdminText>
                    <AdminText>Why: {brief.why}</AdminText>
                    {brief.evidence.map(text=><AdminText key={text}>{text}</AdminText>)}
                    <AdminText>What changes: {brief.effect}</AdminText>
                    <AdminText muted>How to undo it: {brief.undo}</AdminText>
                    {recommendation.suggestedAction && allowed.includes(recommendation.suggestedAction) && (
                      <AppButton label="Use suggested action" variant="secondary" disabled={locked} onPress={()=>{
                        setAction(recommendation.suggestedAction);
                        if(!reason.trim()&&recommendation.suggestedReason)setReason(recommendation.suggestedReason);
                        setConfirming(false);
                      }}/>
                    )}
                    <AdminText muted>Suggestions do not save decisions. Review the content and confirm your choice below.</AdminText>
                    <AppButton label={showSettings?'Hide extra evidence and settings':'More evidence and suggestion settings'} variant="secondary" onPress={()=>setShowSettings(x=>!x)}/>
                    {showSettings&&<>
                      {recommendation.signals.map(signal=><View key={signal.rule} style={s.separator}><AdminText>{signal.label}</AdminText><AdminText>{signal.evidence}</AdminText><AdminText muted>{signal.significance}</AdminText></View>)}
                      {recommendation.uncertainty.map(text=><AdminText key={text} muted>{text}</AdminText>)}
                      <AdminText muted>These settings change suggestions on this screen. Server backup settings are in the queue screen.</AdminText>
                      {RULE_OPTIONS.map(([key,label])=><View style={s.row} key={key}><Switch accessibilityLabel={label} value={rules[key]} onValueChange={value=>setRules(before=>({...before,[key]:value}))}/><AdminText>{label}</AdminText></View>)}
                    </>}
                  </AdminSection>
                )}
                <AdminSection title="Choose your decision">
                  {allowed.length === 0 && (
                    <AdminText>No decision is available for this case.</AdminText>
                  )}
                  {allowed.map((choice) => {
                    const disabled =
                      locked || (choice === 'approve' && record.readiness?.ready !== true);
                    return (
                      <Pressable
                        key={choice}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: action === choice, disabled }}
                        disabled={disabled}
                        onPress={() => {
                          setAction(choice);
                          setConfirming(false);
                        }}
                        style={[s.choice, action === choice && s.selected, disabled && s.disabled]}
                      >
                        <AdminText>{DECISION_LABELS[choice]}</AdminText>
                      </Pressable>
                    );
                  })}
                  {guidance && (
                    <View style={s.notice}>
                      <AdminText>{guidance.when}</AdminText>
                      <AdminText>{guidance.change}</AdminText>
                      <AdminText muted>To reverse: {guidance.undo}</AdminText>
                    </View>
                  )}
                  <ThemedText style={s.title}>Public reason</ThemedText>
                  <AdminText muted>
                    This feedback appears in the affected account&apos;s outcome when an alert is
                    sent. Keep personal or sensitive evidence in the private note.
                  </AdminText>
                  <TextInput
                    accessibilityLabel="Public reason"
                    multiline
                    value={reason}
                    onChangeText={(value) => {
                      setReason(value);
                      setConfirming(false);
                    }}
                    maxLength={1000}
                    editable={!locked}
                    style={[s.input, s.multiline]}
                  />
                  <AdminText muted>
                    {reason.trim().length}/1000 characters · at least 10 required
                  </AdminText>
                  <ThemedText style={s.title}>Private admin note (optional)</ThemedText>
                  <AdminText muted>
                    Visible only in administrator history. Excluded from the public outcome.
                  </AdminText>
                  <TextInput
                    accessibilityLabel="Private admin note"
                    multiline
                    value={privateNote}
                    onChangeText={(value) => {
                      setPrivateNote(value);
                      setConfirming(false);
                    }}
                    maxLength={2000}
                    editable={!locked}
                    style={[s.input, s.multiline]}
                  />
                  {!confirming ? (
                    <AppButton
                      label="Review decision"
                      disabled={!canReview}
                      onPress={() => setConfirming(true)}
                    />
                  ) : (
                    <View style={s.notice}>
                      <ThemedText accessibilityRole="header" style={s.title}>
                        Confirm {action ? DECISION_LABELS[action].toLowerCase() : 'decision'}
                      </ThemedText>
                      <AdminText>{guidance?.change}</AdminText>
                      <AdminText>Public reason: {reason.trim()}</AdminText>
                      {privateNote.trim().length > 0 && (
                        <AdminText>Private note: {privateNote.trim()}</AdminText>
                      )}
                      <AppButton
                        label={`Confirm ${action ? DECISION_LABELS[action].toLowerCase() : 'decision'}`}
                        disabled={!canReview}
                        loading={model.busy}
                        onPress={() => void model.save(action, reason, privateNote)}
                      />
                      <AppButton
                        label="Keep editing"
                        variant="secondary"
                        disabled={model.busy}
                        onPress={() => setConfirming(false)}
                      />
                    </View>
                  )}
                </AdminSection>
                <AdminSection title="Decision history">
                  {record.history?.length ? (
                    record.history.map((entry) => (
                      <View key={entry.id} style={s.separator}>
                        <ThemedText style={s.title}>{entry.action.replaceAll('_', ' ')}</ThemedText>
                        <AdminText muted>
                          {formatAdminDate(entry.created_at)} · {entry.actor}
                        </AdminText>
                        {Boolean(entry.details.reason) && (
                          <AdminText>Public reason: {entry.details.reason}</AdminText>
                        )}
                        {Boolean(entry.details.private_note) && (
                          <AdminText>Private admin note: {entry.details.private_note}</AdminText>
                        )}
                        {entry.details.before?.status && entry.details.after?.status && (
                          <AdminText muted>
                            {entry.details.before.status.replaceAll('_', ' ')} →{' '}
                            {entry.details.after.status.replaceAll('_', ' ')}
                          </AdminText>
                        )}
                      </View>
                    ))
                  ) : (
                    <AdminText>No earlier decisions are recorded.</AdminText>
                  )}
                </AdminSection>
              </>
            )}
          </>
        )}
      </AdminAccessGate>
    </AdminFrame>
  );
}
