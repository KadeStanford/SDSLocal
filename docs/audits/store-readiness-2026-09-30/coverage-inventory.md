# Mobile surface coverage inventory

Audit date: September 30, 2026, America/Chicago. This inventory supplements the approval-readiness report. Every route is indexed. Embedded sheets, modals, pickers, sign-in gates and native alert call sites are listed separately, with exact source lines. Dynamically titled surfaces and reusable templates remain separate entries. A detected entry is **partially reviewed**, not proof of functioning native behavior. All native runtime acceptance is **blocked** because no connected release candidate could be exercised. Native OS pickers, billing sheets, share sheets, browser authentication and permission dialogs are also explicitly tracked in the main report.

## Routes and navigation layouts

| Route or layout | Source | Status |
| --- | --- | --- |
| account | [apps/mobile/src/app/(tabs)/account.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:1) | Partially reviewed; native blocked |
| business-appointments | [apps/mobile/src/app/(tabs)/business-appointments.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/business-appointments.tsx:1) | Partially reviewed; native blocked |
| business-requests | [apps/mobile/src/app/(tabs)/business-requests.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/business-requests.tsx:1) | Partially reviewed; native blocked |
| businesses | [apps/mobile/src/app/(tabs)/businesses.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/businesses.tsx:1) | Partially reviewed; native blocked |
| calendar | [apps/mobile/src/app/(tabs)/calendar.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/calendar.tsx:1) | Partially reviewed; native blocked |
| explore | [apps/mobile/src/app/(tabs)/explore.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/explore.tsx:1) | Partially reviewed; native blocked |
| orders | [apps/mobile/src/app/(tabs)/orders.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/orders.tsx:1) | Partially reviewed; native blocked |
| pickup-orders | [apps/mobile/src/app/(tabs)/pickup-orders.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/pickup-orders.tsx:1) | Partially reviewed; native blocked |
| rewards | [apps/mobile/src/app/(tabs)/rewards.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/rewards.tsx:1) | Partially reviewed; native blocked |
| staff-scan | [apps/mobile/src/app/(tabs)/staff-scan.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/staff-scan.tsx:1) | Partially reviewed; native blocked |
| _layout | [apps/mobile/src/app/(tabs)/_layout.tsx:1](F:/BusinessApp/apps/mobile/src/app/(tabs)/_layout.tsx:1) | Partially reviewed; native blocked |
| appointment | [apps/mobile/src/app/appointment.tsx:1](F:/BusinessApp/apps/mobile/src/app/appointment.tsx:1) | Partially reviewed; native blocked |
| auth/callback | [apps/mobile/src/app/auth/callback.tsx:1](F:/BusinessApp/apps/mobile/src/app/auth/callback.tsx:1) | Partially reviewed; native blocked |
| b/[slug] | [apps/mobile/src/app/b/[slug].tsx:1](F:/BusinessApp/apps/mobile/src/app/b/[slug].tsx:1) | Partially reviewed; native blocked |
| book-appointment | [apps/mobile/src/app/book-appointment.tsx:1](F:/BusinessApp/apps/mobile/src/app/book-appointment.tsx:1) | Partially reviewed; native blocked |
| business-account | [apps/mobile/src/app/business-account.tsx:1](F:/BusinessApp/apps/mobile/src/app/business-account.tsx:1) | Partially reviewed; native blocked |
| business-new | [apps/mobile/src/app/business-new.tsx:1](F:/BusinessApp/apps/mobile/src/app/business-new.tsx:1) | Partially reviewed; native blocked |
| business-reviews | [apps/mobile/src/app/business-reviews.tsx:1](F:/BusinessApp/apps/mobile/src/app/business-reviews.tsx:1) | Partially reviewed; native blocked |
| business | [apps/mobile/src/app/business.tsx:1](F:/BusinessApp/apps/mobile/src/app/business.tsx:1) | Partially reviewed; native blocked |
| event-attendees | [apps/mobile/src/app/event-attendees.tsx:1](F:/BusinessApp/apps/mobile/src/app/event-attendees.tsx:1) | Partially reviewed; native blocked |
| index | [apps/mobile/src/app/index.tsx:1](F:/BusinessApp/apps/mobile/src/app/index.tsx:1) | Partially reviewed; native blocked |
| listing-plans | [apps/mobile/src/app/listing-plans.tsx:1](F:/BusinessApp/apps/mobile/src/app/listing-plans.tsx:1) | Partially reviewed; native blocked |
| my-event-reviews | [apps/mobile/src/app/my-event-reviews.tsx:1](F:/BusinessApp/apps/mobile/src/app/my-event-reviews.tsx:1) | Partially reviewed; native blocked |
| my-service-requests | [apps/mobile/src/app/my-service-requests.tsx:1](F:/BusinessApp/apps/mobile/src/app/my-service-requests.tsx:1) | Partially reviewed; native blocked |
| notification | [apps/mobile/src/app/notification.tsx:1](F:/BusinessApp/apps/mobile/src/app/notification.tsx:1) | Partially reviewed; native blocked |
| order | [apps/mobile/src/app/order.tsx:1](F:/BusinessApp/apps/mobile/src/app/order.tsx:1) | Partially reviewed; native blocked |
| pickup-order | [apps/mobile/src/app/pickup-order.tsx:1](F:/BusinessApp/apps/mobile/src/app/pickup-order.tsx:1) | Partially reviewed; native blocked |
| request-form | [apps/mobile/src/app/request-form.tsx:1](F:/BusinessApp/apps/mobile/src/app/request-form.tsx:1) | Partially reviewed; native blocked |
| service-request | [apps/mobile/src/app/service-request.tsx:1](F:/BusinessApp/apps/mobile/src/app/service-request.tsx:1) | Partially reviewed; native blocked |
| service-requests | [apps/mobile/src/app/service-requests.tsx:1](F:/BusinessApp/apps/mobile/src/app/service-requests.tsx:1) | Partially reviewed; native blocked |
| staff-invite | [apps/mobile/src/app/staff-invite.tsx:1](F:/BusinessApp/apps/mobile/src/app/staff-invite.tsx:1) | Partially reviewed; native blocked |
| _layout | [apps/mobile/src/app/_layout.tsx:1](F:/BusinessApp/apps/mobile/src/app/_layout.tsx:1) | Partially reviewed; native blocked |

