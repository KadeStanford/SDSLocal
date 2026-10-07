-- TEST ONLY: malformed legacy/imported state, deliberately bypasses normal submission.
-- The default demo never executes this file. Normal submission refuses these fields.
do $$ begin
  if current_setting('parish.fixture_runtime',true) is distinct from 'synthetic-memory-only' then
    raise exception 'Adversarial fixtures require the isolated memory-only test harness';
  end if;
end $$;
update public.businesses set status='draft',description='Bike repair.',phone=null,email=null,address_line_1=null
  where id='b0000000-0000-4000-8000-000000000002';
delete from public.business_hours where business_id='b0000000-0000-4000-8000-000000000002';
delete from public.business_photos where business_id='b0000000-0000-4000-8000-000000000002';
delete from public.media_assets where business_id='b0000000-0000-4000-8000-000000000002';
-- Privileged test-only import, to verify the moderator also rechecks readiness.
update public.businesses set status='pending_review',submitted_at=now()-interval '2 days'
  where id='b0000000-0000-4000-8000-000000000002';
