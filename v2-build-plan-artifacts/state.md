# V2 planning state

Updated: 2026-08-27

## Status

- Planning package: complete.
- Runtime implementation: Phases 1 through 4, the v2 Phaser gate, and the procedural Three.js round slice are complete.
- Gameplay prototype: the authoritative loop, manual sonar, private Commit locking, paced resolution, Recap, and clarity UI are implemented.
- Playtesting: the five-person clarity playtest remains unverified; no observed-player evidence has been claimed.
- Three.js vertical slice: complete under explicit user direction with procedural temporary geometry.
- Gameplay/UI polish: larger shot hit radius, arena-wide sonar, sonar ping, compact landing flow, and refined HUD are complete.
- Asset acquisition: not started; no external or final visual assets were added.
- Deployment: not started.

## Confirmed user decisions

- 2.5D rather than free/full 3D gameplay.
- Hunt lasts 15 seconds with a very visible countdown.
- Manual sonar has a 3-second cooldown.
- Character speed is reduced modestly.
- Proceed with Hunt -> Commit -> Resolve, explicit shot locking, readable resolution, risk/reward sonar, and two-heart matches.
- The planning-only request was completed first; the user authorized implementation on 2026-08-26.
- The user then explicitly authorized the 2.5D graphics slice with a small player model and a gun that follows mouse aim.
- The user explicitly requested slightly more forgiving shots, sonar coverage across the arena, a sonar ping, and a less wordy, improved UI.

## Current balance values awaiting playtest

- Movement speed: 165 px/s.
- Commit duration: 3 seconds.
- Sonar pulse radius: 1,100 px, covering the full playable arena diagonal.
- Sonar snapshot visibility: 2 seconds.
- Public scanner-origin quantization: 48 px.
- Resolution step: about 1.2 seconds per shooter.
- Recap duration: 1.5 seconds.
- Physical player radius: 16 px; shot hit radius: 22 px.

## Gate state

| Gate                     | State             | Evidence                                                                             |
| ------------------------ | ----------------- | ------------------------------------------------------------------------------------ |
| V1 verification baseline | Passed            | CI, E2E, bundle, and screenshots recorded in `V2_IMPLEMENTATION_PROGRESS.md`.        |
| Rules                    | Passed            | Central configuration, phase lifecycle, and manual sonar contracts pass.             |
| 2D clarity               | Awaiting playtest | Automated browser and responsive visual checks passed; five-person evidence remains. |
| Fun/rematch              | Not started       | Requires playtest after clarity fixes.                                               |
| Cover decision           | Deferred          | Evaluate only after fun gate.                                                        |
| Three.js slice           | Passed locally    | Procedural round slice passed unit, E2E, visual, and local performance checks.       |
| Asset approval           | Blocked           | Human gates and final art/license selection remain open.                             |
| Renderer migration       | In progress       | Three.js is default; Phaser remains an environment-selected fallback.                |
| Release                  | Not started       | Local production build passed; renderer migration and deployment remain.             |

## Implementation-session handoff

Continue with `V2-030` or a separately authorized Phase 7 task; do not infer human playtest, final-art approval, or full renderer cutover from the procedural slice. Preserve unrelated worktree changes, update `V2_IMPLEMENTATION_PROGRESS.md` after every task, and attach evidence before marking any item complete.

`V2-001` through `V2-029` and `V2-035` through `V2-040` are complete. Post-slice polish CI passed 95 tests, all 12 browser scenarios passed, the ChipTone sonar WAV was validated, and desktop/mobile local visual evidence is saved. The clarity gate still requires five new human players and cannot be inferred from automated checks.
