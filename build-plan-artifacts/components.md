## Component Index

- Button
- Input
- TextArea
- Select
- Checkbox
- Radio
- Toggle
- Modal
- Drawer
- Toast
- Tooltip
- Badge
- Avatar
- Card
- Spinner
- EmptyState
- ErrorBoundary
- AppShell
- ConnectionStatusPill
- RoomCodeField
- NameEntryForm
- CreateRoomButton
- JoinRoomForm
- LobbyPlayerList
- HostStartPanel
- MatchPhaseBanner
- RoundTimer
- HeartMeter
- FiringOrderStrip
- SonarSweepOverlay
- AimLineOverlay
- DetectionSilhouette
- MatchHud
- WinnerPanel
- ReplayLobbyButton
- ReconnectPrompt
- SpectatorNotice
- PlayerRow
- RoomStateSummary

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `components.md` | Canonical reusable component specification for the MVP UI, shared by client implementation and validation. |
| `client/src/styles/design-tokens.css` | CSS custom properties for dark-only theme, HUD contrast, and shared component styling. |
| `client/src/styles/global.css` | Global element defaults, focus treatment, and layout primitives used by all UI components. |
| `client/src/ui/theme.ts` | TypeScript-facing theme token export for Phaser-adjacent UI and overlay timing values. |
| `shared/config/gameplay.ts` | Central gameplay constants consumed by timer, sonar, firing order, and match-state components. |
| `shared/config/ui.ts` | Shared UI animation, spacing, and responsive sizing constants used by reusable components. |
| `client/src/app/Router.ts` | Screen routing and shell composition between landing, lobby, match, results, and reconnect states. |
| `client/src/app/screens/LandingScreen.tsx` | Landing flow component composition for name entry, create/join actions, and connection waking state. |
| `client/src/app/screens/LobbyScreen.tsx` | Lobby composition for player list, room code display, and host start controls. |
| `client/src/app/screens/MatchScreen.tsx` | Match HUD composition for timer, hearts, firing order, sonar, aim, and resolution labels. |
| `client/src/app/screens/ResultsScreen.tsx` | Winner and replay-to-lobby composition after a match ends. |
| `client/src/app/screens/ConnectingScreen.tsx` | Dedicated waking/reconnecting state for Render sleep and transient disconnect recovery. |

---
### Button

**Purpose**
Primary action control for room creation, joining, host start, replay-to-lobby, and reconnect confirmation.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `children` | `React.ReactNode` | yes | — | Visible button label or content. |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | no | `'primary'` | Visual emphasis level. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | `'md'` | Control height and padding. |
| `type` | `'button' \| 'submit' \| 'reset'` | no | `'button'` | Native button type. |
| `disabled` | `boolean` | no | `false` | Prevents interaction and indicates unavailable action. |
| `loading` | `boolean` | no | `false` | Shows spinner and suppresses duplicate activation. |
| `fullWidth` | `boolean` | no | `false` | Expands to container width. |
| `onClick` | `() => void` | no | — | Invoked on primary activation. |
| `ariaLabel` | `string` | no | — | Explicit accessible label when children are icon-only. |

**States**
- default: Rendered with idle styling; available actions like “Create room” and “Host start” are enabled.
- hover: Pointer over the control; increase elevation and brighten border for desktop readability.
- focus: Keyboard focus; show a visible focus ring with minimum 3:1 contrast against the dark HUD.
- active: Pointer down or Enter/Space pressed; slightly compress and intensify fill.
- loading: `loading={true}`; show spinner, keep label visible, disable repeat clicks.
- disabled: `disabled={true}` or unavailable host-only action when non-host; reduce contrast and block focus activation.
- error: Used only when the action is invalid, such as joining with an empty room code; show danger tint.
- empty: Not applicable visually; if rendered with no label, must be icon-only with `ariaLabel`.

**Accessibility**
- Role: native `button`
- ARIA: `aria-disabled="true"` when disabled; `aria-busy="true"` when loading; `aria-label` required for icon-only usage.
- Keyboard: `Tab` focus, `Enter` activate, `Space` activate, `Shift+Tab` reverse focus.
- Screen reader: Announce label, disabled/loading state, and destructive variant context where relevant, e.g. “Start match, button, disabled”.

**Usage Rules**
- SHOULD be used for lobby and match actions, such as the host’s “Start match” control and the “Replay to lobby” action after a winner is shown.
- MUST NOT be used for inline toggles like muting a label or switching a HUD mode; those should use `Toggle`.
- DO: Use `Button` for “Join room” on the landing screen.
- DON’T: Use a clickable `div` for “Host start” in the lobby.

---

### Input

**Purpose**
Single-line text entry for player name and room code.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `value` | `string` | yes | — | Controlled input value. |
| `name` | `string` | yes | — | Field name for forms. |
| `type` | `'text' \| 'password' \| 'email' \| 'search' \| 'url' \| 'number'` | no | `'text'` | Native input type. |
| `placeholder` | `string` | no | — | Hint text for empty entry. |
| `disabled` | `boolean` | no | `false` | Prevents editing. |
| `readOnly` | `boolean` | no | `false` | Displays value without editing. |
| `autoComplete` | `string` | no | `'off'` | Browser autocomplete hint. |
| `maxLength` | `number` | no | — | Maximum allowed length. |
| `inputMode` | `'text' \| 'numeric' \| 'email' \| 'tel' \| 'url' \| 'search' \| 'decimal' \| 'none'` | no | `'text'` | Virtual keyboard hint. |
| `ariaLabel` | `string` | yes | — | Accessible label when no visible `<label>` is present. |
| `ariaDescribedBy` | `string` | no | — | IDs of helper/error text. |
| `onChange` | `(value: string) => void` | yes | — | Updates controlled state. |
| `onKeyDown` | `(event: React.KeyboardEvent<HTMLInputElement>) => void` | no | — | Handles Enter to submit join/create forms. |

**States**
- default: Empty or filled field with idle border.
- hover: Pointer over the field; border brightens.
- focus: Text cursor active; visible ring and caret contrast increase.
- active: Typing state; input text changes and caret remains visible.
- loading: Not a standard input state; when the form submits, the input may be temporarily disabled.
- error: Invalid name or room code, e.g. empty name before create/join; show danger border and message.
- disabled: Form is locked while reconnecting or when match state prevents editing.
- empty: No value entered; placeholder is visible and submit buttons may remain disabled.

**Accessibility**
- Role: native `textbox`
- ARIA: `aria-invalid="true"` when validation fails; `aria-describedby` must reference helper/error text; `aria-required="true"` for required fields.
- Keyboard: `Tab` focus, typing updates text, `Enter` can submit the surrounding form if allowed.
- Screen reader: Announce label, required status, and validation message after error state changes.

**Usage Rules**
- SHOULD be used for the landing lobby name field and the room code join field.
- MUST NOT be used for multi-line notes, chat, or long instructions; those are excluded and would use `TextArea` only if ever added.
- DO: Use `Input` for entering the room code before joining.
- DON’T: Use `Select` to force a player name from a fixed list, since anonymous room-based identity is manual.

---

### TextArea

