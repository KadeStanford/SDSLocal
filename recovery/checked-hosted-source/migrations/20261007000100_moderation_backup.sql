-- FOLLOW-ON ONLY. Not part of the published v6 packet. Requires 001-005.
begin;
-- Existing readiness checks, unchanged except trusted worker authorization.
CREATE OR REPLACE FUNCTION public.get_business_readiness(p_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  business_record public.businesses%rowtype;
  description_ready boolean;
  category_ready boolean;
  contact_ready boolean;
  location_ready boolean;
  hours_ready boolean;
  logo_ready boolean;
  cover_ready boolean;
begin
  if not (
    public.is_business_owner(p_business_id, (select auth.uid()))
    or public.is_platform_admin()
    or coalesce(auth.role(),'')='service_role'
  ) then
    raise exception 'Owner or administrator access required' using errcode = '42501';
  end if;

  select * into business_record
  from public.businesses
  where id = p_business_id;

  if not found then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;

  description_ready := char_length(trim(business_record.description)) >= 20;
  category_ready := exists (
    select 1 from public.business_categories where business_id = p_business_id
  );
  contact_ready := coalesce(
    nullif(trim(business_record.phone), ''),
    nullif(trim(business_record.email), ''),
    nullif(trim(business_record.website_url), '')
  ) is not null;
  location_ready := case
    when business_record.business_type = 'mobile' then exists (
      select 1
      from public.business_location_stops stop
      where stop.business_id = p_business_id
        and stop.latitude between -90 and 90
        and stop.longitude between -180 and 180
        and stop.ends_at > stop.starts_at
    )
    else case business_record.service_area_type
      when 'at_location' then
        business_record.address_line_1 is not null
        and business_record.city is not null
        and business_record.region_code is not null
      when 'radius' then
        business_record.address_line_1 is not null
        and business_record.city is not null
        and business_record.region_code is not null
        and business_record.service_radius_miles is not null
      when 'cities' then cardinality(business_record.service_area_regions) > 0
      when 'statewide' then business_record.region_code is not null
      when 'custom' then nullif(trim(business_record.service_area), '') is not null
    end
  end;
  hours_ready := (
    select count(distinct day_of_week) = 7
    from public.business_hours
    where business_id = p_business_id
  );
  logo_ready := exists (
    select 1
    from public.business_photos photo
    join public.media_assets asset on asset.id = photo.media_asset_id
    where photo.business_id = p_business_id
      and photo.role = 'logo'
      and asset.status = 'ready'
  );
  cover_ready := exists (
    select 1
    from public.business_photos photo
    join public.media_assets asset on asset.id = photo.media_asset_id
    where photo.business_id = p_business_id
      and photo.role = 'cover'
      and asset.status = 'ready'
  );

  return jsonb_build_object(
    'ready', description_ready and category_ready and contact_ready and location_ready
      and hours_ready and logo_ready and cover_ready,
    'checks', jsonb_build_array(
      jsonb_build_object('key', 'description', 'label', 'Description of at least 20 characters', 'complete', description_ready),
      jsonb_build_object('key', 'category', 'label', 'At least one category', 'complete', category_ready),
      jsonb_build_object('key', 'contact', 'label', 'Phone, public email, or website', 'complete', contact_ready),
      jsonb_build_object('key', 'location', 'label', case when business_record.business_type = 'mobile' then 'At least one scheduled stop' else 'Complete location or service coverage' end, 'complete', location_ready),
      jsonb_build_object('key', 'hours', 'label', 'Hours set for all seven days', 'complete', hours_ready),
      jsonb_build_object('key', 'logo', 'label', 'Optimized logo image', 'complete', logo_ready),
      jsonb_build_object('key', 'cover', 'label', 'Optimized cover image', 'complete', cover_ready)
    )
  );
end;
$function$;

create table public.moderation_backup_policy (
  singleton boolean primary key default true check(singleton),
  mode text not null default 'dry_run' check(mode in ('off','dry_run','enabled')),
  missing_information boolean not null default true,
  promotional_reviews boolean not null default true,
  internal_flags boolean not null default true,
  version text not null default 'backup-1.0.0',
  updated_at timestamptz not null default now()
);
insert into public.moderation_backup_policy(singleton) values(true);
create table public.moderation_backup_cases (
  kind text not null, id uuid not null, fingerprint text not null,
  rule text not null, version text not null,
  audit_id bigint not null references public.platform_admin_audit_log(id),
  created_at timestamptz not null default now(),
  primary key(kind,id,fingerprint,rule,version)
);
create table public.moderation_backup_runs (
  request_id uuid primary key, result jsonb not null,
  created_at timestamptz not null default now()
);
create index moderation_backup_runs_recent on public.moderation_backup_runs(created_at desc);
alter table public.moderation_backup_policy enable row level security;
alter table public.moderation_backup_cases enable row level security;
alter table public.moderation_backup_runs enable row level security;
revoke all on public.moderation_backup_policy,public.moderation_backup_cases,public.moderation_backup_runs
  from public,anon,authenticated,service_role;

-- A semantic hash excludes status, timestamps, feedback and report allegations.
-- No submitted text or contact data is copied into the automation ledger.
create function public.moderation_backup_fingerprint(r jsonb) returns text
language sql immutable set search_path='' as $$
 select md5(jsonb_build_object('kind',r->>'kind','text',r->>'text',
   'readiness',r->'readiness','target',r->'context'->>'target_id')::text)
$$;

-- Fail closed: only a repeated promotional template with three links and no
-- other words qualifies. Quotes, warnings and descriptions retain extra words.
create function public.moderation_backup_rule(r jsonb,p_missing boolean,p_spam boolean,p_flags boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare text_body text:=lower(coalesce(r->>'text','')); urls integer; phrases integer;
  residue text; missing text[]; keys text[];
begin
  if r->>'status' not in ('open','reviewing','pending_review') then return null; end if;
  if p_missing and r->>'kind'='business' and r->>'status'='pending_review'
    and r->'readiness'->>'ready'='false'
    and jsonb_typeof(r->'readiness'->'checks')='array'
    and jsonb_array_length(r->'readiness'->'checks')=7
    and (select count(distinct c->>'key') from jsonb_array_elements(r->'readiness'->'checks') c)=7
    and not exists(select 1 from jsonb_array_elements(r->'readiness'->'checks') c
      where c->>'key' not in ('description','category','contact','location','hours','logo','cover')
      or jsonb_typeof(c->'complete') is distinct from 'boolean') then
    select array_agg(c->>'label' order by c->>'key'),array_agg(c->>'key' order by c->>'key') into missing,keys
      from jsonb_array_elements(r->'readiness'->'checks') c where c->>'complete'='false';
    if cardinality(missing)>0 then return jsonb_build_object('rule','missing_publication_fields',
      'action','request_info','evidence',jsonb_build_object('missing_keys',keys),
      'reason','Your listing needs these details before publication: '||array_to_string(missing,'; ')||
        '. It is back in draft so you can add them and resubmit. Nothing was deleted.'); end if;
  end if;
  if p_spam and r->>'kind' in ('pickup_review','event_review') and r->>'status'='open'
    and r->>'content_status'='published' then
    select count(*) into urls from regexp_matches(text_body,'https?://[^[:space:]]+','g');
    select count(*) into phrases from regexp_matches(text_body,'buy followers|crypto giveaway|guaranteed profit','g');
    residue:=regexp_replace(text_body,'https?://[^[:space:]]+','','g');
    residue:=regexp_replace(residue,'buy followers|crypto giveaway|guaranteed profit|click here now|limited offer','','g');
    if urls>=3 and phrases>=2 and residue !~ '[[:alpha:]]' then
      return jsonb_build_object('rule','review_promotion_template','action','hide',
        'evidence',jsonb_build_object('links',urls,'repeated_promotions',phrases),
        'reason','Your review was temporarily hidden because it contains repeated unrelated promotional offers and links. Nothing was deleted. A moderator can restore it if this needs another review.');
    end if;
  end if;
  if p_flags and (coalesce((r->>'duplicates')::integer,0)>0 or coalesce((r->>'activity_count')::integer,0)>=3) then
    return jsonb_build_object('rule','context_needs_review','action','flag',
      'evidence',jsonb_build_object('matches_or_other_reports',r->'duplicates','nearby_activity',r->'activity_count'),
      'reason','Check the context. Shared contacts, other reports and nearby activity can be legitimate; visibility stays unchanged.');
  end if;
  return null;
end $$;

create function public.get_moderation_backup_status() returns jsonb
language plpgsql security definer set search_path='' as $$
declare p jsonb; runs jsonb; last_run timestamptz;
begin
 if not public.is_platform_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select to_jsonb(t)||jsonb_build_object('revision',md5(to_jsonb(t)::text)) into p from public.moderation_backup_policy t;
 select coalesce(jsonb_agg(result order by created_at desc),'[]') into runs
   from (select result,created_at from public.moderation_backup_runs order by created_at desc limit 10) r;
 select max(created_at) into last_run from public.moderation_backup_runs;
 return jsonb_build_object('policy',p,'runs',runs,'handled',(select count(*) from public.moderation_backup_cases),
   'last_run_at',last_run,'worker_status',case when last_run is null then 'not_seen' when last_run>now()-interval '10 minutes' then 'recent' else 'stale' end);
end $$;

create function public.configure_moderation_backup(p_mode text,p_missing boolean,p_spam boolean,p_flags boolean,
  p_expected_revision text,p_request_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare before_p jsonb; after_p jsonb; existing public.platform_admin_audit_log%rowtype;
begin
 if not public.is_platform_admin() or auth.uid() is null then raise exception 'Administrator access required' using errcode='42501'; end if;
 if p_mode is null or p_mode not in ('off','dry_run','enabled') or p_missing is null or p_spam is null or p_flags is null
   or p_request_id is null or length(trim(coalesce(p_reason,''))) not between 10 and 1000 then
   raise exception 'Invalid backup settings' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into existing from public.platform_admin_audit_log where request_id=p_request_id;
 if found then
   if existing.actor_id is distinct from auth.uid() or existing.action<>'moderation_backup_configure'
     or existing.details->>'reason' is distinct from trim(p_reason)
     or existing.details->>'expected_revision' is distinct from p_expected_revision
     or existing.details->'after'->>'mode' is distinct from p_mode
     or existing.details->'after'->>'missing_information' is distinct from p_missing::text
     or existing.details->'after'->>'promotional_reviews' is distinct from p_spam::text
     or existing.details->'after'->>'internal_flags' is distinct from p_flags::text then
     raise exception 'Request ID already used' using errcode='22023'; end if;
   return public.get_moderation_backup_status();
 end if;
 select to_jsonb(t) into before_p from public.moderation_backup_policy t for update;
 if md5(before_p::text) is distinct from p_expected_revision then raise exception 'Backup settings changed. Refresh.' using errcode='40001'; end if;
 update public.moderation_backup_policy set mode=p_mode,missing_information=p_missing,
   promotional_reviews=p_spam,internal_flags=p_flags,updated_at=clock_timestamp();
 select to_jsonb(t) into after_p from public.moderation_backup_policy t;
 insert into public.platform_admin_audit_log(actor_id,action,request_id,details)
   values(auth.uid(),'moderation_backup_configure',p_request_id,jsonb_build_object(
     'reason',trim(p_reason),'expected_revision',p_expected_revision,'before',before_p,'after',after_p));
 return public.get_moderation_backup_status();
end $$;

-- Trusted worker entry point. The worker needs no real moderator identity.
-- p_apply=false always previews; enabled server policy is required to change data.
create function public.run_moderation_backup(p_apply boolean default false,p_request_id uuid default null,p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.moderation_backup_policy%rowtype; item record; r jsonb; after_r jsonb; rule jsonb;
  fingerprint text; audit_id bigint; review_id uuid; result jsonb; entries jsonb:='[]';
  applied integer:=0; flagged integer:=0; skipped integer:=0; scanned integer:=0; execute_actions boolean;
  last_manual jsonb; notification_state text; decision_id uuid;
begin
 if not (public.is_platform_admin() or coalesce(auth.role(),'')='service_role') then
   raise exception 'Administrator or trusted worker required' using errcode='42501'; end if;
 if p_apply is null or p_request_id is null or p_limit is null or p_limit not between 1 and 200 then
   raise exception 'Provide a request ID and batch size of 1-200' using errcode='22023'; end if;
 -- Worker retries have one stored result. Authorization is rechecked first.
 if p_apply then
   perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
   select t.result into result from public.moderation_backup_runs t where request_id=p_request_id;
   if found then
     if (result->>'batch_size')::integer is distinct from p_limit then raise exception 'Run ID already used for a different batch size' using errcode='22023'; end if;
     return result||jsonb_build_object('replayed',true);
   end if;
 end if;
 if not pg_try_advisory_xact_lock(hashtextextended('parish-moderation-backup-worker',0)) then
   return jsonb_build_object('busy',true,'entries','[]'::jsonb,'applied',0,'flagged',0); end if;
 select * into strict p from public.moderation_backup_policy for share;
 execute_actions:=p_apply and p.mode='enabled';
 if p.mode<>'off' then
 for item in select v.kind,v.id from public.admin_moderation_records v
   where v.status in ('pending_review','open','reviewing')
   and public.moderation_backup_rule(v.record,p.missing_information,p.promotional_reviews,p.internal_flags) is not null
   and not exists(select 1 from public.moderation_backup_cases c where c.kind=v.kind and c.id=v.id
     and c.fingerprint=public.moderation_backup_fingerprint(v.record) and c.version=p.version
     and c.rule=public.moderation_backup_rule(v.record,p.missing_information,p.promotional_reviews,p.internal_flags)->>'rule')
   order by v.created_at,v.kind,v.id limit p_limit
 loop
   scanned:=scanned+1;
   -- Same row-lock order as the checked manual endpoint. Re-read after locking.
   if item.kind='business' then
     perform 1 from public.businesses where id=item.id for update;
   elsif item.kind='content_report' then
     perform 1 from public.content_reports where id=item.id for update;
   elsif item.kind='pickup_review' then
     select t.review_id into review_id from public.pickup_order_review_reports t where t.id=item.id for update;
     perform 1 from public.pickup_order_reviews where id=review_id for update;
   else
     select t.review_id into review_id from public.verified_event_review_reports t where t.id=item.id for update;
     perform 1 from public.verified_event_reviews where id=review_id for update;
   end if;
   select record into r from public.admin_moderation_records where kind=item.kind and id=item.id;
   rule:=public.moderation_backup_rule(r,p.missing_information,p.promotional_reviews,p.internal_flags);
   if rule is null then continue; end if;
   fingerprint:=public.moderation_backup_fingerprint(r);
   -- Manual decisions take precedence, including reversal through another report
   -- about the same review. A materially edited submission may be checked again.
   select a.details->'after' into last_manual from public.platform_admin_audit_log a
     where a.action like 'moderation_%' and a.details->'automation' is null
     and a.target_type=item.kind and (a.target_id=item.id or
       (item.kind in ('pickup_review','event_review') and a.details->'after'->'context'->>'target_id'=r->'context'->>'target_id'))
     order by a.id desc limit 1;
   if last_manual is not null and public.moderation_backup_fingerprint(last_manual)=fingerprint then
     skipped:=skipped+1; continue; end if;
   last_manual:=null;
   entries:=entries||jsonb_build_array(jsonb_build_object('kind',item.kind,'id',item.id,
     'rule',rule->>'rule','action',rule->>'action','reason',rule->>'reason','evidence',rule->'evidence',
     'applied',execute_actions));
   if not execute_actions then continue; end if;
   if rule->>'action'='request_info' then
     -- Pending->draft is already permitted by the guard. Approved/suspended
     -- timestamps are unchanged; this helper never changes an active listing.
     update public.businesses set status='draft',reviewed_at=now(),reviewed_by=null,
       review_feedback=rule->>'reason' where id=item.id and status='pending_review';
   elsif rule->>'action'='hide' and item.kind='pickup_review' then
     update public.pickup_order_reviews set moderation_status='hidden',moderated_at=now(),moderated_by=null where id=review_id;
     update public.pickup_order_review_reports set status='resolved',resolution_note=rule->>'reason',resolved_at=now(),resolved_by=null where id=item.id;
     insert into public.pickup_order_review_events(review_id,order_id,actor_id,event_type,event_data)
       select id,order_id,null,'moderated',jsonb_build_object('action','hide','automation',p.version,'rule',rule->>'rule')
       from public.pickup_order_reviews where id=review_id;
   elsif rule->>'action'='hide' and item.kind='event_review' then
     update public.verified_event_reviews set moderation_status='hidden',moderated_at=now(),moderated_by=null where id=review_id;
     update public.verified_event_review_reports set status='resolved',resolution_note=rule->>'reason',resolved_at=now(),resolved_by=null where id=item.id;
     insert into public.verified_event_review_events(review_id,event_id,actor_id,event_type,event_data)
       select id,event_id,null,'moderated',jsonb_build_object('action','hide','automation',p.version,'rule',rule->>'rule')
       from public.verified_event_reviews where id=review_id;
   end if;
   select record into after_r from public.admin_moderation_records where kind=item.kind and id=item.id;
   notification_state:=case when rule->>'action'='flag' then 'not_an_outcome'
     when r->'context'->>'outcome_recipient'='no_account' then 'no_account' else 'inbox_available' end;
   decision_id:=md5(p.version||item.kind||item.id::text||fingerprint||(rule->>'rule'))::uuid;
   insert into public.platform_admin_audit_log(actor_id,action,target_type,target_id,request_id,details)
     values(null,case when rule->>'action'='flag' then 'moderation_backup_flag' else 'moderation_'||(rule->>'action') end,
       item.kind,item.id,decision_id,jsonb_build_object('reason',rule->>'reason',
       'before',r,'after',after_r,'notification_state',notification_state,
       'automation',jsonb_build_object('version',p.version,'rule',rule->>'rule','evidence',rule->'evidence')))
     returning id into audit_id;
   insert into public.moderation_backup_cases(kind,id,fingerprint,rule,version,audit_id)
     values(item.kind,item.id,fingerprint,rule->>'rule',p.version,audit_id);
   if rule->>'action'='flag' then flagged:=flagged+1;
   else perform public.queue_moderation_outcomes(audit_id); applied:=applied+1; end if;
 end loop;
 end if;
 result:=jsonb_build_object('request_id',p_request_id,'mode',p.mode,'dry_run',not execute_actions,
   'version',p.version,'batch_size',p_limit,'scanned',scanned,'applied',applied,'flagged',flagged,'manual_overrides',skipped,'entries',entries);
 if execute_actions then insert into public.moderation_backup_runs(request_id,result) values(p_request_id,result); end if;
 return result;
end $$;

-- Delete the content-derived ledger token when its source case is deleted.
create function public.cleanup_moderation_backup_case() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.moderation_backup_cases where kind=tg_argv[0] and id=old.id;
 return old;
end $$;
create trigger cleanup_backup_business after delete on public.businesses for each row execute function public.cleanup_moderation_backup_case('business');
create trigger cleanup_backup_content_report after delete on public.content_reports for each row execute function public.cleanup_moderation_backup_case('content_report');
create trigger cleanup_backup_pickup_report after delete on public.pickup_order_review_reports for each row execute function public.cleanup_moderation_backup_case('pickup_review');
create trigger cleanup_backup_event_report after delete on public.verified_event_review_reports for each row execute function public.cleanup_moderation_backup_case('event_review');

revoke all on function public.moderation_backup_fingerprint(jsonb),public.moderation_backup_rule(jsonb,boolean,boolean,boolean),
 public.cleanup_moderation_backup_case(),public.get_moderation_backup_status(),
 public.configure_moderation_backup(text,boolean,boolean,boolean,text,uuid,text),public.run_moderation_backup(boolean,uuid,integer)
 from public,anon,authenticated,service_role;
grant execute on function public.get_moderation_backup_status(),
 public.configure_moderation_backup(text,boolean,boolean,boolean,text,uuid,text) to authenticated;
grant execute on function public.run_moderation_backup(boolean,uuid,integer) to authenticated,service_role;
commit;
notify pgrst,'reload schema';
