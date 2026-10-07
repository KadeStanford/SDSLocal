-- Explicit API contract, exercised against actual PostgreSQL ACLs.
begin;
create temporary table execute_contract(signature text, client_allowed boolean);
insert into execute_contract values
  ('public.is_business_owner(uuid,uuid)',true),
  ('public.create_business_with_owner(text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,text,double precision,double precision,text,text)',true),
  ('public.finalize_business_media(uuid,uuid,uuid,text,text,jsonb)',false),
  ('public.create_business_with_owner_v2(text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,public.service_area_type,text[],smallint,text,double precision,double precision,text,text)',true),
  ('public.update_business_details(uuid,text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,public.service_area_type,text[],smallint,text,text,text)',true),
  ('public.update_business_details_v2(uuid,text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,public.service_area_type,text[],smallint,text,text,text,public.page_theme,text,text)',true),
  ('public.is_platform_admin()',true),
  ('public.get_business_readiness(uuid)',true),
  ('public.submit_business_for_review(uuid)',true),
  ('public.approve_business(uuid)',true),
  ('public.reject_business(uuid,text)',true),
  ('public.move_offering_section(uuid,uuid,text)',true),
  ('public.move_offering_item(uuid,uuid,text)',true),
  ('public.finalize_offering_media(uuid,uuid,uuid,uuid,text,jsonb)',false),
  ('public.moderation_request_user_id()',false),
  ('public.finalize_event_media(uuid,uuid,uuid,uuid,text,jsonb)',false),
  ('public.get_loyalty_wallet()',true),
  ('public.get_loyalty_membership(uuid)',true),
  ('public.join_loyalty_program(uuid)',true),
  ('public.leave_loyalty_program(uuid)',true),
  ('public.list_business_loyalty_members(uuid)',true),
  ('public.list_business_loyalty_transactions(uuid,integer)',true),
  ('public.list_business_staff(uuid)',true),
  ('public.process_loyalty_action(uuid,uuid,uuid,text,uuid)',false),
  ('public.reverse_loyalty_stamp(uuid,uuid,text)',true),
  ('public.add_business_staff(uuid,text)',true),
  ('public.remove_business_staff(uuid,uuid)',true),
  ('public.notification_enabled(uuid,uuid,text)',false),
  ('public.register_push_token(text,text,text)',true),
  ('public.deactivate_push_tokens()',true),
  ('public.set_notification_preference(uuid,text,boolean)',true),
  ('public.get_notification_settings()',true),
  ('public.claim_notification_deliveries(integer)',false),
  ('public.finalize_event_gallery_media(uuid,uuid,uuid,uuid,text,text,smallint,jsonb)',false),
  ('public.send_business_update(uuid,text,text,text,timestamptz)',true),
  ('public.claim_media_cleanup(integer)',false),
  ('public.get_loyalty_wallet_v2()',true),
  ('public.list_business_loyalty_members_v2(uuid)',true),
  ('public.process_loyalty_points_earn(uuid,uuid,uuid,integer,uuid)',false),
  ('public.list_business_scan_log(uuid,timestamptz,timestamptz,integer)',true),
  ('public.get_business_scan_stats(uuid,timestamptz,timestamptz)',true),
  ('public.create_business_staff_invite(uuid,text)',true),
  ('public.list_business_staff_invites(uuid)',true),
  ('public.revoke_business_staff_invite(uuid)',true),
  ('public.accept_business_staff_invite(text)',true),
  ('public.get_platform_admin_overview()',true),
  ('public.list_platform_admin_audit(integer)',true),
  ('public.list_platform_reports(public.report_status)',true),
  ('public.resolve_platform_report(uuid,public.report_status,text)',true),
  ('public.get_account_deletion_impact(uuid)',false),
  ('public.begin_account_deletion(uuid)',false),
  ('public.set_account_deletion_storage_targets(uuid,uuid,jsonb)',false),
  ('public.execute_account_deletion(uuid,uuid)',false),
  ('public.finish_account_deletion_cleanup(uuid,text)',false),
  ('public.claim_account_deletion_cleanup(integer)',false),
  ('public.get_nearby_alert_preferences()',true),
  ('public.set_nearby_alert_preferences(boolean,integer)',true),
  ('public.set_nearby_business_alert_preference(uuid,boolean)',true),
  ('public.get_nearby_alert_stops()',true),
  ('public.is_business_page_address_available(text)',true),
  ('public.create_business_with_owner_v3(uuid,text,text,boolean,public.business_type,text,smallint[],text,text,text,text,text,public.service_area_type,text[],smallint,text)',true),
  ('public.billing_entitlement_is_active(text,timestamptz)',true),
  ('public.get_my_listing_billing()',true),
  ('public.assign_my_business_listing(uuid)',true),
  ('public.apply_listing_subscription_event(text,text,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,jsonb)',false),
  ('public.square_queue_counts(uuid)',false),
  ('public.square_operator_businesses(uuid)',false),
  ('public.order_notification_preference(boolean)',true),
  ('public.pickup_notification_access(uuid,uuid,text)',true),
  ('public.pickup_notification_sendable(uuid)',false),
  ('public.claim_pickup_notifications(integer)',false),
  ('public.square_confirm_pickup(uuid,uuid,uuid,text)',false),
  ('public.square_redeem_checkout_reward(uuid,uuid,uuid,jsonb)',false),
  ('public.set_notification_delivery_state(uuid,text,timestamptz,text,jsonb,timestamptz)',false),
  ('public.stripe_consume_onboarding_state(text)',false),
  ('public.reserve_business_media_upload(uuid,uuid,uuid,text,uuid)',false),
  ('public.release_business_media_upload(uuid,uuid,uuid)',false),
  ('public.finalize_reserved_business_media_upload(uuid,uuid,uuid,text,uuid,text,text,smallint,jsonb)',false),
  ('public.enforce_media_upload_reserved_quota()',false),
  ('public.claim_media_object_cleanup(integer)',false),
  ('public.finish_media_object_cleanup(uuid,boolean)',false),
  ('public.create_business_media_staging_intent(uuid,uuid,uuid,text,uuid)',false),
  ('public.can_insert_business_media_staging_object(text,jsonb)',true),
  ('public.release_business_media_staging_intent(uuid,uuid,uuid)',false),
  ('public.finish_business_media_staging_cleanup(uuid,uuid,uuid,boolean)',false),
  ('public.enqueue_expired_media_staging_objects(integer)',false),
  ('public.media_storage_usage_summary()',false),
  ('public.update_service_request_status(uuid,text)',true),
  ('public.cancel_service_request(uuid)',true),
  ('public.get_business_event_rsvp_counts(uuid)',true),
  ('public.set_event_rsvp(uuid,boolean)',true),
  ('public.service_request_notification_access(uuid,uuid)',true),
  ('public.service_request_notification_sendable(uuid)',false),
  ('public.report_pickup_order_review(uuid,text,text)',true),
  ('public.list_pickup_review_reports()',true),
  ('public.resolve_pickup_review_report(uuid,text,text)',true),
  ('public.save_appointment_setup(uuid,uuid,jsonb)',false),
  ('public.reserve_appointment_slot(uuid,uuid,uuid,timestamptz,uuid,text,text,text,text,text,uuid,text)',false),
  ('public.appointment_payment_lease(uuid,uuid)',false),
  ('public.resolve_appointment_payment_hold(uuid,boolean)',false),
  ('public.apply_appointment_provider_payment(uuid,text,text,text)',false),
  ('public.transition_appointment(uuid,uuid,uuid,text,text,integer)',false),
  ('public.reschedule_appointment_slot(uuid,uuid,uuid,text,timestamptz,uuid,uuid,text,integer)',false),
  ('public.appointment_refund_lease(uuid,uuid,uuid)',false),
  ('public.apply_appointment_provider_refund(uuid,text,text,uuid,integer,text,text)',false),
  ('public.record_appointment_external_reimbursement(uuid,uuid,uuid,integer)',false),
  ('public.set_event_rsvp_group(uuid,boolean,integer)',true),
  ('public.get_business_event_rsvp_attendees(uuid)',true),
  ('public.set_event_rsvp_check_in(uuid,boolean)',true),
  ('public.report_verified_event_review(uuid,text,text)',true),
  ('public.settle_pickup_loyalty(uuid)',false),
  ('public.apply_appointment_dispute(uuid,text,text,text)',false),
  ('public.prepare_appointment_review_refund(uuid,uuid,integer)',false),
  ('public.stripe_webhook_claim(text,uuid)',false),
  ('public.get_my_business_subscription_features()',true),
  ('public.get_business_reviews(uuid)',true),
  ('public.reply_to_business_review(uuid,uuid,text,text)',true),
  ('public.business_listing_billing_enabled_for_current_user()',true),
  ('public.save_service_request_form(uuid,integer,jsonb)',true),
  ('public.submit_service_request(uuid,uuid,text,uuid,text,integer,jsonb)',true),
  ('public.business_feature_snapshot(uuid)',false),
  ('public.get_business_feature_access(uuid)',true),
  ('public.assert_business_feature(uuid,text)',false),
  ('public.business_allows_obligation_recovery(uuid)',false);