**Purpose**
Multi-line text entry for future-safe UI patterns; in this MVP it is only acceptable for internal admin or debug surfaces, which are not part of the shipped game.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `value` | `string` | yes | — | Controlled content. |
| `name` | `string` | yes | — | Field name. |
| `placeholder` | `string` | no | — | Empty-state hint. |
| `disabled` | `boolean` | no | `false` | Prevents editing. |
| `readOnly` | `boolean` | no | `false` | Displays content without editing. |
| `rows` | `number` | no | `3` | Visible row count. |
| `maxLength` | `number` | no | — | Maximum characters allowed. |
| `ariaLabel` | `string` | yes | — | Accessible label when no visible label is present. |
| `ariaDescribedBy` | `string` | no | — | IDs of helper/error text. |
| `onChange` | `(value: string) => void` | yes | — | Updates controlled content. |

**States**
- default: Empty or filled multi-line field.
- hover: Border highlight on pointer hover.
- focus: Strong visible ring and caret.
- active: Text editing and scrolling.
- loading: Not applicable; disable when parent action is loading.
- error: Validation failure; show danger styling.
- disabled: Editing blocked.
- empty: Placeholder visible.

**Accessibility**
- Role: native `textbox`
- ARIA: `aria-multiline="true"` implicitly via textarea; `aria-invalid` and `aria-describedby` when needed.
- Keyboard: Standard text editing keys, `Tab` to move focus, `Enter` inserts newline.
- Screen reader: Announce multiline field and error text.

**Usage Rules**
- SHOULD be reserved for non-MVP extension surfaces; this build plan does not require it in player-facing flows.
- MUST NOT be used for name entry, room code entry, or any match control.
- DO: Keep this component available in the library for future support notes.
- DON’T: Use `TextArea` for room code input.

---

### Select

**Purpose**
Single-choice dropdown for settings that have multiple discrete options; in this MVP it is only appropriate for internal debug or future configuration, not player-visible match setup.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `value` | `string` | yes | — | Selected option value. |
| `name` | `string` | yes | — | Field name. |
| `options` | `ReadonlyArray<{ label: string; value: string; disabled?: boolean }>` | yes | — | Available options. |
| `disabled` | `boolean` | no | `false` | Prevents interaction. |
| `ariaLabel` | `string` | yes | — | Accessible label when no visible label is present. |
| `ariaDescribedBy` | `string` | no | — | IDs of helper/error text. |
| `onChange` | `(value: string) => void` | yes | — | Updates selected option. |

**States**
- default: Current selection shown.
- hover: Dropdown control highlight.
- focus: Visible ring.
- active: Menu open or option selected.
- loading: Parent may disable during server wake-up.
- error: Invalid selection.
- disabled: Greyed out and non-interactive.
- empty: Placeholder option shown when no value is selected.

**Accessibility**
- Role: native `combobox` via `<select>`
- ARIA: `aria-invalid` when needed; `aria-describedby` for helper/error text.
- Keyboard: `Tab` focus, `ArrowUp/ArrowDown` navigate options, `Enter` confirms, `Space` opens on some browsers.
- Screen reader: Announce current option and total options.

**Usage Rules**
- SHOULD NOT appear in the MVP UI because room creation has no custom settings.
- MUST NOT be used to choose a room, player identity, or match phase.
- DO: Keep it only for future debug settings.
- DON’T: Use `Select` for host start eligibility.

---

### Checkbox

**Purpose**
Binary yes/no control for future preference toggles; not part of the shipped player-facing MVP flow.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `checked` | `boolean` | yes | — | Current state. |
| `name` | `string` | yes | — | Field name. |
| `disabled` | `boolean` | no | `false` | Prevents toggle. |
| `indeterminate` | `boolean` | no | `false` | Mixed state when needed. |
| `ariaLabel` | `string` | yes | — | Accessible label when no visible text exists. |
| `onChange` | `(checked: boolean) => void` | yes | — | Toggles state. |

**States**
- default: Unchecked or checked.
- hover: Box highlight.
- focus: Visible ring.
- active: Checkbox toggles immediately.
- loading: Parent may block changes.
- error: Invalid combination state.
- disabled: Locked state.
- empty: Unchecked default.

**Accessibility**
- Role: native `checkbox`
- ARIA: `aria-checked`, `aria-disabled`, `aria-describedby` when necessary.
- Keyboard: `Space` toggles, `Tab` navigates.
- Screen reader: Announces checked/unchecked/indeterminate state.

**Usage Rules**
- SHOULD be used only if future options are added; this MVP has no checkbox-driven settings.
- MUST NOT be used for the host start action or replay flow.
- DO: Use for a hypothetical “remember name” toggle if added later.
- DON’T: Use for selecting the match winner or phase.

---

### Radio

**Purpose**
Mutually exclusive choice control for future settings groups; not required by the current MVP.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `checked` | `boolean` | yes | — | Whether this option is selected. |
| `name` | `string` | yes | — | Group name. |
| `value` | `string` | yes | — | Option value. |
| `disabled` | `boolean` | no | `false` | Prevents selection. |
| `ariaLabel` | `string` | yes | — | Accessible label when no visible text exists. |
| `onChange` | `(value: string) => void` | yes | — | Selects this option. |

**States**
- default: Unselected/selected.
- hover: Focused pointer affordance.
- focus: Ring appears.
- active: Selection changes.
- loading: Group may be disabled.
- error: Invalid group state.
- disabled: Non-interactive.
- empty: No selection selected within the group.

**Accessibility**
- Role: native `radio`
- ARIA: Grouped under a `radiogroup`; `aria-checked` managed by native input; `aria-describedby` when needed.
- Keyboard: `ArrowLeft/ArrowUp` previous, `ArrowRight/ArrowDown` next, `Space` selects.
- Screen reader: Announces selected radio and its group.

**Usage Rules**
- SHOULD NOT appear in MVP because there are no room settings or game mode picks.
- MUST NOT be used to switch between lobby and match screens.
- DO: Reserve for future predefined options if balancing panels are added.
- DON’T: Use radios for host-only actions.

---

### Toggle

**Purpose**
Compact on/off switch for future preference switches; not used in the core MVP flow.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `checked` | `boolean` | yes | — | Current toggle state. |
| `disabled` | `boolean` | no | `false` | Prevents changes. |
| `label` | `string` | yes | — | Human-readable toggle label. |
| `onChange` | `(checked: boolean) => void` | yes | — | Flips the state. |

**States**
- default: On or off.
- hover: Thumb and track brighten.
- focus: Visible ring.
- active: Thumb moves immediately.
- loading: Parent may disable transitions.
- error: Conflicting state.
- disabled: Reduced contrast.
- empty: Off by default.

**Accessibility**
- Role: native `switch`
- ARIA: `aria-checked` reflected by native semantics; `aria-disabled` when blocked.
- Keyboard: `Space` toggles, `Tab` moves focus.
- Screen reader: Announces on/off state clearly.

**Usage Rules**
- SHOULD NOT appear in the MVP UI because there are no optional player settings.
- MUST NOT be used for ready-up, start match, or reconnect behavior.
- DO: Keep as a generic design-system primitive.
- DON’T: Use a toggle for room creation.

---

### Modal

**Purpose**
Centered dialog for short blocking workflows such as confirming a destructive action or showing a small server-warning message over the lobby.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `open` | `boolean` | yes | — | Controls visibility. |
| `title` | `string` | yes | — | Dialog title. |
| `children` | `React.ReactNode` | yes | — | Dialog body content. |
| `primaryActionLabel` | `string` | no | — | Label for the main action button. |
| `secondaryActionLabel` | `string` | no | — | Label for the cancel action button. |
| `onPrimaryAction` | `() => void` | no | — | Main action handler. |
| `onSecondaryAction` | `() => void` | no | — | Cancel/close handler. |
| `onClose` | `() => void` | yes | — | Called when dismissal is requested. |
| `initialFocusRef` | `React.RefObject<HTMLElement>` | no | — | Optional focus target on open. |
| `destructive` | `boolean` | no | `false` | Marks risky actions. |

