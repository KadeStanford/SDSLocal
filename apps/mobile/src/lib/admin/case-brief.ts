import {recommend, type RuleConfig} from './moderation-rules';
import type {ModerationRecord} from './moderation-types';
export interface CaseBrief {
  happened: string; evidence: string[]; nextStep: string; why: string;
  effect: string; undo: string; backup: string | null;
}
/** Display contract shared with web/native and visual owner. No new policy. */
export function caseBrief(record:ModerationRecord,rules?:RuleConfig):CaseBrief {
  const guidance=recommend(record,rules);
  const latest=record.history?.find(x=>x.details.automation);
  const happened=record.kind==='business'
    ? record.status==='pending_review'?'A business is waiting to be published.':record.status==='draft'?'This business is back in draft for changes.':'This business has already been reviewed.'
    : `Someone reported ${record.kind==='content_report'?'a listing':'a review'}${record.reason?` for ${record.reason.replaceAll('_',' ')}`:''}. The report is a claim to check.`;
  const evidence=record.kind==='business'
    ? record.readiness?.checks.filter(x=>x.complete===false).map(x=>`Missing: ${x.label}`)??[]
    : [record.text?.trim()?'The submitted content is shown below.':'There is no written review. A star rating alone is allowed.',
       ...(record.context.rating?[`Rating: ${record.context.rating} out of 5. A low rating is not a reason to hide a review.`]:[])];
  if(record.duplicates>0)evidence.push(record.kind==='business'?'Another listing shares its name or phone. It may be a legitimate branch.':'Other people reported this content. That does not prove a violation.');
  return {happened,evidence:evidence.length?evidence.slice(0,3):[record.readiness?.ready===true?'Required publication details are present. Check that they make sense.':'Publication checks are incomplete or unavailable. Review them before approval.'],
    nextStep:guidance.nextStep,why:guidance.why[0]??'Check the submitted content before deciding.',
    effect:guidance.change,undo:guidance.undo,
    backup:latest?`Parish Pass backup previously ${latest.action==='moderation_hide'?'temporarily hid this review':latest.action==='moderation_request_info'?'returned this listing to draft':'flagged this case for you'}. Current state: ${record.content_status??record.status}. You can review and reverse its decision.`:null};
}
