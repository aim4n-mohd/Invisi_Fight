# design.md

## Files To Create/Edit

- `client/src/styles/design-tokens.css` — source of truth for CSS custom properties used by Phaser UI overlays, lobby screens, and HUD states.
- `client/src/styles/global.css` — base document styling, layout grid, typography application, and shared interaction affordances.
- `client/src/ui/theme.ts` — TypeScript token export for Phaser HUD components and any canvas-adjacent UI logic.
- `shared/config/gameplay.ts` — centralized gameplay timing, sonar, and resolution constants that affect UI labels and state messaging.
- `shared/config/ui.ts` — shared UI timing, animation, and responsive layout constants consumed by client rendering.
- `client/src/app/Router.ts` — screen state routing between landing, lobby, match, results, and reconnect states.
- `client/src/app/screens/LandingScreen.ts` — landing/lobby flow for name entry, room create/join, and connection waking state.
- `client/src/app/screens/LobbyScreen.ts` — host start, player list, connection status, and room code display.
- `client/src/app/screens/MatchScreen.ts` — planning/resolution HUD, health, firing order, timer, labels, and winner state.
- `client/src/app/screens/ResultsScreen.ts` — winner display and replay-to-lobby flow.
- `server/src/rooms/InvisiFightRoom.ts` — authoritative room state machine, phase timing, private state delivery, and resolution visuals trigger data.
- `server/src/systems/reconnect.ts` — reconnect session handling and lobby fallback behavior when in-memory matches are lost.
- `shared/contracts/*.ts` — shared message/state contracts for player identity, private sonar events, public match state, and room status.
- `shared/tests/*.spec.ts` — deterministic unit tests for sonar geometry, ray intersections, firing order, damage, elimination, and phase transitions.
- `server/tests/*.spec.ts` — Colyseus room integration tests for room lifecycle, reconnection, and authoritative resolution.
- `client/tests/*.spec.ts` — Playwright multi-browser tests for join, play, reconnect, and lobby-to-match-to-results flow.
- `.github/workflows/ci.yml` — CI for lint, unit tests, integration tests, and Playwright on GitHub Actions.
- `vite.config.ts` — GitHub Pages subpath build configuration and environment-specific client endpoint wiring.
- `render.yaml` — Render Free web service definition for the authoritative server.
- `client/package.json`, `server/package.json`, `shared/package.json` — workspace scripts and dependency boundaries for testable monorepo builds.
- `README.md` — local development, deployment, and verification instructions tied to the exact repo structure.

## Color Tokens

### Light/Dark Mode Policy
Dark mode only. No light mode is supported.

### Core Tokens
| Token | Light | Dark |
|---|---:|---:|
| `color.primary` | `#3D7CFF` | `#4D8CFF` |
| `color.secondary` | `#1E2A44` | `#111827` |
| `color.accent` | `#FFB000` | `#FFBF33` |
| `color.background` | `#0B1020` | `#0B1020` |
| `color.surface` | `#111A2E` | `#111A2E` |
| `color.border` | `#24304A` | `#32405F` |
| `color.text-primary` | `#F5F7FB` | `#F5F7FB` |
| `color.text-secondary` | `#B7C0D6` | `#C2CAE0` |
| `color.text-disabled` | `#6B7388` | `#6B7388` |

### Semantic Tokens
| Token | Light | Dark |
|---|---:|---:|
| `color.success` | `#33D17A` | `#33D17A` |
| `color.warning` | `#F7B500` | `#F7B500` |
| `color.error` | `#FF5C7A` | `#FF5C7A` |
| `color.info` | `#4DB2FF` | `#4DB2FF` |

### UI Emphasis Tokens
| Token | Light | Dark |
|---|---:|---:|
| `color.surface-raised` | `#16213A` | `#16213A` |
| `color.surface-overlay` | `#0F1628E6` | `#0F1628E6` |
| `color.focus-ring` | `#A7C4FF` | `#A7C4FF` |
| `color.sonar-silhouette` | `#D8E2FF99` | `#D8E2FF99` |
| `color.sonar-detection-glow` | `#4DB2FF66` | `#4DB2FF66` |
| `color.health-heart` | `#FF5C7A` | `#FF5C7A` |
| `color.health-heart-empty` | `#3B455D` | `#3B455D` |
| `color.shot-line` | `#F5F7FB` | `#F5F7FB` |
| `color.muzzle-flash` | `#FFEA8A` | `#FFEA8A` |
| `color.overlay-scrim` | `#050814CC` | `#050814CC` |

