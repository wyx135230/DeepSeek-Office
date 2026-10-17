# Full-body characters — 0.2.2

The earlier 16x16 characters devoted most pixels to the head. Scene humans now
use 16x28 frames: licensed directional heads are combined with original arms,
clothing, trousers and shoes. Twelve frames cover four directions and three
walk poses. The player and every teammate use this pipeline; Momo retains the
original 16x16 dog art. AI outfit colors apply to the new clothing.

The human origin is the foot point at pixel y=26. The unchanged 8x8 physics
body is offset to (4,22), keeping its center on the same world foot coordinate.
Nameplates sit below the feet; status bubbles and interaction prompts clear
the taller sprite. Prompts also clear a visible work bubble using its measured
height. Independent review caught that overlap and confirmed the correction.

Validation:

- 669 tests pass, zero failures. Three character tests cover connected bodies,
  visible legs/shoes in all 12 poses, alternating foot positions, and prompt
  clearance around both a full player and a working teammate's bubble.
- Generated-client check passes. Lint has zero errors and the 13 existing
  upstream warnings. Package audit confirms matching client/source bytes and
  included licenses, with no test profiles or conversations.
- The actual isolated Harness scene was visually inspected. Head, clothing,
  arms, legs and shoes are visible, with nameplates below the characters.
- Native keyboard movement produced right/down/left/up frames 7/4/6/5, matching
  their directional columns. The overview camera remained fixed. Walking north
  stopped at y=244 against the meeting table, preserving the foot collision.
- A development refresh interrupted the first movement observation. The final
  run used the unchanged final build and completed all movement assertions.
  Two browser messages said `Could not establish connection. Receiving end
  does not exist.` during page load; they supplied no application stack and
  did not prevent these checks. This is not a zero-browser-error claim.

Package: `artifacts/deepseek-office-0.2.2.tgz`, 917,518 bytes.
SHA-256: `31a77d2edb88b42d512fbd18ebb39a694502d550fc5edacd3083b239b941de2c`.
The [scene screenshot](../images/pixel-office.png) shows the new full bodies.
The prior foreground-performance acceptance remains separate from this change.
