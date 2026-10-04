# Over an open window, a notice's "×" does nothing, or closes the submission's workflow along with the notice

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; jQuery windows)
  - 3.3: none (code; jQuery windows)
- **Introduced** not traced; present since at least the move to reka-ui, [39ebe864](https://github.com/pkp/ui-library/commit/39ebe864f98f11b81e9baddfc50cd11032eed723) on `main` and [c5f84666](https://github.com/pkp/ui-library/commit/c5f8466652b3de58c8310ae5ddf6073b2cd5c385) on 3.5, both committed 2025-07-22
- **Upstream** `pkp/pkp-lib#13188` (open; fix in PR `pkp/ui-library#999` for `stable-3_5_0` only, not yet merged, with no PR for `main`), covering only the second symptom, the workflow closing with the notice
- **Tracked in** spec U58 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a13), spec U05 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a14)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

While a window or side panel is open, a notice at the top right of the
page cannot be closed with its "×". A manager who types a "Key" the
"Add a Component" window does not accept, or an editor who presses
"Notify" with an empty message, gets a notice saying so. Pressing its
"×" does nothing, and resting the pointer on it does not keep it. It
leaves by itself about five seconds after it showed.

In a submission's workflow, once a window opened there has closed, a
press on a notice's "×" reaches it, but the press also closes the
window on top. With no other window open, that is the whole workflow:
the editor is put back on the submissions list.

## Impact

- **Lost:** nothing is saved wrong. A notice cannot be dismissed or kept
  on screen, and a workflow closed by the press has to be opened again.
- **Who:** anyone who gets a notice while a window is open, or closes
  one in a workflow after a window there has closed. The walks signed in
  as a manager and an editor. Authors and reviewers open the same kind
  of windows (discussions, file uploads), and nothing in the cause
  depends on the role, but they were not walked.
- **Way round:** wait about five seconds for the notice to go; press
  "Save" again to see a refusal's notice again; reopen the submission
  from the list when the workflow closed.

Low: the work gets done, and each "Save" shows a refusal again. It
would rise to medium for a notice too long to read in five seconds.
The notices found over an open window are 19 words, about five seconds
of reading at an ordinary pace (Evidence).

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, context
`publicknowledge`. Nothing else.

A "Key" the "Add a Component" window does not accept:

1. Sign in as `rvaca`.
2. Go to Settings › Workflow › "Submission" › "Components".
3. Press "Add a Component".
4. Type `u58b Survey Forms` in "Name" and `-survey` in "Key".
5. Press "Save". The window stays open, and a notice at the top right
   reads "The key can contain only alphanumeric characters, underscores,
   and hyphens, and must begin and end with an alphanumeric character."
6. Press the notice's "×" straight away.
7. Press "Save" again, and rest the pointer on the new notice for eight
   seconds.

"Notify" with an empty message:

1. Sign in as `dbarnes`.
2. Open the submission: OJS 4 "Computer Skill Requirements for New and
   Existing Teachers: Implications for Policy and Practice", OMP 7
   "Accessible Elements: Teaching Science Online and at a Distance", OPS
   1 "The influence of lactation on the quantity and quality of cashmere
   production".
3. In "Participants", open the author's "More Actions" › "Notify" (OJS
   Craig Montgomerie, OMP Dietmar Kennepohl, OPS Carlo Corino).
4. Leave "Message" empty and press "Notify". The side panel stays open,
   and a warning notice at the top right reads "Please ensure that you
   have filled out the message field and included someone other than
   yourself in the discussion."
5. Press the notice's "×" straight away.

After the "Notify" panel has closed (OJS, OMP):

1. In the same "Notify" panel, open the list "Choose a predefined
   message to use, or fill out the form below.", choose the first
   message under its blank entry (OJS "Discussion (Submission)", OMP
   "Discussion (Copyediting)"), and press "Notify". The panel closes,
   and "Notification sent to users." shows at the top right.
2. Press that notice's "×".

