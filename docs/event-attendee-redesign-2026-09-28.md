# Event attendee inbox refinement

## Implementation

The virtualized roster now has name search and Expected / Checked in / Waitlisted / All group filters. Confirmed people and group counts are distinct. Rows show identity, party size and status; one selected-group sheet contains the relevant Check in / Undo action and explains whole-group confirmation. Waitlisted groups cannot be checked in. Export all attendees is secondary and explicitly includes every group regardless of filters. A top back pill remains available during initial loading.

The owner-only attendee/check-in RPCs remain authoritative. Event/account scope remounts private state, latest read wins, and abandoned async results cannot update the screen. Check-in taps are serialized; the confirmed RSVP ID/timestamp updates local state before refreshing. Failed refreshes retain prior data with Retry, while known authorization loss clears the roster. Failed/initial reads do not claim zero attendees. CSV output now escapes formula-like names as well as quotes and commas.

## Evidence and limits

Mobile TypeScript and 99 focused checks across six files pass, covering attendee classification/search/counts, CSV formula and quotation handling, exact filter targets, ratings, shared UI, discovery, navigation and auth intents. Native attendee sheet, keyboard, check-in and sharing behavior remain unverified on the phone. No live attendee check-in or export was triggered to inspect presentation.

Published in combined staging Preview group `fe8cfe38-c15c-4198-bcde-e566f684ac8c` alongside authentication and business-rating refinements. Combined TypeScript and 153 checks, both native exports and fresh channel verification pass. Existing reviews/RSVP database fixes and requested staging review fixtures are already live. See [release evidence](ratings-auth-attendees-staging-release-2026-09-28.md). App-wide native acceptance remains outstanding.