## Embedded surfaces and confirmations

### apps/mobile/src/app/tabs/account.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/(tabs)/account.tsx:486](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:486) | Alert.alert | 'Saved'; 'Your profile is up to date.' | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/account.tsx:490](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:490) | Alert.alert | 'Could not save'; userMessageFromError(error, 'We could not save your profile. Please try again.') | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/account.tsx:987](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:987) | ChoicePicker | "State / region" | Partially reviewed; native blocked |
### apps/mobile/src/app/tabs/explore.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/(tabs)/explore.tsx:894](F:/BusinessApp/apps/mobile/src/app/(tabs)/explore.tsx:894) | DiscoveryFiltersSheet |  | Partially reviewed; native blocked |
### apps/mobile/src/app/tabs/pickup-orders.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/(tabs)/pickup-orders.tsx:101](F:/BusinessApp/apps/mobile/src/app/(tabs)/pickup-orders.tsx:101) | Modal | {choosingBusiness} | Partially reviewed; native blocked |
### apps/mobile/src/app/tabs/rewards.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/(tabs)/rewards.tsx:930](F:/BusinessApp/apps/mobile/src/app/(tabs)/rewards.tsx:930) | FollowingFiltersSheet | {followingFiltersOpen} | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/rewards.tsx:1207](F:/BusinessApp/apps/mobile/src/app/(tabs)/rewards.tsx:1207) | RewardsCodeSheet |  | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/rewards.tsx:1594](F:/BusinessApp/apps/mobile/src/app/(tabs)/rewards.tsx:1594) | ChoicePicker | "Reminder timing" | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/rewards.tsx:1603](F:/BusinessApp/apps/mobile/src/app/(tabs)/rewards.tsx:1603) | ChoicePicker | "Repeat reminders" | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/rewards.tsx:1615](F:/BusinessApp/apps/mobile/src/app/(tabs)/rewards.tsx:1615) | Modal | {expandedImage !== null} | Partially reviewed; native blocked |
### apps/mobile/src/app/tabs/staff-scan.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/(tabs)/staff-scan.tsx:531](F:/BusinessApp/apps/mobile/src/app/(tabs)/staff-scan.tsx:531) | ChoicePicker | "Business" | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/staff-scan.tsx:549](F:/BusinessApp/apps/mobile/src/app/(tabs)/staff-scan.tsx:549) | ChoicePicker | "Business" | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/staff-scan.tsx:620](F:/BusinessApp/apps/mobile/src/app/(tabs)/staff-scan.tsx:620) | confirm |  | Partially reviewed; native blocked |
| [apps/mobile/src/app/(tabs)/staff-scan.tsx:646](F:/BusinessApp/apps/mobile/src/app/(tabs)/staff-scan.tsx:646) | confirm | true | Partially reviewed; native blocked |
### apps/mobile/src/app/appointment.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/appointment.tsx:444](F:/BusinessApp/apps/mobile/src/app/appointment.tsx:444) | MerchantSheet | "Change appointment"; {changesOpen} | Partially reviewed; native blocked |
| [apps/mobile/src/app/appointment.tsx:462](F:/BusinessApp/apps/mobile/src/app/appointment.tsx:462) | Alert.alert | 'Request cancellation?'; 'The business will review the request. Any refund will remain pending until Square confirms it.' | Partially reviewed; native blocked |
| [apps/mobile/src/app/appointment.tsx:552](F:/BusinessApp/apps/mobile/src/app/appointment.tsx:552) | Alert.alert | 'Change appointment time?'; `Move your appointment to ${dateTime(slot.startAt, appointment.timezone)}?` | Partially reviewed; native blocked |
### apps/mobile/src/app/business-new.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/business-new.tsx:193](F:/BusinessApp/apps/mobile/src/app/business-new.tsx:193) | BusinessCreationGate |  | Partially reviewed; native blocked |
| [apps/mobile/src/app/business-new.tsx:471](F:/BusinessApp/apps/mobile/src/app/business-new.tsx:471) | Alert.alert | 'Discard this business draft?'; 'The information entered on this device will be removed.' | Partially reviewed; native blocked |
| [apps/mobile/src/app/business-new.tsx:813](F:/BusinessApp/apps/mobile/src/app/business-new.tsx:813) | ChoicePicker | {serviceModel === 'mobile' ? 'State (optional)' : 'State'} | Partially reviewed; native blocked |
| [apps/mobile/src/app/business-new.tsx:833](F:/BusinessApp/apps/mobile/src/app/business-new.tsx:833) | ChoicePicker | "Service area" | Partially reviewed; native blocked |
| [apps/mobile/src/app/business-new.tsx:842](F:/BusinessApp/apps/mobile/src/app/business-new.tsx:842) | ChoicePicker | "Radius from your location" | Partially reviewed; native blocked |
### apps/mobile/src/app/business-reviews.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/business-reviews.tsx:293](F:/BusinessApp/apps/mobile/src/app/business-reviews.tsx:293) | MerchantSheet | {selected?.merchantResponse ? 'Review & response' : 'Reply to review'}; {!!selected} | Partially reviewed; native blocked |
### apps/mobile/src/app/event-attendees.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/event-attendees.tsx:279](F:/BusinessApp/apps/mobile/src/app/event-attendees.tsx:279) | MerchantSheet | "Attendee group"; {!!selected} | Partially reviewed; native blocked |
### apps/mobile/src/app/my-event-reviews.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/my-event-reviews.tsx:224](F:/BusinessApp/apps/mobile/src/app/my-event-reviews.tsx:224) | MerchantSheet | {selected?.review ? 'Your event review' : 'Review your experience'}; {!!selected} | Partially reviewed; native blocked |
### apps/mobile/src/app/my-service-requests.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/my-service-requests.tsx:153](F:/BusinessApp/apps/mobile/src/app/my-service-requests.tsx:153) | Alert.alert | 'Cancel this request?'; `Cancel your request to ${requestBusinessName(request)}? This cannot be undone.` | Partially reviewed; native blocked |
| [apps/mobile/src/app/my-service-requests.tsx:252](F:/BusinessApp/apps/mobile/src/app/my-service-requests.tsx:252) | MerchantSheet | {selected ? requestBusinessName(selected) : 'Request details'}; {!!selected} | Partially reviewed; native blocked |
### apps/mobile/src/app/notification.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/notification.tsx:548](F:/BusinessApp/apps/mobile/src/app/notification.tsx:548) | Alert.alert | 'Could not open maps'; 'Please try again.' | Partially reviewed; native blocked |
### apps/mobile/src/app/pickup-order.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/pickup-order.tsx:364](F:/BusinessApp/apps/mobile/src/app/pickup-order.tsx:364) | OrderActionsSheet | {showOrderActions} | Partially reviewed; native blocked |
### apps/mobile/src/app/request-form.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/request-form.tsx:38](F:/BusinessApp/apps/mobile/src/app/request-form.tsx:38) | Alert.alert | 'Discard form changes?'; 'Your published form will stay unchanged.' | Partially reviewed; native blocked |
### apps/mobile/src/app/service-request.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/service-request.tsx:328](F:/BusinessApp/apps/mobile/src/app/service-request.tsx:328) | MerchantSheet | {attempt ? 'Leave unconfirmed request?' : 'Discard request?'}; {!!leaveAction} | Partially reviewed; native blocked |
### apps/mobile/src/app/service-requests.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/app/service-requests.tsx:331](F:/BusinessApp/apps/mobile/src/app/service-requests.tsx:331) | MerchantSheet | "Service request"; {!!selected} | Partially reviewed; native blocked |
### apps/mobile/src/components/account-data-panel.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/account-data-panel.tsx:71](F:/BusinessApp/apps/mobile/src/components/account-data-panel.tsx:71) | Alert.alert | 'Delete this account?'; `Your profile and private account data will be removed. Businesses you own alone will also be deleted. Shared businesses will remain with another owner.${subscriptionWarning}` | Partially reviewed; native blocked |
| [apps/mobile/src/components/account-data-panel.tsx:111](F:/BusinessApp/apps/mobile/src/components/account-data-panel.tsx:111) | Alert.alert | 'Account deleted'; 'Your Parish Pass account has been deleted.' | Partially reviewed; native blocked |
### apps/mobile/src/components/alerts-button.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/alerts-button.tsx:164](F:/BusinessApp/apps/mobile/src/components/alerts-button.tsx:164) | Modal | {open} | Partially reviewed; native blocked |
### apps/mobile/src/components/appointment-workspace.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/appointment-workspace.tsx:911](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:911) | ChoicePicker | "Assigned team member" | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1201](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1201) | ChoicePicker | "Show start times every" | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1274](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1274) | MerchantSheet | {services.find((s) => s.id === selectedServiceId)?.name \|\| 'New service'}; {!!selectedServiceId} | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1375](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1375) | ChoicePicker | "When customers pay" | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1504](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1504) | MerchantSheet | "Appointment details"; {!!selectedAppointment} | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1578](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1578) | Alert.alert | 'Refund reviewed payment?'; `Cancel the booking and return the remaining ${moneyText(appointment.refundableMinor ?? appointment.amountDueMinor)} ${appointment.currency}.` | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1623](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1623) | Alert.alert | 'Cancel this appointment?'; appointment.paymentStatus === 'paid' ? 'This marks the appointment for cancellation. Square must confirm a full refund before it is treated as cancelled.' : 'This appointment will be cancelled and its time released.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1646](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1646) | Alert.alert | 'Issue the full refund?'; `Square will be asked to refund ${moneyText(appointment.amountDueMinor)} ${appointment.currency}. The appointment remains pending until Square confirms.` | Partially reviewed; native blocked |
| [apps/mobile/src/components/appointment-workspace.tsx:1668](F:/BusinessApp/apps/mobile/src/components/appointment-workspace.tsx:1668) | Alert.alert | 'Confirm reimbursement'; `Confirm that you have reimbursed ${moneyText(appointment.amountDueMinor)} ${appointment.currency} outside Square. This records the result; it does not send money.` | Partially reviewed; native blocked |
### apps/mobile/src/components/booking-interval-field.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/booking-interval-field.tsx:45](F:/BusinessApp/apps/mobile/src/components/booking-interval-field.tsx:45) | ChoicePicker | {label} | Partially reviewed; native blocked |
### apps/mobile/src/components/booking-time-field.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/booking-time-field.tsx:42](F:/BusinessApp/apps/mobile/src/components/booking-time-field.tsx:42) | MerchantSheet | {label}; {open} | Partially reviewed; native blocked |
| [apps/mobile/src/components/booking-time-field.tsx:49](F:/BusinessApp/apps/mobile/src/components/booking-time-field.tsx:49) | DateTimePicker |  | Partially reviewed; native blocked |
### apps/mobile/src/components/brand-color-picker.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/brand-color-picker.tsx:342](F:/BusinessApp/apps/mobile/src/components/brand-color-picker.tsx:342) | MerchantSheet | {label}; {draft !== null} | Partially reviewed; native blocked |
### apps/mobile/src/components/business-qr-poster.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/business-qr-poster.tsx:124](F:/BusinessApp/apps/mobile/src/components/business-qr-poster.tsx:124) | Modal | {visible} | Partially reviewed; native blocked |
### apps/mobile/src/components/business-workspace-panels.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/business-workspace-panels.tsx:676](F:/BusinessApp/apps/mobile/src/components/business-workspace-panels.tsx:676) | BusinessWorkspaceSheet | "Choose a time" | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace-panels.tsx:686](F:/BusinessApp/apps/mobile/src/components/business-workspace-panels.tsx:686) | DateTimePicker |  | Partially reviewed; native blocked |
### apps/mobile/src/components/business-workspace-sheet.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/business-workspace-sheet.tsx:36](F:/BusinessApp/apps/mobile/src/components/business-workspace-sheet.tsx:36) | Modal | {visible} | Partially reviewed; native blocked |
### apps/mobile/src/components/business-workspace.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/business-workspace.tsx:762](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:762) | Alert.alert | 'Discard item changes?'; 'Your unsaved name, description and price changes will be lost.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:969](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:969) | Alert.alert | 'Discard unsaved changes?'; 'Your changes in this editor have not been saved.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:1079](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:1079) | Alert.alert | 'Discard stop draft?'; 'This stop has not been saved.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:1115](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:1115) | Alert.alert | 'Discard unsaved changes?'; 'Your changes have not been saved.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:1641](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:1641) | Alert.alert | 'Remove scheduled location?'; stop.title | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:2161](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2161) | Alert.alert | 'Discard event changes?'; 'Your event changes have not been saved.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:2288](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2288) | Alert.alert | 'Remove event photo?'; 'This removes the image from the event gallery.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:2364](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2364) | Alert.alert | 'Archive event?'; 'It will be removed from business management and customer listings.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:2478](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2478) | Alert.alert | 'Discard caption changes?'; 'Your photo caption has not been saved.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:2567](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2567) | Alert.alert | 'Remove photo?'; 'This removes the photo from the business page.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:2872](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2872) | Alert.alert | 'Revoke invite?'; `The link for ${invite.invited_email} will stop working.` | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:2927](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2927) | Alert.alert | 'Remove staff member?'; `${member.display_name} will no longer have access to this business.` | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3371](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3371) | MerchantSheet | "Edit profile and branding"; {identityEditorOpen && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3401](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3401) | ChoicePicker | "Business type" | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3415](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3415) | BrandColorPicker | "Primary brand color" | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3421](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3421) | BrandColorPicker | "Accent brand color" | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3474](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3474) | MerchantSheet | "Edit contact information"; {identityEditorOpen && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3584](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3584) | MerchantSheet | "Edit service area"; {identityEditorOpen && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3637](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3637) | ChoicePicker | {`State${serviceAreaType === 'statewide' ? ' (required)' : ' (optional)'}`} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3904](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3904) | BusinessWorkspaceSheet | { stopPickerTarget === 'date' ? 'Choose a date' : stopPickerTarget === 'start' ? 'Choose a start time' : 'Choose an end time' } | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:3924](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:3924) | DateTimePicker |  | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:4181](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:4181) | MerchantSheet | "Inventory tools"; {inventoryTools} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:4223](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:4223) | BusinessWorkspaceSheet | "Import menu"; {menuImportOpen} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:4305](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:4305) | MerchantSheet | {isMenuBusiness ? 'Edit menu item' : 'Edit service'}; {!!editingOffering && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:4400](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:4400) | ChoicePicker | "Category" | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:4483](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:4483) | Alert.alert | 'Archive this item?'; editingOffering.name + ' will be removed from your public offerings. Existing orders are retained.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:4503](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:4503) | MerchantSheet | {`Add ${offeringTerminology.item}`}; {menuEditorPanel === 'item' && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:4636](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:4636) | MerchantSheet | "Add category"; {menuEditorPanel === 'section' && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5205](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5205) | BusinessWorkspaceSheet | {eventPickerTarget.endsWith('date') ? 'Choose a date' : 'Choose a time'} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5215](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5215) | DateTimePicker |  | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5294](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5294) | MerchantSheet | "New follower update"; {contentPanel === 'update' && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5348](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5348) | MerchantSheet | {selectedUpdate?.title ?? 'Update'}; {Boolean(selectedUpdate)} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5432](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5432) | MerchantSheet | "Reward rules"; {rewardEditorOpen && canEdit} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5657](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5657) | MerchantSheet | "Add business photo"; {photoUploadOpen} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5892](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5892) | MerchantSheet | "Invite staff"; {contentPanel === 'invite'} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5955](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5955) | MerchantSheet | {selectedStaff?.display_name ?? 'Staff member'}; {Boolean(selectedStaff)} | Partially reviewed; native blocked |
| [apps/mobile/src/components/business-workspace.tsx:5983](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:5983) | MerchantSheet | "Pending invitation"; {Boolean(selectedInvite)} | Partially reviewed; native blocked |
### apps/mobile/src/components/choice-picker.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/choice-picker.tsx:83](F:/BusinessApp/apps/mobile/src/components/choice-picker.tsx:83) | Modal | {open} | Partially reviewed; native blocked |
### apps/mobile/src/components/date-field.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/date-field.tsx:65](F:/BusinessApp/apps/mobile/src/components/date-field.tsx:65) | MerchantSheet | {label}; {open} | Partially reviewed; native blocked |
### apps/mobile/src/components/date-picker-control.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/date-picker-control.tsx:16](F:/BusinessApp/apps/mobile/src/components/date-picker-control.tsx:16) | DateTimePicker |  | Partially reviewed; native blocked |
### apps/mobile/src/components/discovery-filters-sheet.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/discovery-filters-sheet.tsx:42](F:/BusinessApp/apps/mobile/src/components/discovery-filters-sheet.tsx:42) | Modal |  | Partially reviewed; native blocked |
### apps/mobile/src/components/event-directory.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/event-directory.tsx:187](F:/BusinessApp/apps/mobile/src/components/event-directory.tsx:187) | EventFilterSheet |  | Partially reviewed; native blocked |
### apps/mobile/src/components/event-filter-sheet.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/event-filter-sheet.tsx:78](F:/BusinessApp/apps/mobile/src/components/event-filter-sheet.tsx:78) | MerchantSheet | {area ? 'Event area' : 'Event category'}; {kind !== null} | Partially reviewed; native blocked |
### apps/mobile/src/components/following-filters-sheet.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/following-filters-sheet.tsx:36](F:/BusinessApp/apps/mobile/src/components/following-filters-sheet.tsx:36) | MerchantSheet | "Filter following"; {visible} | Partially reviewed; native blocked |
| [apps/mobile/src/components/following-filters-sheet.tsx:54](F:/BusinessApp/apps/mobile/src/components/following-filters-sheet.tsx:54) | ChoicePicker | "Category" | Partially reviewed; native blocked |
| [apps/mobile/src/components/following-filters-sheet.tsx:63](F:/BusinessApp/apps/mobile/src/components/following-filters-sheet.tsx:63) | ChoicePicker | "Location" | Partially reviewed; native blocked |
### apps/mobile/src/components/merchant-business-list.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/merchant-business-list.tsx:263](F:/BusinessApp/apps/mobile/src/components/merchant-business-list.tsx:263) | Modal | {!!actions} | Partially reviewed; native blocked |
### apps/mobile/src/components/merchant-ui.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/merchant-ui.tsx:316](F:/BusinessApp/apps/mobile/src/components/merchant-ui.tsx:316) | Modal | {visible} | Partially reviewed; native blocked |
### apps/mobile/src/components/notification-settings.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/notification-settings.tsx:322](F:/BusinessApp/apps/mobile/src/components/notification-settings.tsx:322) | MerchantSheet | {panel === 'order' ? 'Order alerts' : 'Nearby business alerts'}; {!!panel} | Partially reviewed; native blocked |
| [apps/mobile/src/components/notification-settings.tsx:431](F:/BusinessApp/apps/mobile/src/components/notification-settings.tsx:431) | MerchantSheet | {selectedBusiness?.business_name ?? 'Business updates'}; {!!selectedBusiness} | Partially reviewed; native blocked |
### apps/mobile/src/components/operations-screen-header.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/operations-screen-header.tsx:133](F:/BusinessApp/apps/mobile/src/components/operations-screen-header.tsx:133) | MerchantSheet | "Choose business"; {open} | Partially reviewed; native blocked |
### apps/mobile/src/components/pickup/business-review-section.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/pickup/business-review-section.tsx:304](F:/BusinessApp/apps/mobile/src/components/pickup/business-review-section.tsx:304) | Modal | {Boolean(reportId)} | Partially reviewed; native blocked |
### apps/mobile/src/components/pickup/item-refund-picker.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/pickup/item-refund-picker.tsx:91](F:/BusinessApp/apps/mobile/src/components/pickup/item-refund-picker.tsx:91) | Alert.alert | 'Refund selected items?'; `${items.reduce((n, i) => n + i.quantity, 0)} item(s) · ${money(total, order.currency)}\nThe refund completes after the payment provider confirms it.` | Partially reviewed; native blocked |
| [apps/mobile/src/components/pickup/item-refund-picker.tsx:129](F:/BusinessApp/apps/mobile/src/components/pickup/item-refund-picker.tsx:129) | Modal | {open} | Partially reviewed; native blocked |
### apps/mobile/src/components/pickup/order-actions-sheet.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/pickup/order-actions-sheet.tsx:84](F:/BusinessApp/apps/mobile/src/components/pickup/order-actions-sheet.tsx:84) | Modal | {visible} | Partially reviewed; native blocked |
| [apps/mobile/src/components/pickup/order-actions-sheet.tsx:103](F:/BusinessApp/apps/mobile/src/components/pickup/order-actions-sheet.tsx:103) | ItemRefundPicker |  | Partially reviewed; native blocked |
### apps/mobile/src/components/pickup/pickup-item.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/pickup/pickup-item.tsx:49](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-item.tsx:49) | Modal |  | Partially reviewed; native blocked |
### apps/mobile/src/components/pickup/pickup-scan-panel.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/pickup/pickup-scan-panel.tsx:107](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-scan-panel.tsx:107) | Modal | {open} | Partially reviewed; native blocked |
| [apps/mobile/src/components/pickup/pickup-scan-panel.tsx:175](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-scan-panel.tsx:175) | confirm |  | Partially reviewed; native blocked |
### apps/mobile/src/components/pickup/pickup-scheduler.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/pickup/pickup-scheduler.tsx:102](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-scheduler.tsx:102) | Modal |  | Partially reviewed; native blocked |
| [apps/mobile/src/components/pickup/pickup-scheduler.tsx:293](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-scheduler.tsx:293) | PickupTimePicker |  | Partially reviewed; native blocked |
### apps/mobile/src/components/pickup/pickup-settings-editor.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/pickup/pickup-settings-editor.tsx:147](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-settings-editor.tsx:147) | ChoicePicker | {`${day} opens`} | Partially reviewed; native blocked |
| [apps/mobile/src/components/pickup/pickup-settings-editor.tsx:160](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-settings-editor.tsx:160) | ChoicePicker | {`${day} closes`} | Partially reviewed; native blocked |
| [apps/mobile/src/components/pickup/pickup-settings-editor.tsx:268](F:/BusinessApp/apps/mobile/src/components/pickup/pickup-settings-editor.tsx:268) | ChoicePicker | "Offer a pickup time every" | Partially reviewed; native blocked |
### apps/mobile/src/components/public-business-page.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/public-business-page.tsx:771](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:771) | Alert.alert | `Block ${business.name}?`; 'This business, its events, and its rewards will stop appearing in Explore, Following, and Calendar. You can unblock it later in Account.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1223](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1223) | MerchantSheet | "Contact & share"; {detailsPanel === 'contact'} | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1298](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1298) | MerchantSheet | { menuOptionsItem ? 'Item details' : isMenuBusiness ? 'Full menu' : 'Services & offerings' }; {detailsPanel === 'menu'} | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1347](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1347) | ReportDialog |  | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1561](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1561) | MerchantSheet | "Event details" | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1760](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1760) | MerchantSheet | "Rewards program"; {detailsPanel === 'rewards'} | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1827](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1827) | MerchantSheet | "Customer reviews"; {detailsPanel === 'reviews'} | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1863](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1863) | SignInGate | {Boolean(gateIntent)} | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1879](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1879) | ReportDialog |  | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1886](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1886) | Modal | {safetyOpen} | Partially reviewed; native blocked |
| [apps/mobile/src/components/public-business-page.tsx:1927](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:1927) | Modal | {viewerVisible} | Partially reviewed; native blocked |
### apps/mobile/src/components/report-dialog.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/report-dialog.tsx:160](F:/BusinessApp/apps/mobile/src/components/report-dialog.tsx:160) | Modal | {Boolean(target)} | Partially reviewed; native blocked |
### apps/mobile/src/components/request-form-builder.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/request-form-builder.tsx:109](F:/BusinessApp/apps/mobile/src/components/request-form-builder.tsx:109) | MerchantSheet | "Edit question"; {!!field} | Partially reviewed; native blocked |
| [apps/mobile/src/components/request-form-builder.tsx:140](F:/BusinessApp/apps/mobile/src/components/request-form-builder.tsx:140) | ChoicePicker | "Answer type" | Partially reviewed; native blocked |
| [apps/mobile/src/components/request-form-builder.tsx:221](F:/BusinessApp/apps/mobile/src/components/request-form-builder.tsx:221) | MerchantSheet | "Customer form preview"; {preview} | Partially reviewed; native blocked |
### apps/mobile/src/components/request-question-fields.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/request-question-fields.tsx:26](F:/BusinessApp/apps/mobile/src/components/request-question-fields.tsx:26) | ChoicePicker | {f.label + (f.required ? ' · Required' : ' · Optional')} | Partially reviewed; native blocked |
### apps/mobile/src/components/rewards-code-sheet.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/rewards-code-sheet.tsx:58](F:/BusinessApp/apps/mobile/src/components/rewards-code-sheet.tsx:58) | MerchantSheet | "Rewards code"; {visible} | Partially reviewed; native blocked |
### apps/mobile/src/components/service-operations-screen.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/service-operations-screen.tsx:35](F:/BusinessApp/apps/mobile/src/components/service-operations-screen.tsx:35) | Alert.alert | 'Discard unsaved setup changes?'; 'Your appointment setup has unsaved changes.' | Partially reviewed; native blocked |
### apps/mobile/src/components/service-request-form.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/service-request-form.tsx:37](F:/BusinessApp/apps/mobile/src/components/service-request-form.tsx:37) | ChoicePicker | "Service · Optional" | Partially reviewed; native blocked |
### apps/mobile/src/components/sign-in-gate.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/sign-in-gate.tsx:21](F:/BusinessApp/apps/mobile/src/components/sign-in-gate.tsx:21) | Modal | {visible} | Partially reviewed; native blocked |
### apps/mobile/src/components/square-ordering-panel.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/square-ordering-panel.tsx:299](F:/BusinessApp/apps/mobile/src/components/square-ordering-panel.tsx:299) | MerchantSheet | "Square account"; {showConnection} | Partially reviewed; native blocked |
| [apps/mobile/src/components/square-ordering-panel.tsx:455](F:/BusinessApp/apps/mobile/src/components/square-ordering-panel.tsx:455) | Alert.alert | 'Disconnect Square?'; 'Ordering will close. Settle active orders first. Past orders are retained; your Square account remains open.' | Partially reviewed; native blocked |
| [apps/mobile/src/components/square-ordering-panel.tsx:560](F:/BusinessApp/apps/mobile/src/components/square-ordering-panel.tsx:560) | MerchantSheet | "Pickup hours & rules"; {pickupSettingsOpen} | Partially reviewed; native blocked |
### apps/mobile/src/components/stripe-ordering-panel.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/components/stripe-ordering-panel.tsx:356](F:/BusinessApp/apps/mobile/src/components/stripe-ordering-panel.tsx:356) | MerchantSheet | "Pickup hours & rules"; {pickupSettingsOpen} | Partially reviewed; native blocked |
### apps/mobile/src/providers/listing-billing-provider.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/providers/listing-billing-provider.tsx:358](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx:358) | Alert.alert | 'Store purchase diagnostic'; [ 'The native purchase call completed.', `Active subscriptions: ${purchased.customerInfo.activeSubscriptions.length}`, `Purchased products: ${purchased.customerInfo.allPurchasedProductIdentifiers.length}`, `Selected plan active: ${listingStoreHasActivePlan(purchased.customerInfo, | Partially reviewed; native blocked |
| [apps/mobile/src/providers/listing-billing-provider.tsx:418](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx:418) | Alert.alert | 'Apple purchase diagnostic'; listingNativeErrorDiagnostic(purchaseError) | Partially reviewed; native blocked |
| [apps/mobile/src/providers/listing-billing-provider.tsx:471](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx:471) | Alert.alert | 'Store restore diagnostic'; [ `App account matches: ${restored.originalAppUserId === userId ? 'yes' : 'no / aliased'}`, `Active subscriptions: ${restored.activeSubscriptions.length}`, `Purchased products: ${restored.allPurchasedProductIdentifiers.length}`, `Listing entitlement: ${listingStoreHasActivePlan(r | Partially reviewed; native blocked |
| [apps/mobile/src/providers/listing-billing-provider.tsx:510](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx:510) | Alert.alert | 'Store restore diagnostic'; listingNativeErrorDiagnostic(restoreError) | Partially reviewed; native blocked |
### apps/mobile/src/providers/nearby-alerts-provider.tsx

| Source | Surface | Title or state | Status |
| --- | --- | --- | --- |
| [apps/mobile/src/providers/nearby-alerts-provider.tsx:134](F:/BusinessApp/apps/mobile/src/providers/nearby-alerts-provider.tsx:134) | Alert.alert | title; message | Partially reviewed; native blocked |

## State and backend cross-reference index

The companion JSON preserves every useState binding in mobile source and each literal RPC, function invocation, commerce action, and table call in the scanned mobile, shared and web files. It also records hashes of all scanned SQL migrations and public-page source. Use this index to map loading, empty, validation, permission, payment and error branches to the source; the human review status and verification gaps are in the main report. Some API names are dynamic and require reading their dispatcher. This index makes no claim that every database function or security boundary was penetration-tested.