## Typography

### Font Families
- `font.display`: `"Rajdhani", "Segoe UI", system-ui, sans-serif`
- `font.body`: `"Inter", "Segoe UI", system-ui, sans-serif`
- `font.mono`: `"IBM Plex Mono", "SFMono-Regular", Consolas, monospace`

### Size Scale
| Token | Px | Line-height | Letter-spacing | Usage rule |
|---|---:|---:|---:|---|
| `type.xs` | `12px` | `16px` | `0.02em` | Small meta labels only; never for primary actions. |
| `type.sm` | `14px` | `20px` | `0.01em` | Secondary labels, helper text, room codes. |
| `type.md` | `16px` | `24px` | `0.00em` | Default body copy, form inputs, lobby lists. |
| `type.lg` | `20px` | `28px` | `-0.01em` | Section titles, HUD emphasis, phase labels. |
| `type.xl` | `24px` | `32px` | `-0.02em` | Screen headers, match state banners. |
| `type.2xl` | `32px` | `40px` | `-0.03em` | Winner state, major lobby headings. |
| `type.3xl` | `40px` | `48px` | `-0.04em` | Match-end champion callout only, never in forms. |

### Weight Options
- `weight.regular`: `400`
- `weight.medium`: `500`
- `weight.semibold`: `600`
- `weight.bold`: `700`

### Typography Rules
- `font.display` is used for game-title and phase-label text only.
- `font.body` is used for all interactive UI labels, lists, forms, and status copy.
- `font.mono` is used for room codes, timing values, and contract/debug-style identifiers.
- `type.3xl` is reserved for winner screens and must never appear inside compact panels.
- All uppercase HUD labels use `type.sm`, `weight.semibold`, and `letter-spacing` from `type.sm`.

## Spacing Scale

Base grid: `4px`

| Token | Px |
|---|---:|
| `space.0` | `0px` |
| `space.1` | `4px` |
| `space.2` | `8px` |
| `space.3` | `12px` |
| `space.4` | `16px` |
| `space.5` | `20px` |
| `space.6` | `24px` |
| `space.8` | `32px` |
| `space.10` | `40px` |
| `space.12` | `48px` |
| `space.14` | `56px` |
| `space.16` | `64px` |

### Spacing Rules
- `space.2` is the default gap inside compact HUD rows.
- `space.4` is the default gap between form controls and panel sections.
- `space.6` is the default outer padding for cards and lobby panels.
- `space.8` is the standard screen-to-panel separation on desktop.
- `space.12` is reserved for full-section separation on result screens.

## Border & Radius

### Border Width Tokens
- `border.width.0`: `0px`
- `border.width.1`: `1px`
- `border.width.2`: `2px`
- `border.width.3`: `3px`

### Border Style Rules
- Default interactive outlines use `border.width.1` with `color.border`.
- Prominent buttons use `border.width.2` with `color.primary` on focus and `color.border` otherwise.
- Error containers use `border.width.2` with `color.error`.
- Panels never use dashed borders.
- All strokes are solid unless a loading skeleton is required.

### Radius Tokens
- `radius.sm`: `6px`
- `radius.md`: `10px`
- `radius.lg`: `16px`
- `radius.pill`: `9999px`

## Elevation / Shadow

| Level | CSS box-shadow |
|---|---|
| `shadow.0` | `none` |
| `shadow.1` | `0 1px 2px #00000066` |
| `shadow.2` | `0 4px 12px #00000066` |
| `shadow.3` | `0 8px 24px #00000080` |
| `shadow.4` | `0 16px 40px #00000099` |

## Component States

### Shared State Rules
All interactive elements use the same state system: buttons, inputs, room-code fields, list items, toggles, and clickable status cards.

#### Default
- Background: `color.surface`
- Text: `color.text-primary`
- Border: `border.width.1` + `color.border`
- Opacity: `1`
- Shadow: `shadow.1`

#### Hover
- Background: `color.surface-raised`
- Text: `color.text-primary`
- Border: `border.width.1` + `color.primary`
- Opacity: `1`
- Shadow: `shadow.2`
- Transition target: `motion.duration.fast`

#### Focus
- Background: `color.surface-raised`
- Border: `border.width.2` + `color.focus-ring`
- Outline: `2px solid color.focus-ring`
- Outline offset: `2px`
- Shadow: `shadow.2`
- Opacity: `1`