**States**
- default: Closed or open dialog with background overlay.
- hover: Action buttons brighten on hover.
- focus: Trap focus within the dialog with visible ring on focused element.
- active: Primary/secondary buttons pressed.
- loading: Primary action may be busy; disable dismissal if needed.
- error: Show blocking message inside the modal body.
- disabled: Buttons unavailable while action is pending.
- empty: Body may be text-only with no secondary action.

**Accessibility**
- Role: `dialog`
- ARIA: `aria-modal="true"`, `aria-labelledby` pointing to the title, `aria-describedby` when body content needs announcement.
- Keyboard: `Escape` closes if allowed, `Tab` cycles within dialog, `Enter` triggers primary action when safe.
- Screen reader: Announce title on open and prevent background content from being navigable.

**Usage Rules**
- SHOULD be used sparingly, such as a reconnect warning when the server loses the live room state and the user must return to lobby.
- MUST NOT be used to interrupt active match resolution; that flow must remain readable and deterministic.
- DO: Use a modal to confirm leaving an in-progress room.
- DON’T: Use a modal for the entire match HUD.

---

### Drawer

**Purpose**
Side panel for ancillary information such as expanded room status or compact help; in this MVP it may host a help summary without blocking the game screen.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `open` | `boolean` | yes | — | Controls visibility. |
| `side` | `'left' \| 'right'` | no | `'right'` | Slide-in direction. |
| `title` | `string` | yes | — | Drawer heading. |
| `children` | `React.ReactNode` | yes | — | Drawer body content. |
| `onClose` | `() => void` | yes | — | Closes the drawer. |
| `width` | `number` | no | `320` | Panel width in pixels. |

**States**
- default: Closed or open drawer.
- hover: Interior buttons highlight.
- focus: Focus trap within open drawer if interactive.
- active: Internal control activation.
- loading: Drawer contents may show spinner while data loads.
- error: Show error summary in body.
- disabled: Internal controls blocked.
- empty: Empty drawer body uses empty-state treatment.

**Accessibility**
- Role: `complementary` when non-modal; `dialog` only if focus-trapping and blocking.
- ARIA: `aria-hidden` when closed; `aria-labelledby` when open and titled.
- Keyboard: `Escape` closes, `Tab` navigates internal controls.
- Screen reader: Announces panel opening and title.

**Usage Rules**
- SHOULD be used for optional help or compact status details on the landing/lobby screen if needed.
- MUST NOT be used as the primary navigation between lobby and match; route transitions handle that.
- DO: Use a drawer to explain the meaning of the firing order strip.
- DON’T: Use a drawer to hold the only join-room action.

---

### Toast

**Purpose**
Transient non-blocking status feedback for connection, join success, reconnect, or short error notices.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `id` | `string` | yes | — | Stable toast identifier. |
| `title` | `string` | yes | — | Short message heading. |
| `description` | `string` | no | — | Optional detail text. |
| `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | no | `'info'` | Semantic style. |
| `durationMs` | `number` | no | `4000` | Auto-dismiss interval. |
| `dismissible` | `boolean` | no | `true` | Shows close affordance. |
| `onDismiss` | `() => void` | yes | — | Removes the toast. |

**States**
- default: Visible and readable.
- hover: Pause auto-dismiss when hovered.
- focus: Close control focusable.
- active: Close button pressed.
- loading: Not applicable.
- error: Error variant for failed joins or room creation.
- disabled: Not interactive if dismiss is disabled.
- empty: No toast rendered.

**Accessibility**
- Role: `status` for info/success; `alert` for warning/error.
- ARIA: `aria-live="polite"` for non-critical, `aria-live="assertive"` for critical join failure; `aria-atomic="true"`.
- Keyboard: `Tab` focuses close action, `Enter`/`Space` dismiss.
- Screen reader: Announce title and description once on mount.

**Usage Rules**
- SHOULD be used for “Reconnected to room” or “Server waking, retrying join” messages.
- MUST NOT be used to deliver gameplay-critical information like firing order or hit resolution; those belong in persistent HUD components.
- DO: Show a warning toast when Render is waking.
- DON’T: Use toast for the final winner announcement.

---

### Tooltip

**Purpose**
Small hover/focus hint for dense HUD elements like hearts, sonar, or firing order indicators.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `content` | `React.ReactNode` | yes | — | Tooltip text or node. |
| `children` | `React.ReactElement` | yes | — | Trigger element. |
| `placement` | `'top' \| 'right' \| 'bottom' \| 'left'` | no | `'top'` | Preferred anchor position. |
| `open` | `boolean` | no | `undefined` | Controlled open state. |
| `delayMs` | `number` | no | `300` | Hover delay. |
| `disabled` | `boolean` | no | `false` | Prevents tooltip display. |

**States**
- default: Hidden.
- hover: Appears after delay.
- focus: Appears on keyboard focus.
- active: May remain visible while trigger is active.
- loading: Not applicable.
- error: Can show explanation for invalid states.
- disabled: Hidden.
- empty: No tooltip content; must not render.

**Accessibility**
- Role: `tooltip`
- ARIA: Trigger must reference tooltip content via `aria-describedby`; tooltip should not receive focus.
- Keyboard: `Tab` to trigger, `Escape` dismisses if visible.
- Screen reader: Tooltip text is read as description, not as a separate interactive control.

**Usage Rules**
- SHOULD be used to explain compact HUD indicators, such as “Detected by your private sonar” on silhouette markers.
- MUST NOT be used for essential match status that must be visible without hover on desktop or focus on keyboard.
- DO: Use a tooltip on the firing-order badge in the HUD.
- DON’T: Put the only explanation for the phase timer inside a tooltip.

---

### Badge

**Purpose**
Compact status token for room phase, host role, spectator status, and firing-order position.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `children` | `React.ReactNode` | yes | — | Badge content. |
| `variant` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger'` | no | `'neutral'` | Semantic color. |
| `size` | `'sm' \| 'md'` | no | `'md'` | Visual scale. |
| `icon` | `React.ReactNode` | no | — | Optional leading icon. |
| `title` | `string` | no | — | Native tooltip/title fallback. |

**States**
- default: Static label.
- hover: Slight highlight if interactive parent exists.
- focus: Not focusable by default.
- active: Not interactive.
- loading: May show as pending if used with room connection status.
- error: Red variant for failed connection or invalid room state.
- disabled: Muted if context is unavailable.
- empty: Can collapse if no text is passed.

**Accessibility**
- Role: `status` when announcing live state, otherwise `presentation`
- ARIA: If used for live status, wrap with `aria-live="polite"`; otherwise omit redundant ARIA.
- Keyboard: None by default.
- Screen reader: Announce status changes only when the badge represents live room state.

**Usage Rules**
- SHOULD be used for “Planning”, “Resolution”, “Spectator”, “Host”, and “Eliminated” labels.
- MUST NOT be used in place of a full control when interaction is needed.
- DO: Show “Host” next to the room creator in the player list.
- DON’T: Use a badge as the join-room button.

---

### Avatar