**Expected:** each "×" removes its notice at once and leaves the window,
the side panel or the workflow open, with what was typed in it. The
notice stays while the pointer rests on it, as it does on a page with
no window open.

**Observed:** in the first two groups the press does nothing. The
element under the "×" is the window's own header, so the press lands
there. The notice left by itself 5.0–5.2 s after it showed, and the
window or panel stayed open with the typed name kept. With the pointer
resting on it, the second "Key" notice also left after 5.0–5.2 s.

In the third group the press removes the notice within 0.2 s, and the
workflow closes with it; the page goes back to the "Assigned to me"
list. When that notice was instead left to go, and "Notify" was opened
again and pressed with "Message" empty, a press on the warning's "×"
closed the "Notify" panel and left the workflow open. So once a window
in the workflow has closed, every press on a notice closes the window on
top.

On a preprint server the confirmation of a sent "Notify" shows in the
stage's own box instead of at the top right (a separate report,
[U35 OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS4-participant-notice-lands-in-stage-box.md)),
so the third group has no notice to press there.

## Cause

The side windows (`SideModal` / `SideModalBody`) and the confirmation
window (`Dialog`) of `lib/ui-library` are reka-ui modal dialogs. While
one is open, reka-ui's `DismissableLayer` sets
`document.body.style.pointerEvents = 'none'` and gives only the topmost
window `pointer-events: auto`. It also treats any press outside that
window as a press outside (`pointerDownOutside` / `interactOutside`)
and then closes the window, unless a handler calls `preventDefault()`.

The page's notices are drawn in `.app__notifications`
(`lib/pkp/templates/layouts/backend.tpl`, styled in
`src/components/Container/Page.vue` at line 314). That area belongs to
the page, outside every window. It is painted above the windows
(`z-index: 1001`) but inherits `pointer-events: none` from the body. So
a press on the "×" falls through to the window below it, and the
notices' `:hover` never matches. `Page.vue`'s timer (lines 50–61)
therefore expires the notice after its five seconds even with the
pointer on it.

`SideModalBody.vue` already exempts two other things that live outside
the window for the same reason, the TinyMCE and jQuery UI pop-ups
(`pkp/pkp-lib#11693`). It gives them `pointer-events: auto` in its
global style, and `handleOutsideEvent()` (lines 173–178) calls
`preventDefault()` for `.tox-tinymce-aux, .ui-widget`, so pressing them
does not close the window. The notices were never added to either
exemption.

The second symptom comes from reka-ui's bookkeeping of nested windows.
Each layer's first `watchEffect` in `DismissableLayer` reads
`context.layersWithOutsidePointerEventsDisabled.size`, so it re-runs
whenever a layer is added or removed. When the inner window (the
"Notify" panel) unmounts, the set drops to one, and the workflow
layer's effect re-runs. Its cleanup restores the body's original
pointer events (it does so when `size === 1`), and its re-run does not
set `none` again (it only does that when `size === 0`). From then on,
until every window has closed, the page takes presses: the "×" is
reached, and the topmost window counts the press as outside and closes,
because `handleOutsideEvent()` does not exempt notices
(`pkp/pkp-lib#13188`). reka-ui 2.8.0 (`main`) and 2.3.2 (3.5) have the
same code. reka-ui fixed it in 2.9.10 (`unovue/reka-ui#2674`, PR
`unovue/reka-ui#2678`), so it needs no new report there.

Reach:

- Every notice shown while a side window is open: the legacy forms,
  which open in `SideModalBodyLegacyAjax` (built on `SideModalBody`),
  and the Vue side windows. Checked in the code; on screen for "Add a
  Component" and "Notify".
- Every notice pressed in a workflow after an inner window has closed:
  it closes the window on top. Checked on screen after "Notify" (OJS,
  OMP).
- The confirmation window (`Dialog.vue`) locks the body the same way and
  closes on a press outside it. Checked in the code; no notice over it
  was driven.
- Keyboard: the windows' focus trap keeps Tab inside the window, so the
  "×" cannot be reached from the keyboard while a window is open either.
  Checked in the code (`FOCUS_TRAP_IGNORE_SELECTORS`); left out of the
  fix below.
