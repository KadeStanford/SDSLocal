begin;

-- Explicit API grants override Supabase installations that grant EXECUTE to
-- anon/authenticated by default. Revoking PUBLIC alone does not remove those
-- direct grants. This does not change any hosted migration history.
revoke all on function public.is_business_owner(uuid,uuid) from public, anon;
revoke all on function public.create_business_with_owner(text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,text,double precision,double precision,text,text) from public, anon;
revoke all on function public.finalize_business_media(uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.create_business_with_owner_v2(text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,public.service_area_type,text[],smallint,text,double precision,double precision,text,text) from public, anon;
revoke all on function public.update_business_details(uuid,text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,public.service_area_type,text[],smallint,text,text,text) from public, anon;
revoke all on function public.update_business_details_v2(uuid,text,text,public.business_type,text,smallint[],jsonb,text,text,text,text,text,text,text,text,text,public.service_area_type,text[],smallint,text,text,text,public.page_theme,text,text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.get_business_readiness(uuid) from public, anon;
revoke all on function public.submit_business_for_review(uuid) from public, anon;
-- This function has a separate owner; its owner-granted ACL must be revoked
-- while acting as that owner. Preserve any pre-existing role membership.
do $$ begin
  perform set_config('sds.had_moderator_membership',
    pg_has_role(current_user,'sds_business_moderator','SET')::text,true);
  if not pg_has_role(current_user,'sds_business_moderator','SET') then
    execute format('grant sds_business_moderator to %I with set true',current_user);
  end if;
end $$;
set local role sds_business_moderator;
revoke all on function public.approve_business(uuid) from public, anon;
grant execute on function public.approve_business(uuid) to authenticated;
reset role;
do $$ begin
  if current_setting('sds.had_moderator_membership') = 'false' then
    execute format('revoke sds_business_moderator from %I',current_user);
  end if;
end $$;
revoke all on function public.reject_business(uuid,text) from public, anon;
revoke all on function public.move_offering_section(uuid,uuid,text) from public, anon;
revoke all on function public.move_offering_item(uuid,uuid,text) from public, anon;
revoke all on function public.finalize_offering_media(uuid,uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
-- This helper belongs to the dedicated moderator role, not the API server role.
revoke all on function public.moderation_request_user_id() from public, anon, authenticated, service_role;
revoke all on function public.finalize_event_media(uuid,uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.get_loyalty_wallet() from public, anon;
revoke all on function public.get_loyalty_membership(uuid) from public, anon;
revoke all on function public.join_loyalty_program(uuid) from public, anon;
revoke all on function public.leave_loyalty_program(uuid) from public, anon;
revoke all on function public.list_business_loyalty_members(uuid) from public, anon;
revoke all on function public.list_business_loyalty_transactions(uuid,integer) from public, anon;
revoke all on function public.list_business_staff(uuid) from public, anon;
revoke all on function public.process_loyalty_action(uuid,uuid,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.reverse_loyalty_stamp(uuid,uuid,text) from public, anon;
revoke all on function public.add_business_staff(uuid,text) from public, anon;
revoke all on function public.remove_business_staff(uuid,uuid) from public, anon;
revoke all on function public.notification_enabled(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.register_push_token(text,text,text) from public, anon;
revoke all on function public.deactivate_push_tokens() from public, anon;
revoke all on function public.set_notification_preference(uuid,text,boolean) from public, anon;
revoke all on function public.get_notification_settings() from public, anon;
revoke all on function public.claim_notification_deliveries(integer) from public, anon, authenticated;
revoke all on function public.finalize_event_gallery_media(uuid,uuid,uuid,uuid,text,text,smallint,jsonb) from public, anon, authenticated;
revoke all on function public.send_business_update(uuid,text,text,text,timestamptz) from public, anon;
revoke all on function public.claim_media_cleanup(integer) from public, anon, authenticated;
revoke all on function public.get_loyalty_wallet_v2() from public, anon;
revoke all on function public.list_business_loyalty_members_v2(uuid) from public, anon;
revoke all on function public.process_loyalty_points_earn(uuid,uuid,uuid,integer,uuid) from public, anon, authenticated;
revoke all on function public.list_business_scan_log(uuid,timestamptz,timestamptz,integer) from public, anon;
revoke all on function public.get_business_scan_stats(uuid,timestamptz,timestamptz) from public, anon;
revoke all on function public.create_business_staff_invite(uuid,text) from public, anon;
revoke all on function public.list_business_staff_invites(uuid) from public, anon;
revoke all on function public.revoke_business_staff_invite(uuid) from public, anon;
revoke all on function public.accept_business_staff_invite(text) from public, anon;
revoke all on function public.get_platform_admin_overview() from public, anon;
revoke all on function public.list_platform_admin_audit(integer) from public, anon;
revoke all on function public.list_platform_reports(public.report_status) from public, anon;
revoke all on function public.resolve_platform_report(uuid,public.report_status,text) from public, anon;
revoke all on function public.get_account_deletion_impact(uuid) from public, anon, authenticated;
revoke all on function public.begin_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.set_account_deletion_storage_targets(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.execute_account_deletion(uuid,uuid) from public, anon, authenticated;
revoke all on function public.finish_account_deletion_cleanup(uuid,text) from public, anon, authenticated;
revoke all on function public.claim_account_deletion_cleanup(integer) from public, anon, authenticated;
revoke all on function public.get_nearby_alert_preferences() from public, anon;
revoke all on function public.set_nearby_alert_preferences(boolean,integer) from public, anon;
revoke all on function public.set_nearby_business_alert_preference(uuid,boolean) from public, anon;
revoke all on function public.get_nearby_alert_stops() from public, anon;
revoke all on function public.is_business_page_address_available(text) from public, anon;
revoke all on function public.create_business_with_owner_v3(uuid,text,text,boolean,public.business_type,text,smallint[],text,text,text,text,text,public.service_area_type,text[],smallint,text) from public, anon;
revoke all on function public.billing_entitlement_is_active(text,timestamptz) from public, anon;
revoke all on function public.get_my_listing_billing() from public, anon;
revoke all on function public.assign_my_business_listing(uuid) from public, anon;
do $$ begin
  perform set_config('sds.had_billing_membership',
    pg_has_role(current_user,'sds_billing_manager','SET')::text,true);
  if not pg_has_role(current_user,'sds_billing_manager','SET') then
    execute format('grant sds_billing_manager to %I with set true',current_user);
  end if;
end $$;
set local role sds_billing_manager;
revoke all on function public.apply_listing_subscription_event(text,text,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,jsonb) from public, anon, authenticated;
grant execute on function public.apply_listing_subscription_event(text,text,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,jsonb) to service_role;
reset role;
do $$ begin
  if current_setting('sds.had_billing_membership') = 'false' then
    execute format('revoke sds_billing_manager from %I',current_user);
  end if;
end $$;
revoke all on function public.square_queue_counts(uuid) from public, anon, authenticated;
revoke all on function public.square_operator_businesses(uuid) from public, anon, authenticated;
revoke all on function public.order_notification_preference(boolean) from public, anon;
revoke all on function public.pickup_notification_access(uuid,uuid,text) from public, anon;
revoke all on function public.pickup_notification_sendable(uuid) from public, anon, authenticated;
revoke all on function public.claim_pickup_notifications(integer) from public, anon, authenticated;
revoke all on function public.square_confirm_pickup(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.square_redeem_checkout_reward(uuid,uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.set_notification_delivery_state(uuid,text,timestamptz,text,jsonb,timestamptz) from public, anon, authenticated;
revoke all on function public.stripe_consume_onboarding_state(text) from public, anon, authenticated;
revoke all on function public.reserve_business_media_upload(uuid,uuid,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.release_business_media_upload(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.finalize_reserved_business_media_upload(uuid,uuid,uuid,text,uuid,text,text,smallint,jsonb) from public, anon, authenticated;
revoke all on function public.enforce_media_upload_reserved_quota() from public, anon, authenticated;
revoke all on function public.claim_media_object_cleanup(integer) from public, anon, authenticated;
revoke all on function public.finish_media_object_cleanup(uuid,boolean) from public, anon, authenticated;
revoke all on function public.create_business_media_staging_intent(uuid,uuid,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.can_insert_business_media_staging_object(text,jsonb) from public, anon;
revoke all on function public.release_business_media_staging_intent(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.finish_business_media_staging_cleanup(uuid,uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.enqueue_expired_media_staging_objects(integer) from public, anon, authenticated;
revoke all on function public.media_storage_usage_summary() from public, anon, authenticated;
revoke all on function public.update_service_request_status(uuid,text) from public, anon;
revoke all on function public.cancel_service_request(uuid) from public, anon;
revoke all on function public.get_business_event_rsvp_counts(uuid) from public, anon;
revoke all on function public.set_event_rsvp(uuid,boolean) from public, anon;
revoke all on function public.service_request_notification_access(uuid,uuid) from public, anon;
revoke all on function public.service_request_notification_sendable(uuid) from public, anon, authenticated;
revoke all on function public.report_pickup_order_review(uuid,text,text) from public, anon;
revoke all on function public.list_pickup_review_reports() from public, anon;
revoke all on function public.resolve_pickup_review_report(uuid,text,text) from public, anon;
revoke all on function public.save_appointment_setup(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.reserve_appointment_slot(uuid,uuid,uuid,timestamptz,uuid,text,text,text,text,text,uuid,text) from public, anon, authenticated;
revoke all on function public.appointment_payment_lease(uuid,uuid) from public, anon, authenticated;
revoke all on function public.resolve_appointment_payment_hold(uuid,boolean) from public, anon, authenticated;
revoke all on function public.apply_appointment_provider_payment(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.transition_appointment(uuid,uuid,uuid,text,text,integer) from public, anon, authenticated;
revoke all on function public.reschedule_appointment_slot(uuid,uuid,uuid,text,timestamptz,uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.appointment_refund_lease(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.apply_appointment_provider_refund(uuid,text,text,uuid,integer,text,text) from public, anon, authenticated;
revoke all on function public.record_appointment_external_reimbursement(uuid,uuid,uuid,integer) from public, anon, authenticated;
revoke all on function public.set_event_rsvp_group(uuid,boolean,integer) from public, anon;
revoke all on function public.get_business_event_rsvp_attendees(uuid) from public, anon;
revoke all on function public.set_event_rsvp_check_in(uuid,boolean) from public, anon;
revoke all on function public.report_verified_event_review(uuid,text,text) from public, anon;
revoke all on function public.settle_pickup_loyalty(uuid) from public, anon, authenticated;
revoke all on function public.apply_appointment_dispute(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.prepare_appointment_review_refund(uuid,uuid,integer) from public, anon, authenticated;
revoke all on function public.stripe_webhook_claim(text,uuid) from public, anon, authenticated;
revoke all on function public.get_my_business_subscription_features() from public, anon;
revoke all on function public.get_business_reviews(uuid) from public, anon;
revoke all on function public.reply_to_business_review(uuid,uuid,text,text) from public, anon;
revoke all on function public.business_listing_billing_enabled_for_current_user() from public, anon;
revoke all on function public.save_service_request_form(uuid,integer,jsonb) from public, anon;
revoke all on function public.submit_service_request(uuid,uuid,text,uuid,text,integer,jsonb) from public, anon;
revoke all on function public.business_feature_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.get_business_feature_access(uuid) from public, anon;
revoke all on function public.assert_business_feature(uuid,text) from public, anon, authenticated;

-- Future application functions must explicitly grant their intended callers.
alter default privileges for role postgres revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

commit;