**Purpose**
Compact visual identity marker for player list and firing-order display using initials only, since the MVP has anonymous room-based names.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `name` | `string` | yes | — | Player display name used to derive initials. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | no | `'md'` | Avatar diameter. |
| `status` | `'online' \| 'spectator' \| 'eliminated' \| 'disconnecting'` | no | `'online'` | Presence/status styling. |
| `src` | `string \| undefined` | no | `undefined` | Optional image URL; not required by the MVP. |
| `ariaLabel` | `string` | no | — | Accessible label if initials are not sufficient. |

**States**
- default: Initials visible.
- hover: Slight lift if placed in an interactive row.
- focus: Focus ring only when the avatar is inside a focusable element.
- active: Not interactive on its own.
- loading: Not applicable.
- error: Fallback initials if image fails.
- disabled: Muted if player is disconnected.
- empty: Uses placeholder initials when name is empty; in this MVP names should be required so empty should not occur.

**Accessibility**
- Role: `img` when representing identity visually, otherwise `presentation`
- ARIA: `aria-label` required if meaning is not obvious from adjacent text; ignore `src` if initials suffice.
- Keyboard: None unless wrapped in a control.
- Screen reader: Announce player name and status when used in a row.

**Usage Rules**
- SHOULD be used beside each player name in the lobby and firing order list.
- MUST NOT be used as the sole identifier for a player; always pair with display name.
- DO: Show an avatar chip for “Player 2” in the room lobby list.
- DON’T: Use avatars as clickable controls to start the match.

---

### Card

**Purpose**
Containment surface for lobby panels, HUD blocks, and end-state summaries with consistent framing.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `children` | `React.ReactNode` | yes | — | Card content. |
| `title` | `string` | no | — | Optional heading. |
| `subtitle` | `string` | no | — | Optional supporting text. |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | no | `'md'` | Internal spacing. |
| `interactive` | `boolean` | no | `false` | Enables hover elevation. |
| `tone` | `'surface' \| 'raised' \| 'inset'` | no | `'surface'` | Visual surface variant. |

**States**
- default: Standard surface.
- hover: Slight elevation for interactive cards.
- focus: Visible ring if the card is focusable.
- active: Brief press feedback if interactive.
- loading: Can contain spinner placeholder.
- error: Can frame an error message.
- disabled: Lower contrast if content is unavailable.
- empty: Used with `EmptyState` when no players or no room exists.

**Accessibility**
- Role: `group` or `region` when titled
- ARIA: `aria-labelledby` if a title is present; `aria-describedby` for subtitle/body if needed.
- Keyboard: None unless interactive.
- Screen reader: Announces card title when used as a region.

**Usage Rules**
- SHOULD be used for lobby sections like player list, connection status, and host controls.
- MUST NOT be used to hide essential match state behind collapsible behavior.
- DO: Wrap the room code and copy hint in a card.
- DON’T: Put the whole match timer inside an unlabeled card.

---

### Spinner

**Purpose**
Loading indicator for server wake-up, reconnect, room creation, and short state transitions.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | no | `'md'` | Spinner scale. |
| `label` | `string` | no | `'Loading'` | Accessible loading text. |
| `inline` | `boolean` | no | `false` | Whether to align within text flow. |

**States**
- default: Animated rotation.
- hover: No change.
- focus: Not focusable.
- active: Same as default.
- loading: Primary visible state.
- error: Can be replaced by error text when loading fails.
- disabled: Not applicable.
- empty: Not rendered.

**Accessibility**
- Role: `status`
- ARIA: `aria-live="polite"` and `aria-label` or visible label; ensure one announcement on appearance.
- Keyboard: None.
- Screen reader: Announce the loading label once; avoid repeated updates.

**Usage Rules**
- SHOULD be used in the “Connecting/Waking multiplayer server” state and inside loading buttons.
- MUST NOT be used as the only indicator of failed room creation; pair with text.
- DO: Show a spinner while waiting for the Render server to wake.
- DON’T: Use a spinner in place of the round timer.

---

### EmptyState

**Purpose**
Friendly placeholder when there are no players, no room, or no active match content to show.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `title` | `string` | yes | — | Main empty-state message. |
| `description` | `string` | no | — | Supporting guidance. |
| `icon` | `React.ReactNode` | no | — | Decorative or explanatory icon. |
| `actionLabel` | `string` | no | — | Optional action button label. |
| `onAction` | `() => void` | no | — | Primary action callback. |

**States**
- default: Neutral placeholder.
- hover: Action button may highlight.
- focus: Action button gets ring.
- active: Primary action pressed.
- loading: Action may be disabled while loading.
- error: Can present a retry state, e.g. join failed.
- disabled: Action unavailable.
- empty: This is the intended state.

**Accessibility**
- Role: `status` when it represents live empty room status, otherwise `region`
- ARIA: `aria-labelledby` on the container if titled; `aria-describedby` for description.
- Keyboard: Action button follows Button rules.
- Screen reader: Announces title and guidance when shown.

**Usage Rules**
- SHOULD be used when the lobby is empty or when a reconnect cannot restore the live room state and the user is returned to lobby.
- MUST NOT be used to represent active match content.
- DO: Show an empty state when a player joins before others have arrived.
- DON’T: Replace the player list with an empty state while players are still connected.

---

### ErrorBoundary

**Purpose**
Resilient fallback wrapper for rendering failures in the Phaser UI or overlay components so the app can recover to a safe lobby-level error state.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `children` | `React.ReactNode` | yes | — | Protected subtree. |
| `fallback` | `React.ReactNode` | no | — | Optional custom fallback UI. |
| `onError` | `(error: Error, errorInfo: React.ErrorInfo) => void` | no | — | Observability hook. |
| `resetKeys` | `ReadonlyArray<string \| number>` | no | `[]` | Resets boundary when keys change. |

**States**
- default: Child subtree renders normally.
- hover: Not applicable.
- focus: Fallback UI may contain a retry button with focus treatment.
- active: Retry action activates.
- loading: Can show spinner while resetting.
- error: Child render failure; display fallback with recovery path.
- disabled: Not applicable.
- empty: If fallback is empty, must still provide a visible recovery path.

**Accessibility**
- Role: `alert`
- ARIA: `aria-live="assertive"` for critical render failures; fallback must include readable error summary and a recovery button.
- Keyboard: Focus first actionable control in fallback; `Tab` cycles within any dialog-like fallback.
- Screen reader: Announce that the app encountered a problem and offer return-to-lobby or retry context.

**Usage Rules**
- SHOULD be wrapped around route screens and the Phaser game canvas so one component crash does not kill the session UI.
- MUST NOT be used to mask deterministic gameplay errors on the server; those must surface as explicit match status or reconnect flows.
- DO: Use an error boundary around the match HUD.
- DON’T: Let the app white-screen without a recovery button.

---

### AppShell

**Purpose**
Top-level desktop-first layout shell that frames the lobby, match HUD, reconnect state, and results view with a stable dark competitive-game presentation.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `children` | `React.ReactNode` | yes | — | Routed page content. |
| `screen` | `'landing' \| 'lobby' \| 'match' \| 'results' \| 'connecting'` | yes | — | Current app screen for shell styling. |
| `showTopBar` | `boolean` | no | `true` | Whether to show the top bar area. |
| `roomCode` | `string \| undefined` | no | `undefined` | Current room code, if available. |

**States**
- default: Standard shell framing.
- hover: Shell itself does not react; nested controls do.
- focus: Provides visible focus containment when route changes.
- active: Screen-specific panels animate in.
- loading: Used during connecting/waking or initial room restore.
- error: Can display a shell-level message if the app cannot recover.
- disabled: Child actions may be disabled during reconnect.
- empty: Landing state can appear mostly empty with only the form panel.

