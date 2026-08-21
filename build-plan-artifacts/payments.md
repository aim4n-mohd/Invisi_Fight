## Applicability

Applicable

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `payments.md` | Canonical payment and pricing contract for the app build plan. |
| `client/src/screens/LandingScreen.tsx` | Needed only if a future paid plan ever adds gated entry copy or plan-selection UI; for this MVP it should remain unchanged because monetization is out of scope. |
| `client/src/components/hud/StatusBanner.tsx` | Needed only if future monetization adds purchase-state messaging; not required for this build. |
| `server/src/index.ts` | Would only be needed for payment webhooks or billing endpoints; this build has no payments, so no changes are required. |
| `shared/src/types/match.ts` | Would only be needed if billing state were shared with gameplay state; this build has no billing state. |

## Provider And Pricing Model

Not applicable. This build plan explicitly excludes monetization, and the app is a friends-only internal playtest prototype with no accounts, no databases, no persistent progression, and no monetization path defined.

Assumption stated inline: because monetization was not specified, the simplest viable v1 path is **no payment provider, no pricing model, and no purchasable access**.

Explicit exclusions:
- No subscriptions
- No one-time purchases
- No credits or virtual currency
- No ads
- No donations
- No paid room hosting
- No paywalled features

## Plans And Entitlements

Not applicable.

This MVP has:
- one access mode only: free, anonymous room-based play
- no plan tiers
- no entitlement gating
- no billing period
- no upgrades or downgrades
- no trial, grace period, or renewal state
- no taxes, invoices, or receipts

Access is controlled solely by room membership and server-issued session identity, not by payment status.

## Checkout And Account Flows

Not applicable.

There is no checkout flow, no customer portal, and no billing account management. The intended product flow is:

1. Player opens the lobby.
2. Player enters a display name.
3. Player creates or joins a room.
4. Host starts the match when at least two players are present.

Access gating is purely gameplay/session-based:
- room join authorization
- host-only start control
- spectator handling for late joiners during active matches
- reconnect support using server-issued session token

Important constraint: never grant any access from an unverified browser redirect. Since there is no payment system, there is also no redirect-based fulfillment path.

## Webhooks

Not applicable.

No payment provider is configured, so there are:
- no payment webhooks
- no signature verification
- no webhook idempotency keys
- no retry or reconciliation rules for billing events

## Refunds And Disputes

Not applicable.

There are no purchases to refund, no chargebacks to process, and no entitlement reversals tied to billing.

Operational note:
- match cancellation, room abandonment, disconnects, and server restarts are gameplay/session concerns only
- if the Render server restarts and in-memory match state is lost, returning players are sent back to the lobby per the build plan, not refunded

## Testing

Not applicable for billing logic, because there is no payment provider in this MVP.

If billing were ever added later, the required test coverage would need to include provider sandbox setup, webhook fixtures, duplicate delivery handling, failure cases, and end-to-end checkout verification. For this build, the relevant tests remain gameplay and networking tests only.

## Edge Cases

Not applicable for billing edge cases, because no payments are implemented.

The following situations are handled by gameplay/session logic instead:
- delayed server events: authoritative match state must remain consistent via Colyseus room state
- redirect loss: there is no payment redirect flow, so no billing-related redirect recovery is needed
- currency mismatch: impossible because no currency is supported
- tax failures: impossible because no commerce exists
- provider outages: if the multiplayer server is sleeping or unavailable, the client shows a connecting/waking state and retries until it can rejoin or create a room

## Notes

This document intentionally defines **no monetization** for Invisi Fight v1. The product brief, scope exclusions, and monetization preferences do not request paid access, ads, subscriptions, or any other revenue model, so the correct contract is to keep the app fully free for the MVP.