do $$
declare contract record; proc regprocedure;
begin
  for contract in select * from execute_contract loop
    proc := to_regprocedure(contract.signature);
    if proc is null then raise exception 'Missing RPC: %',contract.signature; end if;
    if has_function_privilege('anon',proc,'execute') then raise exception 'Anonymous RPC leak: %',proc; end if;
    if has_function_privilege('authenticated',proc,'execute') is distinct from contract.client_allowed then
      raise exception 'Authenticated RPC contract: %',proc;
    end if;
    if contract.signature = 'public.moderation_request_user_id()' then
      if not has_function_privilege('sds_business_moderator',proc,'execute')
        or has_function_privilege('service_role',proc,'execute') then
        raise exception 'Dedicated moderation helper role contract: %',proc;
      end if;
    elsif not contract.client_allowed and not has_function_privilege('service_role',proc,'execute') then
      raise exception 'Server lost access to %',proc;
    end if;
  end loop;
end $$;
create function public.verification_default_execute_fixture() returns integer language sql as 'select 1';
do $$ begin
  if has_function_privilege('anon','public.verification_default_execute_fixture()','execute')
    or has_function_privilege('authenticated','public.verification_default_execute_fixture()','execute') then
    raise exception 'New RPCs are exposed by default';
  end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform public.execute_account_deletion(null,null);
    raise exception 'Anonymous account-deletion execution allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin
    perform public.square_redeem_checkout_reward(null,null,null,null);
    raise exception 'Client reward execution allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
