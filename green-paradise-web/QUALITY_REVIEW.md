# 1.2.0 Quality Review

Reviewed base: `b545d5f43a464f59c0fcb74c8b12a84f6c11f722` (published 1.1.8).
Candidate: `codex/green-paradise-quality-120`, web version 1.2.0.
Scope: Part I only, 50 stages. Existing input, save key, record IDs, economy, bosses and story retained.

## Findings And Fixes

- High: Independently generated upper scaffolds and ground mechanics could intersect through their moving ranges. Replaced incidental scaffold stacking with reserved encounter layouts; doors and story spaces keep priority. Layout validation includes lift travel, moving-platform sweeps, steam and falling-icicle columns.
- High: Upper exits could launch a player into a gap or drop them onto a hazard. Added catch platforms and protected reunion spaces. Enemy patrols cannot enter these spaces or room entrances. Flight/jump envelopes and separate patrol lanes are included, rather than checking only spawn positions.
- Medium: Springs, lifts and switches often lacked a clear destination. There are now 198 connected encounter sections, each with a launch mechanism, reward platforms and a return to ground. Later regions combine vertical movement, temporary platforms and ground hazards without extending the stage length again.
- Medium: Cleanup could leave rewards above removed platforms or under overlapping upper ledges. Rewards now retain a source-platform reference; orphaned rewards are removed, and lower landing positions have been widened horizontally. Route tests collect the actual rewards.
- Medium: The fixed-height camera could lose the player on upper jumps, and stationary platforms displayed movement arrows. Added presentation-only vertical camera tracking, leaf trails, distinct fixed ledges and subtle upper-route framing, without more modal hints.
- Low: Room movement ignored purchased speed/jump levels. It now uses the same stats as outside. Zero's third-phase HUD no longer reports the first phase.

## Verification

- `npm test`: 67 tests passed on 2026-09-12, including the existing regression suite plus layout, full enemy motion-envelope, contextual hints and room-upgrade tests.
- Geometry: all 50 layouts have zero unintentional swept-gimmick intersections and zero pickups embedded in gimmicks according to `auditLayout`. An updraft serving its own platform is an explicitly intentional overlap, not silently ignored.
- Traversal: all 50 stages are crossed at starting stats with gimmicks and hazards enabled. All 198 authored routes are independently climbed, their rewards collected, and ground rejoined at both starting and maximum speed/jump levels.
- Browser suites: `layout-browser.cjs`, `campaign-browser.cjs`, `rooms-browser.cjs`, `tutorial-browser.cjs`, `target-browser.cjs`, `delete-save-browser.cjs`. Tests use isolated browser storage, not the player's save.
- Visual inspection: PC and mobile landscape screenshots of the spring crossing, lift balcony, upper camera and switch staircase. Campaign checks include portrait, notebook reading, shop purchase, checkpoint retry and the complete Part I epilogue.

## Limits And Verdict

The navigation tests isolate movement from combat; enemy behavior, patrol envelopes, damage and bosses have separate tests. They do not constitute human combat playthroughs of all 50 stages. Browser mobile emulation is not an iPhone device test. Long-session performance, iOS audio/fullscreen behavior and subjective difficulty still need real-device play before a native App Store release.

Verdict: ready for the existing web release; the listed regression commands passed. No native App Store build or submission is part of this update. No Part II-IV content is implemented. The optional local helper returned HTTP 503; all implementation and validation decisions were made in this task.