**Accessibility**
- Role: `application` only if the Phaser canvas is the active interactive surface; otherwise `document`
- ARIA: Main content region should be labeled by the current screen heading.
- Keyboard: Supports normal document tab order; no custom trap outside modal contexts.
- Screen reader: Announces screen changes via heading updates and live region messages.

**Usage Rules**
- SHOULD be used as the persistent outer wrapper for every route screen.
- MUST NOT be used to hide the difference between landing, match, and results.
- DO: Keep the room code visible in the shell once a room exists.
- DON’T: Place gameplay controls in an unlabeled shell footer.

---

### ConnectionStatusPill

**Purpose**
Shows live multiplayer connectivity, including connecting, waking, connected, reconnecting, and disconnected states.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `status` | `'connecting' \| 'waking' \| 'connected' \| 'reconnecting' \| 'disconnected' \| 'error'` | yes | — | Connection lifecycle state. |
| `message` | `string` | no | — | Optional human-readable explanation. |
| `showSpinner` | `boolean` | no | `true` | Renders spinner during transient states. |
| `compact` | `boolean` | no | `false` | Reduced size for dense HUD placement. |

**States**
- default: Connected or stable state.
- hover: Tooltip or explanatory cue may appear.
- focus: If interactive, shows focus ring.
- active: Not normally interactive.
- loading: `connecting`, `waking`, or `reconnecting` show spinner.
- error: `error` or `disconnected` show danger styling.
- disabled: Not interactive while server cannot be reached.
- empty: No status text; should not happen in the shipped UI.

**Accessibility**
- Role: `status`
- ARIA: `aria-live="polite"` for connecting/reconnecting and `aria-live="assertive"` for disconnect/error; `aria-atomic="true"`.
- Keyboard: None by default.
- Screen reader: Announces state transitions such as “Waking multiplayer server” and “Reconnected to room”.

**Usage Rules**
- SHOULD be used on landing, lobby, and reconnect screens because Render Free may sleep.
- MUST NOT be the only indicator of a critical join failure; pair with explicit error text or retry action.
- DO: Show “Waking multiplayer server” while retrying the WebSocket connection.
- DON’T: Hide room loss behind a generic “offline” dot.

---

### RoomCodeField

**Purpose**
Displays the current room code and provides a copyable reference for friends joining the room.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `roomCode` | `string` | yes | — | The active room code. |
| `onCopy` | `() => void` | no | — | Optional copy-to-clipboard action. |
| `copied` | `boolean` | no | `false` | Indicates recent copy success. |
| `readonly` | `boolean` | no | `true` | Prevents editing; this is display-only. |

**States**
- default: Code displayed with copy affordance.
- hover: Copy affordance highlights.
- focus: Copy button gets ring.
- active: Copy action pressed.
- loading: Copy may be disabled during reconnect.
- error: Invalid room code should not render; show room loss state instead.
- disabled: Copy unavailable if no code exists.
- empty: No code means the component should not mount.

**Accessibility**
- Role: `group`
- ARIA: Label the group as “Room code”; copy action must have `aria-label="Copy room code"`.
- Keyboard: `Tab` reaches copy control; `Enter`/`Space` copies.
- Screen reader: Announces the code text and copy result, e.g. “Room code copied”.

**Usage Rules**
- SHOULD be used in the lobby so players can share the join code.
- MUST NOT be editable by the user; room codes come from the server.
- DO: Show the current code in a prominent lobby panel.
- DON’T: Let players type over the server-issued code.

---

### NameEntryForm

**Purpose**
Captures the anonymous display name needed to create or join a room.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `name` | `string` | yes | — | Controlled player name value. |
| `onNameChange` | `(value: string) => void` | yes | — | Updates the name. |
| `onSubmit` | `() => void` | yes | — | Submits the current name for create/join flows. |
| `submitting` | `boolean` | no | `false` | Shows pending state during room creation/joining. |
| `errorMessage` | `string \| undefined` | no | `undefined` | Validation or server error message. |

**States**
- default: Idle form.
- hover: Submit button hover.
- focus: Name input focus ring.
- active: Typing and submit activation.
- loading: Submitting room join/create request.
- error: Empty or invalid display name; show inline error.
- disabled: Form disabled while reconnecting to an existing room.
- empty: Empty name field before first entry.

**Accessibility**
- Role: `form`
- ARIA: Form label must identify the purpose; error text referenced by `aria-describedby`; submit button announces pending state.
- Keyboard: `Tab` between field and button, `Enter` submits from the input if valid.
- Screen reader: Announces validation errors after submit.

**Usage Rules**
- SHOULD be used on the landing lobby before any room exists.
- MUST NOT be used after the user has already joined and the server session is established unless reconnect recovery requires it.
- DO: Ask for a name before create-room.
- DON’T: Force a name change mid-match.

---

### CreateRoomButton

**Purpose**
Dedicated action for starting a new room from the landing lobby.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `disabled` | `boolean` | no | `false` | Blocks creation while invalid or pending. |
| `loading` | `boolean` | no | `false` | Indicates room creation in progress. |
| `onCreate` | `() => void` | yes | — | Starts a new room request. |

**States**
- default: Available create action.
- hover: Highlighted.
- focus: Ring visible.
- active: Pressed and queued.
- loading: Room request in flight.
- error: Creation failed; should defer to toast or inline error.
- disabled: Missing name or connecting.
- empty: Not applicable.

**Accessibility**
- Role: native `button`
- ARIA: `aria-busy="true"` during loading; `aria-disabled="true"` when unavailable.
- Keyboard: `Enter`/`Space` activate.
- Screen reader: Announces “Create room” and loading state.

**Usage Rules**
- SHOULD be used only on the landing screen where the player begins a room.
- MUST NOT be reused as a generic action button for every screen.
- DO: Put it next to the name entry field on landing.
- DON’T: Place it inside the match HUD.

---

### JoinRoomForm

**Purpose**
Collects a room code and submits a join request to the authoritative server.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `roomCode` | `string` | yes | — | Controlled room code entry. |
| `onRoomCodeChange` | `(value: string) => void` | yes | — | Updates the join code. |
| `onSubmit` | `() => void` | yes | — | Submits the join request. |
| `submitting` | `boolean` | no | `false` | Shows pending state during connection or join. |
| `errorMessage` | `string \| undefined` | no | `undefined` | Inline join error, such as invalid code or full active room state. |

**States**
- default: Idle join form.
- hover: Submit button hover.
- focus: Code field ring.
- active: Typing and submit activation.
- loading: Joining or reconnecting.
- error: Invalid code, expired room, or server wake failure; show inline error.
- disabled: Disabled while already connected or while retrying restore.
- empty: No code entered; submit disabled.

**Accessibility**
- Role: `form`
- ARIA: `aria-describedby` ties the field to helper/error text; submit button has pending state.
- Keyboard: `Tab` into field and button, `Enter` submits from the input if valid.
- Screen reader: Announces validation and server failures.

**Usage Rules**
- SHOULD be used on the landing screen to join a room with a code.
- MUST NOT be exposed as a spectating control; late joiners become spectators automatically if the match is active.
- DO: Let a friend paste the room code and join.
- DON’T: Add a “spectate” checkbox to the join form.

---

### LobbyPlayerList