#### Active
- Background: `color.secondary`
- Border: `border.width.1` + `color.accent`
- Transform: `translateY(1px)`
- Shadow: `shadow.1`
- Opacity: `1`

#### Disabled
- Background: `color.surface`
- Text: `color.text-disabled`
- Border: `border.width.1` + `color.border`
- Opacity: `0.48`
- Shadow: `shadow.0`
- Pointer events: `none`

#### Loading
- Background: `color.surface-raised`
- Text: `color.text-secondary`
- Border: `border.width.1` + `color.border`
- Opacity: `0.72`
- Add a 24px inline spinner using `color.primary`
- Pointer events: `none`

#### Error
- Background: `color.surface`
- Text: `color.text-primary`
- Border: `border.width.2` + `color.error`
- Opacity: `1`
- Add error accent bar: `4px` solid `color.error`

### Match-Specific State Rules
- Planning phase banner uses `color.info`.
- Resolution phase banner uses `color.warning`.
- Winner state uses `color.success`.
- Elimination state uses `color.error`.
- Private sonar silhouette uses `color.sonar-silhouette` at `opacity: 1` on detection, then fades to `0` over the configured fade duration.
- Locked shot lines use `color.shot-line` at `opacity: 1`.
- Muzzle flash uses `color.muzzle-flash` at `opacity: 1` for a single instant frame.
- Health hearts use `color.health-heart`; empty hearts use `color.health-heart-empty`.

## UI Rules

### Layout Grid
- Column grid: `12`
- Desktop gutter: `24px`
- Desktop margin: `32px`
- Tablet gutter: `20px`
- Tablet margin: `24px`
- Mobile fallback is not a supported primary layout, but the viewport must remain legible below desktop widths.

### Max Content Width
- `max-content-width`: `1280px`

### Breakpoints
- `breakpoint.sm`: `640px`
- `breakpoint.md`: `768px`
- `breakpoint.lg`: `1024px`
- `breakpoint.xl`: `1280px`
- `breakpoint.2xl`: `1536px`

### Image Aspect Ratios
- `ratio.screenshot`: `16:9`
- `ratio.card`: `4:3`
- `ratio.avatar`: `1:1`
- `ratio.banner`: `21:9`

### Icon Size System
- `icon.xs`: `12px`
- `icon.sm`: `16px`
- `icon.md`: `20px`
- `icon.lg`: `24px`
- `icon.xl`: `32px`
- `icon.2xl`: `40px`

### Minimum Touch Target Size
- `touch-target.min`: `44px`

### Animation Duration Tokens
- `motion.duration.instant`: `0ms`
- `motion.duration.fast`: `120ms`
- `motion.duration.standard`: `180ms`
- `motion.duration.slow`: `240ms`
- `motion.duration.long`: `320ms`

### Easing Functions
- `motion.easing.linear`: `linear`
- `motion.easing.standard`: `cubic-bezier(0.2, 0.0, 0.2, 1)`
- `motion.easing.emphasis`: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- `motion.easing.sharp`: `cubic-bezier(0.4, 0.0, 1, 1)`

### UI Behavior Rules
- The lobby uses a single-column main stack with a fixed status rail on desktop.
- Match HUD uses top-left timer, top-right firing-order panel, bottom-left health, and bottom-right connection/status.
- Sonar wedge and private aim line are drawn in-game, never in HTML overlays.
- Result screens must preserve the same max width and panel radius as lobby screens.
- Connection state must visibly distinguish `connecting`, `waking`, `reconnecting`, `online`, and `offline` with `color.info`, `color.warning`, `color.primary`, `color.success`, and `color.error` respectively.

## Dark Mode

Not supported in v1 — the product ships with dark mode as the only visual theme, matching the competitive HUD direction and eliminating theme-switch complexity for the MVP.

## Accessibility

### Minimum Contrast Ratios
- `a11y.text-on-background`: `4.5:1`
- `a11y.text-on-surface`: `4.5:1`
- `a11y.text-secondary-on-surface`: `3.0:1`
- `a11y.focus-indicator`: `3.0:1`
- `a11y-semantic-warnings`: `3.0:1`

### Focus Indicator Style
- Use `outline: 2px solid color.focus-ring`
- Use `outline-offset: 2px`
- Never remove focus outlines without replacing them with this tokenized focus indicator
- Keyboard focus must be visible on lobby actions, form inputs, and replay controls

### Minimum Touch/Click Target Size
- `a11y.target-min`: `44px` by `44px`

