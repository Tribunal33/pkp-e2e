# Flaky tests: who flakes, why, and what to fix upstream (2026-09-15)

Model: claude-fable-5-1.

After the performance rounds (`2026-09-14-suite-performance*.md`) the next
cost is non-determinism. This report ranks the flake classes by how often
they actually fire, follows the two biggest into the app code with
reproductions, and leaves two ui-library patches ready for upstream pull
requests, each with a controlled A/B behind it. Everything ran on the Mac
(10 cores) against the 2026-09-15 upstream tips (`77b76d7664` in lib/pkp,
`db5b2813` in ui-library); the checkouts are pristine again.

## 1. Ranking: what actually flakes

Two sources. `2026-09-15-ci-flake-tally.md` counts every CI run of the
last three weeks (621 app-suite jobs across this repo and the three app
hooks; "flaky" = first attempt red, retry green, the direct signal).
`docs/tracking/ci-triage.md` "Flake watch" holds the local incidents.

| Rank | Class | Where | CI incidents (3 weeks) | Local incidents | Mechanism |
|---|---|---|---|---|---|
| 1 | **A wizard press lost right after a step change** | U21 (20+ scenarios), U04 S10, U31 S1, all three apps | ~97 (the "toContainText" class, 36 tests; the wizard is most of it) | 6 | **Found, patch A** (section 2) |
| 2 | **Reviewer one-click "Accept" not advancing** | OJS U28 S10 | 23 flaky + 1 red in nine days, nearly every run since the test shipped 09-05 | 5 (three after hardening) | Unknown; a legacy jQuery page. Traces now kept (section 4) |
| 3 | **Publication form save persists the old abstract** | OMP U40 S4 (the OPS/OJS twins share the code) | 22 flaky + 8 red | ~8 | **Found, patch B** (section 3) |
| 4 | Author Response table (re-render / not found) | OJS U30 S4 | 8 flaky | 8 on the VM in one day | Not reproduced on the Mac (0/10 plain, and CPU throttle hits an earlier gate first); still wants a VM trace |
| 5 | Reviewer rating radio "did not change its state" | OMP U27 S9 | 8 flaky + 1 | — | app-changes row 11 (rating control accepts clicks before its data settles) |
| 6 | Wizard "Save for later" resume | U21 S3, OJS/OMP/OPS | 22 flaky across the three | 1 | Same page as rank 1; re-check once patch A is in |
| — | Infrastructure (php -S refused / hung up) | login smoke, U01 | ~7 | 1 | Not app-side |

The flake rate on CI rose week over week (jobs carrying a flaky test:
OJS 31 → 37 → 43%, OMP 23 → 40 → 57%, OPS steady under 13%). OPS, with
the same harness and suite shape, barely flakes, which points at OJS/OMP
pages rather than the harness. The full tables, per-test, are in the
tally.

## 2. Patch A: the submission wizard's press lost to its scroll animation

**What the suite sees.** After Continue moves the rail to step N, the
next Continue press "does nothing": no request, the rail stays on step N
for the whole wait. Hardened test-side with `pressUntil()` (three presses,
8 s each) on 2026-09-12 and 09-14; still the largest class.

**Evidence.** CI run 34687878464 (2026-09-12) kept the retry's trace for
U21 S10. Its action log shows the second Continue press retried four
times as "element is not stable" over 0.5 s, then "click action done", and
the rail never moved. The screencast frame at that instant shows the page
scrolled back to the top with the caret inside the Abstract editor: the
Continue button was no longer under the pointer when the mouse went up.

