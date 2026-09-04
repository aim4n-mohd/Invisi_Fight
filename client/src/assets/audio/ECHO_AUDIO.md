# Echo audio provenance

Created in ChipTone 0.5.1 by SFB Games, 2026-09-04. ChipTone's published terms allow its generated sounds under CC0: https://sfbgames.itch.io/chiptone

All five files are original canvas-UI exports, mono 44,100 Hz / 16-bit PCM. No external samples. Walk: dry brown noise; run: brighter pink noise; hit: short white-noise impact; miss: low sine; ambient: low sine with a soft attack/release. All optional effects are off. The ambient bed is intentionally quiet and looped by the audio service.

Validated with the ChipTone skill's WAV validator: walk/run 131.497 ms, hit/miss 111.497 ms, ambient 3001.497 ms. All five passed without errors. Browser download notification timed out, but each exported file was identified by its timestamp and validated before copying into the game.

HUD/ammo revision (2026-09-04): `echo-reload.wav` is an additional original ChipTone BLIP-based, dry pink-noise mechanical clack, with a short attack, decay and release and all effects off. The automatic-only refinement reuses this clip twice via authoritative public sound cues: at reload start (300 ms after empty) and completion (1,800 ms later). Each click uses walking intensity, variance, lifetime and ring styling; only approximate anonymous position is exposed, never live ammo or exact position. There is no additional owner-only playback. Measured 141.497 ms, mono 44,100 Hz / 16-bit PCM, peak 0.095798; validator passed against a 140 ms target (8 ms tolerance). Export timing was refined in ChipTone after the first export missed the target. The browser download notification again timed out; the timestamped WAV was validated before copying.
