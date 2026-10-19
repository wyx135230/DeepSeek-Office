# Walk-in lifts — 0.5.2

The owner requested a lift at the right of every corridor, an adjacent panel
showing destinations and floor information, directional travel and outgoing /
incoming scene fades. The provided ELv.glb is bundled unchanged; no external
asset service, production profile or Harness patch is required.

## Behavior

- The model occupies the rightmost corridor cabin on every floor and reception.
  The west-facing doorway has matching collision pillars and side walls. The
  existing room arrangement and team logic are unchanged.
- The map's Lift entry pans the camera. Clicking the model or pressing E nearby
  routes the player into the cabin. Walking into its center opens the chooser.
  It shows floor number, name, purpose, member count and current working count.
- Same-floor buttons are disabled. One controller owns closing, moving, loading,
  arriving and opening; repeated destinations cannot queue or redirect a trip.
- Travel displays up/down and interpolated floor numbers. The old scene fades
  and shifts vertically; a cover remains until the target renderer is ready.
  The new floor reveals at the cabin, opens its doors and walks the player out.
  Quiet motion shortens phases and uses opacity without scene displacement.
- Escape closes the chooser and walks out. A committed ride cannot be retargeted;
  Back to chat remains available and cancels all outstanding travel timers.
- Targets use group IDs. Deleted destinations stop or recover to the source;
  source deletion falls back to reception. Loading has bounded timeouts. Failure
  recovery opens an explanatory panel on the available floor.
- Membership changes during arrival invalidate readiness and hold the cover
  until the replacement renderer is ready. Closing during preload releases the
  pending renderer, listeners, observers and models; late image-load callbacks
  cannot resurrect a cancelled scene.

## Evidence

Final source build: **729 tests passed, zero failed**; generated-client check
passed; lint passed with thirteen pre-existing warnings and no new warning.
New tests cover trip direction, same/unknown/deleted destinations, loading failure,
timeout, disposal, renderer replacement and cancellation during Phaser preload.
They also load the actual lift GLB, verify its corridor bounds, both door leaves,
cutaway opacity and resource disposal. Existing navigation tests still connect
every desk, activity and doorway for all team sizes and seeded layouts.

Tabbit browser acceptance used isolated `.dsh-test-elevator` data and mock models:

- Reception to second floor: actual model click → walk-in → chooser → complete
  trip, with recorded closing/moving/loading/arriving/opening phases. The initial
  observed trip took approximately 3.3 seconds, including about 0.4 seconds of
  target startup. Destination startup time varies with the device.
- Second to first floor, automatic exit, reentry and Escape cancellation passed.
- A real member removal during arrival produced arriving/opening → loading →
  arriving/opening → complete. The destination had three coworkers, the player
  walked out and exactly one visible Three canvas remained.
- A temporary destination deleted just after selection produced the unavailable
  floor message and retained the source. Quiet-motion travel and mid-trip close /
  reopen cancellation passed. Reopening stayed at reception, without a late jump.
- The final map entry and latest full trip were exercised after rebuilding.
  Observed FPS samples ranged around 34–54 in this browser session; these are
  interactive observations, not a sustained benchmark or a 60 FPS guarantee.
- Actual compact pane width 705px: controls at x=69…419 within the pane starting
  at x=55; y=90…745 within a 900px viewport. Full-viewport capture was taken after
  host sidebar resizing settled, rather than during its collapse animation.
- Browser extension connection errors appeared during reloads. A full-tab-close
  TypeError was traced to `chrome-extension://...`, outside the game script.

Independent review found two lifecycle issues (preload cancellation and arrival
renderer replacement); both were fixed, regression-tested and reviewed again.
No agent/host API, model route, message, memory or permission behavior was changed.

## Delivery

The local 0.5.2 archive is audited against the generated client and both embedded
GLBs; required provenance and notices are included. Runtime acceptance used the
same source client bytes. A separate fresh-profile archive installation and
production-team update are not claimed. No public publication or remote push.

Archive: `artifacts/deepseek-office-0.5.2.tgz`, 64 files, 2,506,275 bytes.
SHA-256: `baf0aacc043bf5a85e24d3cbf6286bdf0581a8f645c5ac2ebef4711210908552`.
Packaged client bytes match the generated build; both models and source records
are present. Test data and development dependencies are absent. The elevator
source bytes still match the owner's original. Owned test pages, services and
the isolated mock profile were cleaned up after acceptance.

![Lift controls next to the cabin](images/office-elevator.png)

[Arrival](images/office-elevator-arrival.png) ·
[Compact viewport](images/office-elevator-compact.png) ·
[Design](plans/2026-10-19-elevator.md)