- The reader-facing pages have no notices area (only `backend.tpl` has
  one). Checked in the code.

## Proposed fix

The proposal is to treat the notices area as part of whichever window is
open, the way `#11693` treats the TinyMCE and jQuery UI pop-ups. Both
changes are in `lib/ui-library`. First, `.app__notifications` gets
`pointer-events: auto`, so the press and the pointer reach the notices
over an open window. Second, both window kinds exempt
`.app__notifications` from their press-outside handling, so the press
does not also close the window. The diff
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notice-close-blocked-by-open-window/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Container/Page.vue
+++ b/lib/ui-library/src/components/Container/Page.vue
@@ -317,6 +317,9 @@
 	right: 0.5rem;
 	width: 20rem;
 	z-index: 1001;
+	// An open modal (reka-ui) sets pointer-events: none on the body; keep the
+	// notifications' close buttons and hover-to-keep working above it
+	pointer-events: auto;
 
 	.pkpNotification {
 		transition: all 0.2s;
--- a/lib/ui-library/src/components/Modal/SideModalBody.vue
+++ b/lib/ui-library/src/components/Modal/SideModalBody.vue
@@ -170,10 +170,11 @@
 const closeModalButton = inject('closeModalButton');
 
 // #11693 When tinyMCE modal is opened inside modal, ignore outside clicks to prevent closing the current modals
+// The same for the page's notifications, whose close button sits outside the modal
 function handleOutsideEvent(event) {
-	// Check if the target is part of TinyMCE's dialog
-	if (event.target.closest('.tox-tinymce-aux, .ui-widget')) {
-		event.preventDefault(); // Bypass the focus trap for TinyMCE elements
+	// Check if the target is part of TinyMCE's dialog, a jQuery UI widget or a notification
+	if (event.target.closest('.tox-tinymce-aux, .ui-widget, .app__notifications')) {
+		event.preventDefault(); // Keep the modal open
 	}
 }
 
--- a/lib/ui-library/src/components/Modal/Dialog.vue
+++ b/lib/ui-library/src/components/Modal/Dialog.vue
@@ -8,6 +8,7 @@
 			<DialogContent
 				class="modal !pointer-events-none fixed inset-0 z-20 overflow-y-auto"
 				data-cy="dialog"
+				@interact-outside="handleOutsideEvent"
 			>
 				<div
 					class="flex min-h-full items-end justify-center p-4 text-center sm:items-start sm:p-0"
@@ -144,6 +145,13 @@
 
 const emit = defineEmits(['close']);
 
+// A press on a notification's close button is not a click outside the dialog
+function handleOutsideEvent(event) {
+	if (event.target.closest('.app__notifications')) {
+		event.preventDefault();
+	}
+}
+
 function handleCloseUpdate(opened) {
 	if (!opened) {
 		onClose('default');
```

It was tried on OJS, OMP and OPS on `main`:

- Each "×" in the Steps removed its notice within 0.2 s and left the
  window, the panel or the workflow open with the typed name kept. A
  notice with the pointer on it stayed past the eight seconds.
- With the fix in and with it out alike, a press on the dimmed page
  beside "Add a Component" (untouched, or with a name typed) and beside
  the confirmation window of a component's "Delete" still closes that
  window, and the component stays.

**Alternatives:**

- `pkp/ui-library#999` adds `.pkpNotification` to `handleOutsideEvent()`
  only. That stops the workflow closing, but while the body is at
  `pointer-events: none` the first two groups of Steps still do nothing.
  It leaves `Dialog.vue` out, and it targets 3.5 only.
- Upgrading reka-ui to 2.9.10 or later keeps the body locked after an
  inner window closes. On its own that turns the second symptom into
  the first (a dead "×") rather than fixing it.
- Wrapping the notices area in reka-ui's `DismissableLayerBranch` (the
  way reka-ui's own toast viewport does it) handles the press-outside
  part. It needs the component registered for the Smarty template in
  `lib/pkp` (two repos), and it still needs the `pointer-events` rule.
- Making the windows non-modal would give up the focus trap and the
  hiding of the page behind them, the accessibility that
  `pkp/pkp-lib#11258` moved to reka-ui for.

**What goes with it:**

- Backport to `stable-3_5_0`; the diff applies there with line offsets.
- The reka-ui upgrade is worth doing as well, so that a press outside a
  window after a nested one has closed no longer closes it; with this
  fix in, notices behave the same either way.
- No stored data, API or plugin hook changes.
- The guard: a test that presses a notice's "×" over an open window and
  after an inner window has closed, as a ui-library component test of
  `SideModalBody` with a notice outside it.

Small: a CSS rule and two press-outside guards in one repo, tried.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notice-close-blocked-by-open-window/walk.js)
  (helpers in `lib.js` beside it) takes the Steps with real mouse presses
  at the centre of each "×", and stamps each notice's appearance and
  removal in the page.
  - `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/notice-close-blocked-by-open-window/walk.js`
  - `WALK=neighbour` in front: the presses beside the windows, then the
    third group with the workflow's state read after the press
    (`NB_ONLY=control` for that group alone; `NB_ONLY=again` for the
    later "Notify" in Observed).
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/notice-close-blocked-by-open-window/fix.diff ojs omp ops`.
  The comment on `preventDefault()` was changed afterwards; nothing else.
- Walks on PostgreSQL, datasets from pkp/datasets 566bb1f (2026-10-03):
  the first two groups on OJS, OMP and OPS on `main` and `stable-3_5_0`;
  the third group and the later "Notify" on OJS and OMP on `main`. No
  request failed on the server and no page script failed in the Steps.
- 3.5, the third group, code: the same `handleOutsideEvent()` without
  notices (`SideModalBody.vue` lines 181–183) and the same reka-ui
  bookkeeping (reka-ui 2.3.2). `pkp/pkp-lib#13188` reports that symptom
  on 3.5.
- 3.4 and 3.3, code: `lib/pkp` `templates/layouts/backend.tpl` has the
  same notices area at `z-index: 1001` (ui-library `Page.vue`), and the
  legacy windows are jQuery windows (`styles/controllers/modal.less`,
  `z-index: 1000`) under it. `lib/pkp` `js/` and `styles/` and
  ui-library `src/` hold no `.inert`, `pointer-events: none` or
  `pointerEvents` on either branch. The Vue windows come from
  `vue-js-modal`, whose own code was not read.
- Introduced: before the reka-ui move (`pkp/ui-library#671` for
  `pkp/pkp-lib#11258`), the side window was a Headless UI 1.7 `Dialog`.
  Its `useInert` marks the body child that holds the page, and so the
  notices area, `inert`, which by code blocks the same press. The fault
  likely goes back to the legacy windows' move into that side window
  (ed8ce9df, 2024-01-08); not walked.
- Notice length: the two notices walked are 19 words each. A legacy form
  that the server refuses shows one notice joining all of its errors
  (`Form::validate()` and `PKPNotificationManager`, form-error type), so
  a form refused on several checks at once shows a longer one. No such
  notice was met over an open window.
- Upstream search, 2026-10-04: pkp/pkp-lib, pkp/ui-library and pkp/ojs
  (issues and PRs), and unovue/reka-ui for the nested-window part.
- Tips:
  - **`main`:** OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
    64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
    lib/ui-library 280f98c5).
  - **`stable-3_5_0`:** OJS c1cee76b95 (lib/pkp 771474347e), OMP
    9c5e24246 and OPS 38b61882d3 (lib/pkp cf3f984335), lib/ui-library
    d4e01883 in each.
  - **3.4, 3.3:** `upstream/stable-3_4_0`, `upstream/stable-3_3_0` in the
    OJS checkout, `origin/stable-3_4_0`, `origin/stable-3_3_0` in its
    `lib/pkp` and `lib/ui-library`, as fetched on 2026-10-04.