**Purpose**
Shows the current room roster, host ownership, and spectator/eliminated status before and between matches.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `players` | `ReadonlyArray<{ id: string; name: string; hearts: 0 \| 1 \| 2 \| 3; role: 'host' \| 'player' \| 'spectator' \| 'eliminated'; connected: boolean }>` | yes | — | Current room roster. |
| `currentPlayerId` | `string` | yes | — | Marks the local player row. |
| `showHearts` | `boolean` | no | `true` | Displays heart count where relevant. |
| `canHostStart` | `boolean` | no | `false` | Highlights whether the host action is available. |

**States**
- default: Player rows visible and sorted by room order.
- hover: Rows highlight if interactive for copy/view affordances.
- focus: Keyboard focus lands on row actions only.
- active: Selected row action, if any, is pressed.
- loading: Skeleton or spinner while roster is being restored.
- error: Connection problem or room loss; show fallback banner above list.
- disabled: During reconnect, list is visible but actions are unavailable.
- empty: No players yet; show empty-state guidance until at least two players arrive.

**Accessibility**
- Role: `list`
- ARIA: Each row must expose player name and role; local player row should be announced as “You”.
- Keyboard: If row actions exist, `Tab` moves through them; otherwise list is static.
- Screen reader: Announce player joins/leaves and role changes via live region outside the list.

**Usage Rules**
- SHOULD be used in the lobby to show who is present before the host starts.
- MUST NOT be used to reveal hidden opponent positions during planning.
- DO: Show “Host” beside the room creator.
- DON’T: Show live positions in the roster during the planning phase.

---

### HostStartPanel

**Purpose**
Encapsulates the host-only start control and the minimum-player readiness message.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `canStart` | `boolean` | yes | — | Whether the host can start the match. |
| `minimumPlayersMet` | `boolean` | yes | — | Indicates the room has at least two players. |
| `onStart` | `() => void` | yes | — | Starts the match on the authoritative server. |
| `busy` | `boolean` | no | `false` | Shows pending start request. |
| `reason` | `string \| undefined` | no | `undefined` | Explains why start is blocked. |

**States**
- default: Host can start or sees readiness guidance.
- hover: Start button highlights.
- focus: Start button focus ring.
- active: Start request sent.
- loading: Waiting for server confirmation.
- error: Start failed; show reason text.
- disabled: Non-hosts or insufficient players cannot act.
- empty: If no host exists, this panel should not render.

**Accessibility**
- Role: `region`
- ARIA: Region labeled “Host controls”; reason text referenced by `aria-describedby`; start button exposes busy state.
- Keyboard: `Tab` to button, `Enter`/`Space` start when enabled.
- Screen reader: Announces why the match cannot start when minimum players are not met.

**Usage Rules**
- SHOULD be used only in the lobby and only visible to the host.
- MUST NOT be available to spectators or non-host players as an active control.
- DO: Show “Need 2 players to start” until the lobby is ready.
- DON’T: Allow everyone in the room to press start.

---

### MatchPhaseBanner

**Purpose**
Large clear label for the current match phase, such as planning, resolution, winner, or reconnect fallback.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `phase` | `'planning' \| 'resolution' \| 'winner' \| 'spectating' \| 'reconnecting'` | yes | — | Current match or session phase. |
| `message` | `string` | no | — | Optional supporting line. |
| `accent` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger'` | no | `'info'` | Color emphasis. |

**States**
- default: Visible phase label.
- hover: Not interactive.
- focus: Not focusable.
- active: Not interactive.
- loading: Reconnecting phase may pulse subtly.
- error: Error-related phase shows danger accent.
- disabled: Not applicable.
- empty: If no phase is known, it must not render.

**Accessibility**
- Role: `status`
- ARIA: `aria-live="polite"` for planning/resolution changes; `aria-live="assertive"` for winner or reconnect loss.
- Keyboard: None.
- Screen reader: Announces phase changes immediately, e.g. “Resolution phase”.

**Usage Rules**
- SHOULD be used at the top of the match screen to keep planning and resolution clearly labeled.
- MUST NOT be replaced by subtle color alone.
- DO: Label the screen “Planning”.
- DON’T: Depend only on the background animation to indicate the phase.

---

### RoundTimer

**Purpose**
Displays the countdown for the 10-second planning phase and any short resolution pause using server timestamps.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `phase` | `'planning' \| 'resolution'` | yes | — | Phase the timer applies to. |
| `expiresAtMs` | `number` | yes | — | Server timestamp in milliseconds when the phase ends. |
| `nowMs` | `number` | yes | — | Client-synchronized current time in milliseconds. |
| `label` | `string` | no | — | Optional override label. |
| `warnAtSeconds` | `number` | no | `3` | Threshold for urgency styling. |

**States**
- default: Countdown shown with stable pacing.
- hover: Not interactive.
- focus: Not focusable.
- active: Digits update each tick.
- loading: If time cannot be synchronized, show syncing text.
- error: If timing is unknown, show “Timer unavailable” and defer to server state.
- disabled: Not applicable.
- empty: If no phase timer exists, do not render.

**Accessibility**
- Role: `timer`
- ARIA: `aria-live="polite"` with restrained updates; do not announce every tick if it becomes noisy, only significant changes and phase transitions.
- Keyboard: None.
- Screen reader: Announce phase label and remaining seconds at meaningful intervals and when warning threshold is crossed.

**Usage Rules**
- SHOULD be used in the match HUD because planning duration is central to the gameplay loop.
- MUST NOT be hand-timed on the client; it must reflect server timestamps.
- DO: Show “Planning ends in 3s”.
- DON’T: Use a local `setInterval` as the authoritative timer.

---

### HeartMeter

**Purpose**
Shows each player’s remaining health as three hearts and updates when damage or elimination occurs.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `hearts` | `0 \| 1 \| 2 \| 3` | yes | — | Remaining hearts. |
| `maxHearts` | `3` | no | `3` | Fixed maximum hearts for this MVP. |
| `label` | `string` | yes | — | Player name or “You”. |
| `compact` | `boolean` | no | `false` | Smaller HUD display. |
| `showNumeric` | `boolean` | no | `false` | Also shows “x/3”. |

**States**
- default: Shows current hearts.
- hover: Tooltip may explain heart meaning.
- focus: Not focusable by default.
- active: Heart count updates immediately on hit.
- loading: If state is pending after reconnection, show the last known value with syncing styling.
- error: If health data is absent, show unknown state and request room sync.
- disabled: Eliminated players show dimmed or crossed-out style.
- empty: `0` hearts indicates eliminated and should be paired with elimination status.

**Accessibility**
- Role: `status`
- ARIA: `aria-live="polite"` on heart changes; when `0`, announce elimination as “Eliminated”.
- Keyboard: None.
- Screen reader: Announce remaining hearts after damage events.

**Usage Rules**
- SHOULD be used for the local player and visible roster summaries in the match HUD.
- MUST NOT be used to reveal hidden enemy positions or extra stats.
- DO: Show three hearts at match start.
- DON’T: Replace the elimination label with just a heart icon.

---

### FiringOrderStrip

**Purpose**
Displays the upcoming and active shot order so players can see the round’s resolution sequence before and during firing.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `order` | `ReadonlyArray<{ playerId: string; name: string; eliminated: boolean }>` | yes | — | Current firing order. |
| `activePlayerId` | `string \| undefined` | no | `undefined` | Shooter currently resolving. |
| `localPlayerId` | `string` | yes | — | Identifies the local player in the strip. |
| `showUpcomingLabel` | `boolean` | no | `true` | Whether to label the next shooter. |

