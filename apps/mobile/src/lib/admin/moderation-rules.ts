import type { Decision, ModerationRecord } from './moderation-types';
export const RULE_VERSION = '1.1.0';
export interface RuleConfig {
  missingData: boolean;
  duplicates: boolean;
  spam: boolean;
  bursts: boolean;
  maxLinks: number;
  burstThreshold: number;
}
export const DEFAULT_RULES: RuleConfig = {
  missingData: true,
  duplicates: true,
  spam: true,
  bursts: true,
  maxLinks: 3,
  burstThreshold: 3,
};
export interface RuleSignal {
  rule: string;
  label: string;
  evidence: string;
  source: 'readiness' | 'submitted_content' | 'record_metadata';
  certainty: 'observed' | 'indicator';
  significance: string;
}
export interface DecisionGuidance {
  action: Decision;
  label: string;
  when: string;
  change: string;
  undo: string;
}
export interface ModerationRecommendation {
  version: string;
  signals: RuleSignal[];
  recommendation: string;
  automaticAction: false;
  suggestedAction: Decision | null;
  nextStep: string;
  why: string[];
  missingInformation: string[];
  priority: 'routine' | 'attention' | 'prompt';
  severity: { label: string; explanation: string };
  confidence: { label: string; explanation: string };
  uncertainty: string[];
  change: string;
  undo: string;
  alternatives: DecisionGuidance[];
  suggestedReason: string | null;
}
export function normalizeRules(value: Partial<RuleConfig>): RuleConfig {
  const flag = (key: 'missingData' | 'duplicates' | 'spam' | 'bursts') =>
    typeof value[key] === 'boolean' ? value[key] : DEFAULT_RULES[key];
  const bounded = (n: unknown, fallback: number, min: number, max: number) =>
    typeof n === 'number' && Number.isFinite(n)
      ? Math.max(min, Math.min(max, Math.trunc(n)))
      : fallback;
  return {
    missingData: flag('missingData'),
    duplicates: flag('duplicates'),
    spam: flag('spam'),
    bursts: flag('bursts'),
    maxLinks: bounded(value.maxLinks, 3, 1, 20),
    burstThreshold: bounded(value.burstThreshold, 3, 2, 50),
  };
}
/** Effects describe the actual SQL transition. Public feedback is distinct from private notes. */
export function decisionGuidance(record: ModerationRecord, action: Decision): DecisionGuidance {
  const business = record.kind === 'business';
  const values: Record<Decision, Omit<DecisionGuidance, 'action'>> = {
    approve: {
      label: 'Approve business',
      when: 'Required checks pass and you have checked the profile and flags.',
      change:
        'Publishes the business. Active owners receive the public reason and next step in Alerts.',
      undo: 'Reopen the business to withdraw publication. This records a reversal and alerts active owners.',
    },
    request_info: {
      label: 'Request information',
      when: 'Fields are missing or a specific listing detail needs clarification.',
      change:
        'Returns the business to draft. Active owners receive your public feedback and can correct and resubmit it.',
      undo: 'Reopen the case to put it back in the review queue. This does not approve or publish it.',
    },
    reject: {
      label: 'Return with rejection',
      when: 'You verified a specific problem and can explain the correction needed.',
      change:
        'Returns the business to draft with a rejection outcome and public correction reason. It does not ban the owner.',
      undo: 'Reopen to review it again; the owner can also revise and resubmit.',
    },
    start_review: {
      label: 'Start reviewing this report',
      when: 'You need to compare the report with the listing or gather context.',
      change:
        'Marks the report as reviewing. Content stays as it is; no violation is asserted and no outcome alert is sent yet.',
      undo: 'Reopen the report to return it to the open queue.',
    },
    resolve: {
      label: 'Resolve report',
      when: 'The reported issue was checked and the outcome can be explained.',
      change:
        'Closes the report and alerts active listing owners. This does not hide, correct or delete the reported content.',
      undo: 'Reopen the report for another review. Visibility remains unchanged.',
    },
    dismiss: {
      label: 'Dismiss report',
      when: 'After checking the content, there is no supported moderation issue.',
      change:
        record.kind === 'content_report'
          ? 'Closes the report as dismissed and alerts active listing owners. Content visibility stays unchanged.'
          : 'Closes the report as dismissed. The review keeps its current visibility; its author receives the public outcome.',
      undo: 'Reopen the report to reconsider it. Reopening does not change visibility.',
    },
    hide: {
      label: 'Hide review temporarily',
      when: 'You inspected the review and verified a reason to withhold it from public view.',
      change:
        'Hides the review, resolves this report, and alerts its author with your public reason. Nothing is deleted.',
      undo: 'Restore the review after checking it is safe to publish. This records a reversal and alerts its author.',
    },
    restore: {
      label: 'Restore review',
      when: 'You inspected the hidden review and confirmed it is safe to publish.',
      change:
        'Publishes the review again, resolves this report, and alerts its author that visibility was restored.',
      undo: 'Reopen this report, then hide the review if a new check supports it. Both steps remain in history.',
    },
    reopen: {
      label: 'Reopen case',
      when: 'New information or a mistaken decision warrants another manual review.',
      change: business
        ? record.status === 'active'
          ? 'Withdraws the business from public display and returns it to pending review. Active owners receive a reversal alert.'
          : 'Returns the business to pending review and alerts active owners. It does not publish it.'
        : 'Returns the report to the open queue and alerts the affected owner or review author. Visibility remains unchanged.',
      undo: business
        ? 'Review again and approve only if checks pass; or return to draft with feedback.'
        : 'Make a fresh report decision with a reason. Earlier decisions remain in history.',
    },
  };
  return { action, ...values[action] };
}
/** Conditional suggestions only; no enforcement, invented confidence score or automatic writes. */
export function recommend(
  record: ModerationRecord,
  rules = DEFAULT_RULES,
): ModerationRecommendation {
  const config = normalizeRules(rules),
    signals: RuleSignal[] = [];
  const missing =
    record.kind === 'business' && record.readiness
      ? record.readiness.checks.filter((c) => c.complete !== true).map((c) => c.label)
      : [];
  if (config.missingData && missing.length)
    signals.push({
      rule: 'missing_data',
      label: 'Required fields need attention',
      evidence: missing.join('; '),
      source: 'readiness',
      certainty: 'observed',
      significance:
        'These checks fail. Publication is blocked even when recommendation rules are disabled.',
    });
  if (config.duplicates && record.duplicates > 0)
    signals.push({
      rule: 'duplicate',
      label:
        record.kind === 'business'
          ? 'Possible duplicate listing'
          : 'Multiple reports about the same content',
      evidence:
        record.kind === 'business'
          ? `${record.duplicates} other listing(s) share the normalized name/city or phone.`
          : `${record.duplicates} other open report(s) concern this target. This is an allegation count.`,
      source: 'record_metadata',
      certainty: 'indicator',
      significance:
        record.kind === 'business'
          ? 'A separate branch or shared contact number may explain the match. Compare the records.'
          : 'Several allegations do not prove a violation. Inspect the content and independent evidence.',
    });
  // Content only. Accusations and low ratings are never spam evidence.
  const links = record.text.match(/https?:\/\/[^\s]+/gi) ?? [],
    phrase = record.text.match(
      /\b(guaranteed profit|click here now|crypto giveaway|buy followers)\b/i,
    )?.[0];
  if (config.spam && (links.length > config.maxLinks || phrase))
    signals.push({
      rule: 'spam_pattern',
      label: 'Promotional content needs a closer look',
      evidence: `${links.length} link(s) in submitted content${phrase ? `; phrase: "${phrase}"` : ''}. Link threshold: ${config.maxLinks}.`,
      source: 'submitted_content',
      certainty: 'indicator',
      significance:
        'This may be unrelated promotion, but legitimate content can match. Read its context before deciding.',
    });
  if (config.bursts && record.activity_count >= config.burstThreshold)
    signals.push({
      rule: 'submission_burst',
      label: 'Several submissions arrived close together',
      evidence: `${record.activity_count} submissions/reports by the same actor within 30 minutes around this submission. Threshold: ${config.burstThreshold}.`,
      source: 'record_metadata',
      certainty: 'indicator',
      significance:
        'This can be ordinary activity or spam. It is not an enforced rate limit or proof of abuse.',
    });
  const possible = signals.some((s) => s.certainty === 'indicator'),
    sensitive = record.reason === 'private_information';
  const pendingBusiness = record.kind === 'business' && record.status === 'pending_review',
    openReport = record.kind !== 'business' && ['open', 'reviewing'].includes(record.status);
  let suggestedAction: Decision | null = null,
    recommendation = 'Manual review',
    nextStep = 'Read the content and report context before choosing a decision.',
    suggestedReason: string | null = null;
  const why: string[] = [],
    uncertainty: string[] = [];
  if (pendingBusiness && missing.length) {
    suggestedAction = 'request_info';
    recommendation = 'Request information';
    nextStep = 'Ask the owner to complete the missing fields, then resubmit the business.';
    why.push(`${missing.length} required check(s) are incomplete: ${missing.join('; ')}.`);
    uncertainty.push('Missing fields do not establish that the business is unsafe or fraudulent.');
    suggestedReason = `Please complete these publication requirements and resubmit: ${missing.join('; ')}.`;
  } else if (pendingBusiness && possible) {
    suggestedAction = 'request_info';
    recommendation = 'Request clarification';
    nextStep = signals.some((s) => s.rule === 'duplicate')
      ? 'Compare matching listings and ask whether this is a separate branch or an existing listing.'
      : signals.some((s) => s.rule === 'spam_pattern')
        ? 'Ask the owner to explain the local offering and remove unrelated promotion.'
        : 'Ask whether the closely timed submissions describe separate legitimate businesses.';
    why.push(
      'The profile is technically ready, but an indicator needs clarification before publication.',
    );
    uncertainty.push(
      'Flags do not establish fraud, spam or a duplicate. Do not reject solely because a rule matched.',
    );
    suggestedReason = signals.some((s) => s.rule === 'duplicate')
      ? 'Please clarify whether this is a separate business location or an existing listing, and check the name and public contact details.'
      : signals.some((s) => s.rule === 'spam_pattern')
        ? 'Please clarify the local business offering and remove unrelated promotional links before resubmitting.'
        : 'Please clarify which separate businesses these submissions represent before resubmitting.';
  } else if (pendingBusiness && record.readiness?.ready === true) {
    suggestedAction = 'approve';
    recommendation = 'Consider approval after checking the profile';
    nextStep =
      'Check the name, contact details, location and images. If they describe a legitimate listing, approve it.';
    why.push('All required checks pass. No enabled rule matched the submitted content.');
    uncertainty.push(
      'Completeness is not identity verification; unmatched rules cannot establish that content is safe.',
    );
  } else if (pendingBusiness) {
    nextStep =
      'Refresh readiness before deciding. Approval is unavailable without a passing readiness result.';
    why.push('A reliable readiness result is unavailable.');
    uncertainty.push('Do not infer readiness from the absence of flags.');
  } else if (record.kind === 'content_report' && openReport) {
    suggestedAction = record.status === 'open' ? 'start_review' : null;
    recommendation = 'Check the reported detail';
    nextStep =
      record.reason === 'inaccurate'
        ? 'Compare the reported detail with the listing and ask the owner to correct or confirm it.'
        : 'Compare the report with the actual business, event or offering. Record what you verified before closing it.';
    why.push(
      `The report reason is "${record.reason?.replaceAll('_', ' ') ?? 'unspecified'}". The allegation needs checking.`,
    );
    uncertainty.push(
      'A report is an allegation. Closing it does not hide, correct or delete the underlying content.',
    );
  } else if (openReport && sensitive) {
    recommendation = 'Inspect the privacy allegation promptly';
    nextStep =
      'Read the actual review for exposed personal information. Hide only after confirming a privacy issue; keep private details out of the public reason.';
    why.push(
      'The reporter selected private information. This warrants a prompt check, but is not proof.',
    );
    uncertainty.push(
      'No private-information detector is configured. A person must check the claim.',
    );
  } else if (openReport && signals.some((s) => s.rule === 'spam_pattern')) {
    suggestedAction = 'hide';
    recommendation = 'Consider a reversible hide after checking the promotion';
    nextStep =
      'Read the review and links. If the promotion is unrelated to the visit or order, temporarily hide the review and explain why.';
    why.push('The review itself contains a promotional phrase or exceeds the link threshold.');
    uncertainty.push(
      'This indicator is not a confirmed violation. Relevant content should remain published.',
    );
  } else if (openReport && !possible) {
    suggestedAction = 'dismiss';
    recommendation = 'Consider dismissing after checking the report';
    nextStep =
      'Check the specific allegation. If this is ordinary service or attendance feedback without a supported moderation issue, dismiss the report.';
    why.push(
      record.text.trim()
        ? 'No configured indicator matched. A negative opinion or rating alone is not an abuse indicator.'
        : 'This is a star-only review. Text is optional for this verified-review workflow.',
    );
    uncertainty.push(
      'Unmatched rules do not disprove the report. Check factual and privacy claims before dismissing.',
    );
  } else if (openReport) {
    recommendation = 'Check the context before deciding';
    nextStep =
      'Inspect content and each metadata indicator. Keep the review published unless you verify a reason to hide it.';
    why.push(
      'Only metadata indicators matched; counts and activity do not establish a content violation.',
    );
    uncertainty.push('No automatic visibility decision is supported.');
  } else {
    recommendation = 'Review the recorded outcome';
    nextStep =
      record.kind === 'business'
        ? 'Read previous feedback. Reopen only when new information or a mistaken decision warrants another review.'
        : ['hidden', 'removed'].includes(record.content_status ?? '')
          ? 'Read the earlier reason and inspect the hidden review. Restore only after confirming it is safe to publish.'
          : 'Read the recorded outcome. Reopen only for new evidence or a mistaken decision.';
    why.push(
      'This case is not awaiting an initial decision. Preserve history when reconsidering it.',
    );
    uncertainty.push(
      'A closed case or hidden review is not proof that the earlier decision was correct.',
    );
  }
  const choices: Decision[] =
    record.kind === 'business'
      ? pendingBusiness
        ? [
            'request_info',
            'reject',
            ...(record.readiness?.ready === true ? ['approve' as const] : []),
          ]
        : ['draft', 'active'].includes(record.status)
          ? ['reopen']
          : []
      : record.kind === 'content_report'
        ? record.status === 'open'
          ? ['start_review', 'resolve', 'dismiss']
          : record.status === 'reviewing'
            ? ['resolve', 'dismiss', 'reopen']
            : ['reopen']
        : [
            ...(record.status === 'open'
              ? ['hide' as const, 'dismiss' as const]
              : ['reopen' as const]),
            ...(['hidden', 'removed'].includes(record.content_status ?? '')
              ? ['restore' as const]
              : []),
          ];
  const selected = suggestedAction ? decisionGuidance(record, suggestedAction) : null;
  return {
    version: RULE_VERSION,
    signals,
    recommendation,
    automaticAction: false,
    suggestedAction,
    nextStep,
    why,
    missingInformation: missing,
    priority:
      sensitive && openReport ? 'prompt' : missing.length || possible ? 'attention' : 'routine',
    severity: {
      label: missing.length
        ? 'Incomplete submission'
        : sensitive && openReport
          ? 'Potential privacy concern'
          : possible
            ? 'Possible issue'
            : 'No rule-confirmed issue',
      explanation: missing.length
        ? 'Required fields are missing; this is a completeness issue.'
        : sensitive && openReport
          ? 'A sensitive allegation needs inspection; it has not been verified.'
          : possible
            ? 'An indicator calls for review. No violation severity is assigned.'
            : 'No configured indicator establishes an issue; a person must still check the case.',
    },
    confidence: {
      label: missing.length ? 'Observed missing fields' : 'Limited evidence',
      explanation: missing.length
        ? 'Named checks currently fail in the database. Confidence applies only to field completeness.'
        : 'Rules and reports provide limited context. No identity verification, policy conclusion or numerical certainty is claimed.',
    },
    uncertainty,
    change:
      selected?.change ??
      'Reading this guidance changes nothing. Choose and save a manual decision to change the case.',
    undo:
      selected?.undo ??
      'Each available decision explains its reversal. Earlier decisions remain in the audit history.',
    alternatives: choices
      .filter((a) => a !== suggestedAction)
      .map((a) => decisionGuidance(record, a)),
    suggestedReason: suggestedReason ? suggestedReason.slice(0, 1000) : null,
  };
}