### Reduced-Motion Rules
- If reduced motion is enabled, set all non-essential transitions to `motion.duration.instant`
- Sonar sweep rotation must remain functional but must not add easing-based flourish outside the sweep itself
- Silhouette fade must be shortened to `motion.duration.instant` when reduced motion is enabled
- Screen-to-screen transitions must not exceed `motion.duration.fast` under reduced motion
- No parallax, camera shake, or decorative looping motion is permitted under reduced motion

## Files To Create/Edit

- `shared/config/gameplay.ts` — central gameplay constants for planning duration, sonar rotation period, wedge width, fade duration, heart count, and resolution pacing so client and server stay synchronized.
- `shared/config/ui.ts` — shared motion, spacing, and responsive constants for HUD timing and layout.
- `shared/contracts/match.ts` — public room state, private snapshots, phase labels, and room lifecycle contract types.
- `server/src/rooms/InvisiFightRoom.ts` — authoritative match logic and server-time phase control.
- `server/src/systems/sonar.ts` — sonar wedge geometry and private detection snapshot generation.
- `server/src/systems/resolution.ts` — deterministic overlap separation, shot locking, ray-hit resolution, and elimination processing.
- `server/src/systems/order.ts` — firing-order initialization and one-position rotation after each round.
- `client/src/app/screens/LandingScreen.ts` — landing lobby with name, create-room, join-room, and connecting/waking UI.
- `client/src/app/screens/LobbyScreen.ts` — lobby controls, player list, host start, and connection status.
- `client/src/app/screens/MatchScreen.ts` — planning/resolution HUD and in-game status panels.
- `client/src/app/screens/ResultsScreen.ts` — winner display and replay-to-lobby control.
- `client/src/ui/theme.ts` — token mapping for Phaser and DOM overlays.
- `client/src/styles/design-tokens.css` — CSS variables for all tokenized colors, typography, spacing, borders, radii, shadows, and motion.
- `client/src/styles/global.css` — root theme application, panel defaults, focus styles, and layout grid.
- `client/src/overlays/HeadsUpDisplay.ts` — HUD rendering rules for timer, hearts, firing order, and phase labels.
- `client/src/game/draw/sonar.ts` — private sonar wedge and silhouette rendering rules.
- `client/src/game/draw/aim.ts` — private aim line and locked shot-line rendering rules.
- `client/src/game/draw/effects.ts` — muzzle flash, impact, and elimination visual effects.
- `client/tests/lobby-flow.spec.ts` — end-to-end verification for room creation, joining, and start flow.
- `client/tests/reconnect.spec.ts` — end-to-end verification for refresh and reconnect behavior.
- `server/tests/room-state.spec.ts` — integration coverage for authoritative room lifecycle and phase transitions.
- `shared/tests/sonar.spec.ts` — deterministic sonar geometry tests.
- `shared/tests/raycast.spec.ts` — ray intersection and non-piercing hit tests.
- `shared/tests/order.spec.ts` — firing-order rotation tests.
- `shared/tests/combat.spec.ts` — damage, elimination, and cancel-before-turn tests.

## Files To Create/Edit

- `client/src/styles/design-tokens.css` — define the CSS custom properties for the tokens above and expose them to the DOM UI.
- `client/src/styles/global.css` — apply the 12-column grid, max width, panel treatment, and shared focus rules.
- `client/src/ui/theme.ts` — map token names to Phaser UI constants for in-canvas HUD use.
- `shared/config/gameplay.ts` — centralize all timing and balancing values referenced by match labels and tests.
- `shared/config/ui.ts` — centralize animation and responsive values referenced by the frontend.
- `shared/contracts/state.ts` — shared authoritative public/private match state definitions.
- `shared/contracts/messages.ts` — client/server message types for room join, reconnect, private sonar events, and session tokens.
- `server/src/rooms/InvisiFightRoom.ts` — authoritative Colyseus room implementation.
- `server/src/policies/roomAccess.ts` — host-only start rules and anonymous session authorization.
- `server/src/jobs/cleanup.ts` — in-memory match cleanup on disconnect or server restart fallback.
- `server/src/index.ts` — server bootstrap for Render and localhost.
- `vite.config.ts` — GitHub Pages base path and environment-specific server endpoint handling.
- `.github/workflows/ci.yml` — automated test and build pipeline.
- `client/tests/multibrowser.spec.ts` — Playwright multi-browser match verification.
- `server/tests/reconnect.spec.ts` — reconnection integration tests.
- `README.md` — setup and deployment instructions for the exact monorepo workflow.