**States**
- default: Shows upcoming order during planning.
- hover: Each chip may highlight if focusable.
- focus: If individual chips are focusable, the current item gets ring.
- active: Active shooter is emphasized during resolution.
- loading: While order is being restored, show skeleton chips.
- error: If order is unknown, show fallback status and request sync.
- disabled: Eliminated players are dimmed and non-interactive.
- empty: If no order exists yet, show an empty hint until a round is seeded.

**Accessibility**
- Role: `list`
- ARIA: The active shooter should be conveyed via `aria-current="true"` on the active item; use `aria-live="polite"` for active-shooter changes.
- Keyboard: Static list by default; if chips are focusable, `Tab` enters and arrow keys may move between chips.
- Screen reader: Announces order and current shooter, e.g. “Upcoming order, Alice, you, Ben”.

**Usage Rules**
- SHOULD be used during planning to clearly show the upcoming firing order and during resolution to show the current shooter.
- MUST NOT be used to reveal hidden positions or aim lines.
- DO: Highlight the active shooter during sequential resolution.
- DON’T: Hide the order until the end of planning.

---

### SonarSweepOverlay

**Purpose**
Renders the local player’s private rotating sonar wedge and visual sweep timing during planning.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `playerId` | `string` | yes | — | Local player identifier. |
| `origin` | `{ x: number; y: number }` | yes | — | World-space center for the sonar. |
| `angleRad` | `number` | yes | — | Current sweep angle in radians. |
| `widthRad` | `number` | yes | — | Wedge width in radians. |
| `radiusPx` | `number` | yes | — | Sweep radius in pixels. |
| `phase` | `'planning' \| 'resolution'` | yes | — | Shows only during planning. |
| `opacity` | `number` | no | `0.35` | Alpha for the wedge. |

**States**
- default: Sweeping wedge animates.
- hover: Not interactive.
- focus: Not focusable.
- active: Sweep rotates continuously.
- loading: If gameplay values are syncing, show a subdued wedge.
- error: If sweep timing is unknown, hide and show a sync warning elsewhere.
- disabled: Not shown during resolution.
- empty: If phase is not planning, render nothing.

**Accessibility**
- Role: `presentation`
- ARIA: Hidden from assistive tech because it is a visual-only tactical aid.
- Keyboard: None.
- Screen reader: No announcement; detection announcements must come from separate status text.

**Usage Rules**
- SHOULD be used only for the local player during planning because sonar is private.
- MUST NOT be broadcast to other clients or visible during resolution.
- DO: Render the wedge around the local character.
- DON’T: Use the sonar overlay as a global pulse or shared scan.

---

### AimLineOverlay

**Purpose**
Shows the local player’s private committed aim direction while planning and the locked firing line during resolution.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `origin` | `{ x: number; y: number }` | yes | — | Firing origin in world coordinates. |
| `end` | `{ x: number; y: number }` | yes | — | End point for the rendered line. |
| `locked` | `boolean` | yes | — | Whether the line is frozen. |
| `phase` | `'planning' \| 'resolution'` | yes | — | Rendering context. |
| `visibleToLocalPlayerOnly` | `boolean` | no | `true` | Prevents unintended shared exposure. |

**States**
- default: Visible aim preview during planning.
- hover: Not interactive.
- focus: Not focusable.
- active: Updates as mouse position changes in planning.
- loading: If aim is being restored after reconnect, show last known line.
- error: If aim is unavailable, hide line and request sync.
- disabled: Hidden for spectators and eliminated players when no longer relevant.
- empty: No line if the player has no active aim.

**Accessibility**
- Role: `presentation`
- ARIA: Hidden from screen readers because this is a visual projection.
- Keyboard: None; aim changes are driven by mouse movement and server sync.
- Screen reader: Use separate textual status for “shot locked” and phase transitions.

**Usage Rules**
- SHOULD be used for the local player in planning, then for all players’ locked lines in resolution when revealed.
- MUST NOT be shown for unauthorized opponents during planning.
- DO: Draw the locked line at resolution for everyone.
- DON’T: Expose live opponent aim during planning.

---

### DetectionSilhouette

**Purpose**
Shows a fading silhouette snapshot of an opponent detected by the local player’s sonar at the detected position.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `playerId` | `string` | yes | — | Detected player identifier. |
| `position` | `{ x: number; y: number }` | yes | — | Snapshot position when detected. |
| `expiresAtMs` | `number` | yes | — | Timestamp when the silhouette should fully fade. |
| `detectedByPlayerId` | `string` | yes | — | Owner of the private detection. |
| `opacityCurve` | `'linear' \| 'ease-out'` | no | `'ease-out'` | Fade behavior. |

**States**
- default: Fresh silhouette visible.
- hover: Not interactive.
- focus: Not focusable.
- active: Remains fixed at the snapshot position.
- loading: If detection state is restored, show the current fade progress.
- error: If detection metadata is incomplete, do not render.
- disabled: Expired silhouettes are removed.
- empty: No detection event means no silhouette.

**Accessibility**
- Role: `presentation`
- ARIA: Hidden from assistive tech because this is a private visual clue.
- Keyboard: None.
- Screen reader: If needed, detection should be announced in nearby text such as “Sonar contact detected”.

**Usage Rules**
- SHOULD be used only for the detecting player and must fade without following later movement.
- MUST NOT be a persistent enemy outline or shared team marker.
- DO: Show a brief fading echo of the opponent’s detected position.
- DON’T: Update the silhouette as the opponent moves afterward.

---

### MatchHud

**Purpose**
Composes the in-match information layout: phase banner, timer, health, firing order, and planning/resolution labels.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `phase` | `'planning' \| 'resolution' \| 'winner' \| 'spectating' \| 'reconnecting'` | yes | — | Current match phase. |
| `timer` | `React.ReactNode` | yes | — | RoundTimer instance. |
| `health` | `React.ReactNode` | yes | — | HeartMeter instance. |
| `firingOrder` | `React.ReactNode` | yes | — | FiringOrderStrip instance. |
| `banner` | `React.ReactNode` | yes | — | MatchPhaseBanner instance. |
| `statusMessage` | `string \| undefined` | no | `undefined` | Additional explanatory text. |

**States**
- default: Match HUD visible.
- hover: Child controls respond individually.
- focus: HUD sections remain reachable in tab order where applicable.
- active: Updates as the match progresses.
- loading: Shows reconnecting status if room state is syncing.
- error: Displays failure banner and recovery hint.
- disabled: Non-interactive visual shell.
- empty: If no match exists, the HUD should not render.

**Accessibility**
- Role: `region`
- ARIA: `aria-labelledby` tied to the phase banner title; `aria-describedby` for status message.
- Keyboard: No custom interaction unless embedded controls are present.
- Screen reader: Announces phase changes and any critical match status updates.

**Usage Rules**
- SHOULD be used on every active match screen.
- MUST NOT hide the important status labels behind collapsible panels.
- DO: Combine timer, hearts, and order into one stable HUD.
- DON’T: Scatter match-critical state across unrelated panels.

---

### WinnerPanel

**Purpose**
Displays the match winner and a concise end-of-round summary before returning to the lobby.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `winnerName` | `string` | yes | — | Winning player display name. |
| `localPlayerWon` | `boolean` | yes | — | Whether the local player won. |
| `onReplayToLobby` | `() => void` | yes | — | Returns the app to lobby flow for another match. |
| `busy` | `boolean` | no | `false` | Indicates replay request in flight. |

**States**
- default: Winner shown.
- hover: Replay button highlights.
- focus: Replay button ring.
- active: Replay pressed.
- loading: Waiting for lobby reset confirmation.
- error: Replay failed; show connection or room-loss message.
- disabled: Replay unavailable while reconnecting or if room is gone.
- empty: No winner means it should not render.