**Mechanism.** `Steps.vue` (ui-library) reacts to every step change with
`this.$scrollTo(pageTitle, 500, {offset: -50})`, a 500 ms JavaScript
animation (vue-scrollto), plus `setFocusIn()` into the new step. Playwright
waits for the element to hold still for two animation frames before it
clicks; under a janky main thread (a loaded CI runner) two identical
frames occur mid-animation, the mouse-down lands on Continue, the
animation's last frame jumps the page to the title, and the mouse-up
lands wherever now sits at those coordinates, the abstract's editor
iframe. Playwright validates the hit target for the first pointer event
only (`injectedScript`: "check that we hit the right element at the first
event, and assume all subsequent events will be fine"), so the lost click
is silent. The harness's CSS motion kill cannot touch a JS scroll.

**Reproduction** (`2026-09-15-wizard-press-probe.spec.js`; copy it into
`apps/ojs/playwright/tests/` to run). A normal Continue press, then a
second press with a mouse-down/mouse-up gap of 0, 40 or 120 ms, eight
trials each, with `PLAYWRIGHT_CPU_THROTTLE=6` (the new opt-in knob,
harness.md "Env vars") to make the animation janky:

| Bundle | reduced motion in the page | lost presses |
|---|---|---|
| stock | no (the harness's `asUser` contexts never passed it) | 10 of 24 |
| stock | yes | 11 of 24 |
| patched | yes | **0 of 24** |

Every lost press ended with `document.activeElement` on
`.tox-edit-area__iframe`, the abstract editor. Without the throttle the
Mac never loses a press (0 of 24): the stability check waits the whole
animation out on a smooth thread, which is why it never reproduced
locally and fires on CI.

**The patch** (`2026-09-15-ui-library-steps-reduced-motion.patch`,
ui-library `Steps.vue`): honour `prefers-reduced-motion` (WCAG 2.3.3) and
jump instantly instead of animating when it is set. The test harness
already asks for reduced motion (`reducedMotion: 'reduce'`), and now does
so for every context it opens (base-test.js `asUser`, fixed today; before
this only the default `page` had it). Real users with animations on keep
the animation; a user clicking Continue twice within half a second could
still lose the second click, which is the same bug for humans and worth a
sentence in the PR. The whole U21 OJS spec is green on the patched bundle
(16 of 16, 27 s at eight workers).

**The native variant (preferred, same day).** The maintainer asked whether
the vue-scrollto plugin could go in favour of the browser's own scrolling
and whether that would pick the preference up by itself. Measured on a
plain page in Chromium under Playwright's reduced-motion emulation: a JS
`behavior: 'smooth'` argument ignores the preference (animated either
way), while CSS `scroll-behavior: smooth` with a `prefers-reduced-motion`
media rule and a plain `scrollTo`/`scrollIntoView` call is animated
normally and instant under the preference. So the native shape is the
stylesheet deciding and the scripts staying silent. The plugin had three
call sites, all in ui-library (the step rail, the form's page change and
its jump to the first error field, the last inside the side modal's
scroll container); nothing else used it. Patches, one per repository:
`2026-09-15-native-scroll-ui-library.patch` (a `useScrollTo`
composable with its Storybook doc, the three call sites, the rule in
`_global.less` scoped to `html` and `.pkp-modal-scroll-container`, the
dependency and the Storybook registration dropped),
`2026-09-15-native-scroll-pkp-lib.patch` (`js/load.js` no longer
registers it) and `2026-09-15-native-scroll-ojs.patch` (`package.json`
and the vite dependency list). Verified the same way as the first patch:
throttled probe 0 of 24 presses lost, U21 spec 16 of 16, bundle 5.5 KB
smaller. The scoped rule leaves the legacy grids' jQuery `scrollTop`
setters alone. Three other `scrollIntoView({behavior: 'smooth'})` calls
in ui-library (open review, usage chart, task info) ignore the preference
the same way and could drop their argument in a follow-up.

*Follow-up the same evening:* the global `scroll-behavior: smooth` rule
also animated the `scrollIntoView` calls Cypress makes for its own
actionability checks and broke that suite, so the merged version decides
per call instead: `useScrollTo` reads `prefers-reduced-motion` and passes
`behavior: 'instant'` or `'smooth'` to the native `scrollTo`, and the
stylesheet rule is gone. Verified at the merged tips (ojs `3d0b1df3f3`,
ui-library `d5d7017074` plus the working-tree change): a motion probe
opening the wizard in two contexts saw the post-step scroll animate over
~150 ms without the preference and land instantly with it (3 of 3 each);
the throttled press probe lost 0 of 24; U21 16 of 16. For the three
`scrollIntoView` calls above, the same per-call choice applies rather
than dropping the argument.

**Test-side.** Nothing new is needed; `pressUntil()` stays until the
patch ships, then it can go.

## 3. Patch B: the publication form keeps a stale form on screen

**What the suite sees.** OMP U40 S4 edits the abstract of a published
version, saves, and the book page still shows the seeded abstract. The
save responded 200. Known as app-changes row 9 (c) since 2026-08-28,
"a rich-text form remount reverts uncommitted editor content";
test-side `blur()` before Save did not close it.

**Evidence.** The test failed on the Mac at two workers with a trace
kept (traces are now retained for that file, section 4). The trace's
network and action logs, relative to the first form fetch:

| t | event |
|---|---|
| 0.000 s | GET `_components/titleAbstract` (first visit) lands |
| 0.376 s | click "Metadata": GET `_components/metadata` starts |
| 0.435 s | click "Title & Abstract": the metadata fetch is aborted, GET `_components/titleAbstract` starts again |
| 0.490–0.579 s | the test clicks, fills and blurs the Abstract editor **of the form still on screen from the first visit** |
| 0.597 s | the second titleAbstract fetch lands: `publicationForm` is replaced, fields reset to the seeded abstract |
| 0.614 s | Save: the PUT carries `abstract[en]=Seeded abstract for …` |

**Mechanism.** `WorkflowPublicationForm.vue` is one component instance
for every Publication page (the workflow page keys it by index and
component name), and its `relativeUrl` watcher calls `fetchForm()`
without clearing the previous form, so the last page's form stays on
screen and editable until the new response replaces it. Anything typed in
that window is discarded; for a person that is "I switched tabs and my
text vanished a second later". Under load the fetch is slower and the
window widens; alone on a fast machine the response usually lands before
the test can type.

**A/B on the Mac at eight workers**, OMP U40 S4 repeated:

| Bundle | runs | failed (seeded abstract persisted) |
|---|---|---|
| stock | 30 (10 + 20) | 4 |
| patched | 20 | **0** |

**The patch** (`2026-09-15-ui-library-publication-form-clear.patch`,
ui-library `WorkflowPublicationForm.vue`): `fetchForm({clearData: true})`
on a page change, so the form leaves the screen while its successor
loads (the `v-if="form"` already hides it), and a null guard on the
`canSubmit` watcher. The OJS and OPS U40 twins run the same component.

**The keyed variant (preferred, same day).** The maintainer's reading:
the instance should not survive a section switch at all. The workflow
page keys every configured item by its position, component name and
`namespace`, which is why one `WorkflowPublicationForm` serves every
Publication section in turn. `2026-09-15-ui-library-publication-form-key.patch`
appends a configured item's own `key` to the workflow page's key string
(`${index} - ${component} - ${namespace} - ${item.key}`, built by one
`itemKey()` helper for the page's seven key sites; the positional identity
stays and the key only adds to it) and gives the
eleven `WorkflowPublicationForm` sites across the OJS, OMP and OPS configs
`key: 'WorkflowPublicationForm-<formName>'`, so a section switch mounts a
fresh instance with no form to type into until its own fetch lands. A
version switch already remounted (the OJS config returns no items while
the new publication loads), so the key needs only the form name. The
first patch's `clearData` is then unnecessary and is not part of it.
Same A/B on the Mac at eight workers: OMP U40 S4 20 of 20 green against
the stock bundle's 4 failures in 30. The publication specs on keyed
builds: see section 5.

**Test-side.** `openPublicationPage()` could wait for the
`_components/<form>` response before returning, which would also cover
the window; with the patch in place the form simply is not there to type
into, so the tests need nothing.

## 3b. Patch C: the reviewer rating reverted by the "viewed" round-trip

**What the suite sees.** OMP U27 S9 (rank 5 on CI, 8 flaky runs in three
weeks): a star clicked in the Review Details window "did not change its
state" (Playwright's `check()` verifies the state after the click), even
though the test first waits for "Modify Review" to enable. app-changes
row 11 recorded the shape on 2026-08-29 and the suites work around it
with outcome-keyed re-clicks.

**Mechanism** (`useReviewDetails.js`, `useReviewAssignment.js`,
`ReviewDetailsRating.vue`). Opening the window loads the assignment and
then sends the "viewed" round-trip (`PUT …/consider`); each response
replaces the assignment object, and the rating component resets its
options to the server's value on every replacement (so a rejected save
also resets). "Modify Review" enables when the load completes, before
the "viewed" response, so a star clicked in that window is saved and then
overwritten on screen by the "viewed" response, which the server built
before the rating was written. The options were disabled only during
their own save.

**Reproduction.** A page route that lets the "viewed" request through but
holds its response 1.5 s, in the U27 S9 flow, then asserts the five-star
radio after the response lands: stock 3 of 3 reverted to unchecked (the
"Reviewer rating saved" toast having shown), patched 3 of 3 held. Holding
the request instead does not reproduce it (the server then writes the
rating first), which is why the CI failures depend on server timing.

**The patch** (`2026-09-15-ui-library-reviewer-rating-lock.patch`): the
assignment composable exposes `isMarkingViewed`, the details composable
derives `isRatingDisabled` from the load, the "viewed" round-trip and the
rating save, and the rating component takes it as `isDisabled` instead of
`isSaving`. A person sees the stars greyed for the round-trip's duration
after the window opens. Full OMP U26+U27 34 of 34 and OJS U26+U27 32 of
32 on patched builds.

## 4. What changed in this repo

- `shared/playwright/support/throttle.js` and base-test.js:
  `PLAYWRIGHT_CPU_THROTTLE=<rate>` (opt-in; harness.md). Use it on short
  probes at 6; on a whole scenario at 2–4 it just runs into the test's
  own timeouts (U30 S4: the decision wizard's `toPass` gate first, then
  the author's response window), which is a finding in itself: the
  decision-wizard class (ci-triage "Decision-wizard timing under load")
  is what a slow browser hits first.
- base-test.js: `asUser` contexts get `reducedMotion: 'reduce'` like the
  default context. Validated by a full OJS run (section 5).
- `apps/ojs/.../U28-reviewers-review.spec.js` and
  `apps/omp/.../U40-publication-metadata.spec.js`:
  `test.use({trace: 'retain-on-failure'})` at file level (the option is
  worker-scoped and refuses a describe block). CI keeps `on-first-retry`,
  which never records a flaky test's failing attempt; these two files are
  the hottest spots and now leave a trace when they red. Cost: the trace
  overhead on those two files only.
- ci-triage.md: the three entries carry the mechanisms and pointers.

## 5. Verification runs

| Run | Result |
|---|---|
| U30 S4 ×10, 8 workers, no throttle | 10 of 10 green (the class does not reproduce on the Mac) |
| U21 S10 + S12 ×5, throttle 2 | S12 green ×5 (4.5 min each); S10 timed out in fixture teardown, not the class |
| Wizard press probe (section 2) | as tabled |
| U21 OJS spec, patched bundle, 8 workers | 16 of 16 green |
| Native variant: throttled probe, U21 spec, full OJS suite | 0 of 24 lost (twice: helper and composable builds); 16 of 16; full suite 214 of 216 in 6.5 min, the same two reds as the pristine run (U05 S7's Tasks list and U24 S14's Declined count, both moved by parallel tests on the shared journal) |
| OMP U40 S4 A/B (section 3) | as tabled |
| Keyed variant: OMP U40 S4 ×20 (helper form) and ×10 (appended form); OJS U40+U49+U41 and OMP U40+U41 specs on keyed builds | 20 of 20 and 10 of 10; OJS specs 32 of 32; OMP 20 of 21, the one red being U40 S3's author save answered 401 on the day's used database, 9 of 9 red on stock and keyed bundles alike and 6 of 6 green on both after `reset:omp` (ci-triage) |
| Full OJS suite, pristine checkouts, harness change, 8 workers | 214 of 216 green in 6.2 min; U24 S14 red on the journal's Declined count (7, expected 5: the day's repeats on the same database) and U05 S7 red once on the Tasks dialog's table (30 s), both green alone right after (16 s) |

## 5b. Four local OJS runs at the merged tips

Four full OJS suite runs on the Mac (8 workers, a busy desktop, load
average over 100 on 10 cores) at upstream `main` `ae597ff9d9` (ui-library
`977e460c64` with the per-call reduced-motion scroll, pkp-lib
`b262d27b81`), each on a reset database (`.reports/flake-local/run{1..4}.log`,
the test-results and worker server logs of runs 2 to 4 kept beside them):

| run | result | reds |
|---|---|---|
| 1 | 215 passed, 3 red (5.2 min) | U23 S7, U23 S9, U24 S14 |
| 2 | 215 passed, 3 red (4.8 min) | U01 S1, U24 S14, U26 S6 |
| 3 | 216 passed, 2 red (6.2 min) | U05 S7, U40 S3 |
| 4 | 217 passed, 1 red (6.0 min) | U29 S9 |

The two classes fixed upstream did not show: no U21 wizard press lost and
no U40 S4 in 4 × 36 wizard tests and 4 × 6 publication-form tests. The
serial and solo projects were skipped in every run (they depend on a green
parallel project locally), so 218 of 231 ran each time. Every red was
green alone afterwards (2 or 3 repeats on two workers). What the reds are:

- **U24 S14 twice, a cross-test collision, reproducible.** The test reads
  the sidebar's "Declined" count on the shared journal, deletes its own
  declined submission and expects the count one lower; U26 S10 (decline,
  revert, delete on the same journal) finished alongside it in both red
  runs and after it in the two green ones. Alone, the pair on two workers
  with `--repeat-each 4` reds S14 2 of 4
  (`.reports/flake-local/collision-s14-s10.log`). The fix is test-side:
  seed S14's declined submission on a scratch journal so the count is
  1 → 0, or assert against the API's declined total read at the same
  moment.
- **U05 S7 once, an order tie.** The site-level Tasks window and the
  journal's listed the same rows in a different order among rows created
  in the same second by parallel workers; `TaskNotificationsGridHandler`
  orders by `created_at desc` alone, so ties have no stable order between
  two reads. Test-side: compare the two reads sorted. Upstream nit: a
  secondary order on the notification id.
- **U40 S3 once, unexplained.** After the manager's publish, the author's
  reload fetched the submission and the publication (both 200 in worker
  4's server log) but the "Publication: Title & Abstract" section stayed
  empty for 30 s: no "This version has been published" notice, no form,
  and no `_components/titleAbstract` request in the following 37 s. The
  section's items are empty while `selectedPublication` is null
  (`useWorkflowConfigOJS._getItems`); why it stayed null needs a trace,
  so the OJS U40 file now keeps traces on failure like the OMP one.
- **The rest, load.** U01 S1 (the user menu not visible 10 s after the
  dashboard committed), U23 S7 (the heading read "Active submissions (0)"
  for 30 s after a reload of a scratch journal holding 31), U23 S9 (the
  search for the tagged row found nothing in 30 s after the reviewer's
  accept), U26 S6 (the decision wizard's composer mask still up after
  30 s) and U29 S9 (the reviewer's step-3 recommendation select read no
  options) are the known "under load" shapes, one sighting each.

**After the two test-side fixes** (U24 S14 on a scratch journal like its
OMP and OPS twins, so the count is 1 → 0; U05 S7 comparing the two Tasks
reads sorted), three more full runs the same way
(`.reports/flake-local/run{5..7}.log`):

| run | result |
|---|---|
| 5 | 231 passed (5.9 min) |
| 6 | 231 passed (5.9 min) |
| 7 | 231 passed (5.6 min) |

Nine reds in four runs before, none in three after, and the serial and
solo projects ran for the first time. One caveat on the comparison: the
desktop had gone quiet by then (load average 12 to 19 against 89 to 152
during runs 1 to 4), so the load-shaped one-offs had less chance to show;
the two fixes remove the only reproducible red (U24 S14, 2 of 4 alone with
its partner before the fix, 0 of 2 after) and the order tie.

## 6. Next

0. Status 2026-09-15 evening: the native-scroll change and the keyed
   publication form are merged upstream (ui-library `393dd28952`,
   `d5d7017074`, `70b0892042`; pkp-lib `b262d27b81`; ojs `e0e0275a55`,
   omp `6eb3b935ad`, ops `fb72f079ba`); patch C (the reviewer rating)
   is deferred for a closer read. Whether the flake rate moved is a
   question for `bin/ci-flake-tally/run.sh` in two weeks, the same
   tally as section 1. A smaller variant was sketched in the
   session: take only `considered`/`dateConsidered` from the "viewed"
   response instead of the whole body, so a status update cannot carry a
   stale rating; not yet written or verified.
1. Done (item 0). After the next sync carries the merges, drop
   `pressUntil()`'s retry loop and revisit app-changes row 9 (c) and the
   U40 `blur()`, verifying at the new tips first.
2. U28 S10: wait for the next CI red, it now carries a trace; read it
   before touching `accept()` again.
3. U30 S4: the maintenance session's VM finals already run with
   `--trace retain-on-failure`; the next red there is the evidence.
4. Consider `trace: 'retain-on-failure'` for the whole suite on CI for a
   week, if the two files above are not enough: the flaky class as a
   whole has never been recorded on CI.
