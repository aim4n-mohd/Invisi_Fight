## Applicability
Not applicable — this build plan does not include Ads Integration. The app is a friends-only multiplayer game with no monetization path specified; follow `payments.md` if payments are later added.

## Files To Create/Edit
| Path | Why this file is needed |
|---|---|
| `ads.md` | Canonical ad integration contract for this build plan; documents the explicit no-ads decision and prevents accidental ad implementation in gameplay or lobby code. |

## Provider And Formats
Not applicable — no ad provider, network, SDK, or ad formats are part of this product’s v1 scope. This build plan explicitly excludes monetization, analytics, and promotional surfaces.

## Placements
Not applicable — no ad placements are allowed in this app build. Assumption stated inline: because the product is a small-party, real-time competitive game with a lobby-to-match flow and no monetization requirement, the safest and simplest v1 path is zero ad inventory.

## Consent And Privacy
Not applicable — no ads means no ad-consent collection, ad tracking, ad personalization, or ad-related data retention. The app should not add consent banners for advertising, since that would be misleading without any ad stack.

## Frequency Caps And UX
Not applicable — there are no ads to cap, dismiss, reward, or optimize for accessibility. No ad-related UI should be introduced into the lobby, match, results, or reconnect states.

## Failure And Fallback Behavior
Not applicable — because no ad provider is integrated, there is no ad fill, offline, timeout, blocked-network, invalid-creative, or provider-outage behavior to define. The client should continue to rely only on the existing multiplayer wake/reconnect states.

## Metrics
Not applicable — no ad impressions, fill rate, viewability, clicks, rewards, revenue, or ad guardrails are tracked for this build. This product should not add ad analytics or monetization events.

## Testing
Not applicable — no ad testing matrix exists for this build plan. Existing tests should continue to cover multiplayer connectivity, room state, match flow, reconnection, and gameplay determinism only.

## Edge Cases
Not applicable — there are no ad sessions to preserve across account switching, backgrounding, orientation changes, repeated callbacks, or stale cached ads. Since the app is desktop-first and has no account system, ad-specific edge cases are intentionally excluded.