**Accessibility**
- Role: `alertdialog` when it requires acknowledgment, otherwise `region`
- ARIA: `aria-labelledby` for winner heading; `aria-describedby` for summary text.
- Keyboard: `Tab` to replay button, `Enter`/`Space` activate.
- Screen reader: Announce winner immediately when shown.

**Usage Rules**
- SHOULD be used after the last surviving player wins.
- MUST NOT replace the match HUD before resolution has finished.
- DO: Tell players who won and offer replay to lobby.
- DON’T: Auto-advance without showing the winner.

---

### ReplayLobbyButton

**Purpose**
Returns players from the results/winner state to the lobby so they can start a new match.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `loading` | `boolean` | no | `false` | Shows pending replay transition. |
| `disabled` | `boolean` | no | `false` | Blocks activation if room cannot reset. |
| `onReplay` | `() => void` | yes | — | Requests lobby replay/reset. |

**States**
- default: Available replay action.
- hover: Highlighted.
- focus: Ring visible.
- active: Pressed.
- loading: Awaiting room reset.
- error: Replay failed; use toast or inline error text.
- disabled: Unavailable if session is lost.
- empty: Not applicable.

**Accessibility**
- Role: native `button`
- ARIA: `aria-busy="true"` when loading.
- Keyboard: `Enter`/`Space` activate.
- Screen reader: Announces “Return to lobby” and pending state.

**Usage Rules**
- SHOULD be used on the results screen.
- MUST NOT be shown during the planning phase.
- DO: Provide a clear replay path after the winner panel.
- DON’T: Use it as a generic back button during a match.

---

### ReconnectPrompt

**Purpose**
Offers a clear path to restore a live room session after a refresh, temporary disconnect, or server wake event.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `status` | `'waking' \| 'reconnecting' \| 'restoring' \| 'failed'` | yes | — | Current reconnect lifecycle state. |
| `roomCode` | `string \| undefined` | no | `undefined` | Existing room code, if known. |
| `onRetry` | `() => void` | yes | — | Triggers another reconnect attempt. |
| `onReturnToLobby` | `() => void` | yes | — | Sends the player back when restoration is impossible. |
| `busy` | `boolean` | no | `false` | Indicates an in-flight retry. |

**States**
- default: Shows reconnect guidance.
- hover: Retry button highlight.
- focus: Visible ring.
- active: Retry pressed.
- loading: Waking or restoring in progress.
- error: Restoration failed; show explicit failure text.
- disabled: Retry unavailable during hard disconnect.
- empty: No room code may require a simpler lobby return state.

**Accessibility**
- Role: `region`
- ARIA: Region should have an explicit heading; status text should use `aria-live="assertive"` for failure and `polite` for waking/restoring.
- Keyboard: `Tab` to actions, `Enter`/`Space` activate.
- Screen reader: Announces current reconnect phase and next available action.

**Usage Rules**
- SHOULD be used when the server sleeps, the WebSocket drops, or the in-memory match is lost and the user must recover.
- MUST NOT imply the match is still valid if the room state cannot be restored.
- DO: Show “Waking multiplayer server” while retrying.
- DON’T: Hide a lost room behind a silent redirect.

---

### SpectatorNotice

**Purpose**
Explains that the user is watching only because they joined late, were eliminated, or reconnected after the room moved on.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `reason` | `'late_join' \| 'eliminated' \| 'reconnected'` | yes | — | Why the user is spectating. |
| `message` | `string` | no | — | Optional elaboration. |
| `showReturnHint` | `boolean` | no | `false` | Indicates when the next actionable step is to wait for the next match. |

**States**
- default: Visible non-interactive notice.
- hover: No change.
- focus: Not focusable.
- active: Not interactive.
- loading: Not applicable.
- error: If the reason cannot be determined, show a generic spectating notice.
- disabled: Dimmed when tucked into the HUD.
- empty: If user is an active player, do not render.

**Accessibility**
- Role: `status`
- ARIA: `aria-live="polite"` on first appearance.
- Keyboard: None.
- Screen reader: Announces “You are spectating” plus reason.

**Usage Rules**
- SHOULD be shown to late joiners and eliminated players.
- MUST NOT expose hidden positions or give spectator controls, because spectator controls are excluded from v1.
- DO: Explain that joining during active match makes the player a spectator.
- DON’T: Offer camera controls or free-roam options.

---

### PlayerRow

**Purpose**
Reusable roster row for the lobby player list and related status summaries.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `name` | `string` | yes | — | Display name. |
| `role` | `'host' \| 'player' \| 'spectator' \| 'eliminated'` | yes | — | Current room role. |
| `hearts` | `0 \| 1 \| 2 \| 3` | yes | — | Remaining hearts. |
| `connected` | `boolean` | yes | — | Connection presence. |
| `isCurrentPlayer` | `boolean` | no | `false` | Whether this row is the local player. |
| `onClick` | `() => void` | no | — | Optional row action. |

**States**
- default: Standard roster row.
- hover: Highlights if clickable.
- focus: Shows focus ring if interactive.
- active: Pressed state if interactive.
- loading: Can show skeleton while restoring.
- error: Connection disruption or missing state.
- disabled: Non-interactive or eliminated styling.
- empty: Not rendered; use `EmptyState` instead.

**Accessibility**
- Role: `listitem`
- ARIA: Include role, heart count, and current-player hint in the accessible name.
- Keyboard: If clickable, `Enter`/`Space` activate.
- Screen reader: Announce status changes like host assignment or elimination.

**Usage Rules**
- SHOULD be used inside `LobbyPlayerList`.
- MUST NOT be used to represent hidden opponent entities in the arena.
- DO: Show player name, host tag, and three-heart status in the lobby.
- DON’T: Use the row to imply in-world position.

---

### RoomStateSummary

**Purpose**
Compact summary of the current room lifecycle, including room code, player count, phase, and server connectivity.

**Props**
| Prop | Type | Required | Default | Description |
|---|---|---:|---|---|
| `roomCode` | `string \| undefined` | no | `undefined` | Current room code. |
| `playerCount` | `number` | yes | — | Number of connected participants. |
| `phase` | `'landing' \| 'lobby' \| 'planning' \| 'resolution' \| 'results' \| 'reconnecting'` | yes | — | High-level room state. |
| `connectionStatus` | `'connecting' \| 'waking' \| 'connected' \| 'reconnecting' \| 'disconnected' \| 'error'` | yes | — | Current server link status. |

**States**
- default: Summary visible.
- hover: Subtle highlight if interactive.
- focus: Visible ring if focusable.
- active: Not inherently interactive.
- loading: Waking or reconnecting may show activity indicator.
- error: Connection error styling and brief copy.
- disabled: Muted when room data is unavailable.
- empty: No room code yet; show landing summary only.

**Accessibility**
- Role: `status`
- ARIA: `aria-live="polite"` for player count and phase updates; `aria-live="assertive"` for lost connection.
- Keyboard: None unless wrapped in a button or link.
- Screen reader: Announces room code, player count, phase, and connection state succinctly.

**Usage Rules**
- SHOULD be used in the lobby shell so players always know room status.
- MUST NOT replace detailed controls like `HostStartPanel` or `ConnectionStatusPill`.
- DO: Show “Room ABCD — 3 players — Lobby”.
- DON’T: Hide critical reconnect errors inside the summary only.