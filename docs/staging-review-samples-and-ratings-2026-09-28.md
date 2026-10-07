# Staging review samples and ratings display

## Persisted staging fixtures

At the user's request, three clearly labeled sample pickup reviews were added to each of the seven businesses actively owned by confirmed `kade20413@gmail.com` on project `lgddhdexvwclfrnzjtly`: **21 reviews** total. Each review begins `[Staging test review — not a real customer purchase]`.

The schema requires an order for each pickup review. Deterministic `TEST-REV-...` database fixture orders provide that relationship, marked `STAGING_FIXTURE_NO_PAYMENT` with `provider_request.fixture = staging-owner-review-v1`. They have no customer identity, provider payment/order ID or paid timestamp. No provider transaction, email, customer account, loyalty award or notification was triggered. These completed fixture records appear in business order history as test records. The fixture file is separate from migrations and production seeds; rerunning it does not duplicate records or overwrite replies.

Readback confirms three owner-inbox reviews per business and zero provider payments. Published businesses each return `4.7` and `3 reviews`:

- Bayou & Bloom Cafe
- Juniper & Ember Kitchen
- Magnolia & Main Test Kitchen

Kades Business, Smoothie Hut, Surf Shack and Test Business remain drafts. Their owner reviews are available, but no public aggregate is returned.

## Implementation

`BusinessRating` presents a star, one-decimal average and actual review count. Known zero reviews say “No reviews yet”; failed or invalid reads never become invented zero ratings. Home business cards include the rating in their accessible button label. Business page identity and its review section share one summary read.

Home loads aggregate ratings in batches of at most 200 IDs, avoids one query per card, ignores stale refresh results and preserves usable business discovery when ratings fail. Failure exposes a Retry ratings action. `get_public_business_review_summaries` combines published pickup and event reviews, returns only active-business IDs/counts/averages, uses an empty search path, and limits each request to 200 businesses. Public access grants cover only the aggregate function; no private table grants are widened.

## Evidence and release state

- Aggregate migration `20260929000400_public_review_summaries` deployed to staging.
- Rolled-back fixture tests verify combined count/average equivalence, hidden-review exclusion, draft-business exclusion, public grants and oversized-request rejection.
- Anonymous live REST returns HTTP 200, exactly three published-business aggregates, and no draft business/private metadata.
- Mobile TypeScript passes; 96 focused checks across five files pass, including rating parsing/batching, display in both themes, shared controls, discovery and navigation/auth intents.
- Mobile presentation is published in Preview group `fe8cfe38-c15c-4198-bcde-e566f684ac8c`. Combined TypeScript, 153 checks, both native exports and fresh channel/source/runtime/staging/fingerprint verification pass. See [release evidence](ratings-auth-attendees-staging-release-2026-09-28.md).

Phone acceptance remains pending for Home/business stars and counts, review text/replies, both themes and enlarged text. Backend and rendered tests do not establish native visual acceptance.
