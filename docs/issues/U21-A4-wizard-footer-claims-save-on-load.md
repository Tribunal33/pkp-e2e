# Submission wizard footer says "Last saved 3 seconds ago" on every page load, when nothing was saved

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no autosaving wizard)
- **Introduced** `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [467034aa4](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-31 · Alec Smecher (asmecher), PR author; commit by Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Each time the submission wizard's page loads, the footer reads "Last
saved 3 seconds ago" after three seconds and goes on counting, though
nothing has been saved since the page opened. This happens for a new
draft, a draft reopened from the submissions list and a reload. The
time shown is the page load. The draft's real last save may be minutes
or days older.

The false time stays until the wizard's first real save of the visit.
That save comes when the author changes a field: a minute after the
page opened at the earliest, or at once if they then move to another
step. Until then the footer gives a save time while the author's typing
is not yet saved.

## Impact

- **Lost**: nothing that the footer causes. A change typed in the first
  minute after the page opens is unsaved for up to that minute under the
  false time. An author who leaves the page in that minute loses it, but
  they would lose it just the same with a correct footer, since leaving
  the page saves nothing.
- **Who**: every submitter, on every load of the wizard's page.
- **Way round**: changing a field and letting the wizard save it, by
  waiting for the timer or by pressing "Continue" after the change. The
  footer then gives the real time. "Continue" without a change sends
  nothing, and "Save for Later" leaves the page.

Low: the footer gives a wrong time, and nothing is lost because of it.
The false time is always the page load, which comes before anything
the author types, so the footer never dates a save after their typing.
It would be medium if it did, because an author could then leave the
page believing their typing was saved.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.

Steps:

1. Sign in as `ccorino` (OMP: `aclark`).
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`).
   Type "u21ir31 footer" in "Title", choose "English" as the language
   and "Articles" as the section [OMP: leave the work type at
   "Monograph: Authors are associated with the book as a whole."; OPS:
   there is no section question, since the server has one section].
   Tick "Yes, my submission meets all of these requirements." and "Yes,
   I agree to have my data collected and stored according to the
   privacy statement.", then press "Begin Submission".
3. The wizard opens on "Upload Files". Press "Continue" to "Details".
   [3.5: it opens on "Details".]
4. Touch nothing for two minutes.
5. Reload the page.
6. Watch the footer, beside "Save for Later", for five seconds.

**Expected**: no "Last saved" time, since nothing has been saved since
the reload (or the time of the draft's real last save, two minutes
back).

**Observed**: the footer is blank for about three seconds after the
reload. Then it reads "Last saved 3 seconds ago", and the time is
updated every three seconds. The browser sent no save request after
the reload, nor in the two minutes before it.

With a Title typed five to seven seconds after the page opened, the
footer read "Last saved 6 seconds ago" up to "Last saved 1 minute ago"
while the Title was unsaved. The timer saved it 61 seconds after the
page opened.

## Cause

The autosave mixin in ui-library, `src/mixins/autosave.js`, sets
`lastSavedTimestamp` at the page load. Its comment calls it "A
timestamp when the last autosave occured":

```js
lastSavedTimestamp: Date.now(),
```

`SubmissionWizardPage.vue` refreshes the footer every three seconds
(`setInterval(this.setLastAutosaveMessage, 3000)` in `created()`).
`setLastAutosaveMessage()` fills "Last saved {$when}" from
`lastSavedTimestamp`, and leaves the footer blank only when
`!this.lastSavedTimestamp`. That check was written for the time before
the first save, but the mixin never leaves the value empty, so the page
load reads as a save.

The same value also starts the timer: `_runAutosaveJobs()` saves
changes once `Date.now() - this.lastSavedTimestamp > 60000`. Starting it
at the page load is what makes the first timed save come a minute after
the page opened. So one value serves as both "the last save" and "the
start of the first minute".

Reach:

- Every load of the wizard's page (checked in the code; walked for the
  reload). The template `lib/pkp/templates/submission/wizard.tpl` shows
  the message whenever the wizard is neither saving nor reconnecting.
- The mixin has no other user than `SubmissionWizardPage`, and
  `lastSavedTimestamp` no other readers than the timer and the footer
  (checked in the code).

## Proposed fix

Start `lastSavedTimestamp` empty, and give the timer its own starting
point
([fix-a4.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-autosave-timer/fix-a4.diff),
which applies as pasted here):

```diff
--- a/lib/ui-library/src/mixins/autosave.js
+++ b/lib/ui-library/src/mixins/autosave.js
@@ -50,9 +50,15 @@
 			isDisconnected: false,
 
 			/**
-			 * A timestamp when the last autosave occured
+			 * A timestamp when the last autosave occured, or null
+			 * before the first one
 			 */
-			lastSavedTimestamp: Date.now(),
+			lastSavedTimestamp: null,
+
+			/**
+			 * A timestamp when the autosave feature was loaded
+			 */
+			autosaveLoadedTimestamp: Date.now(),
 
 			/**
 			 * Autosave payloads that are in the queue waiting to be saved
@@ -192,7 +198,11 @@
 			if (!payload) {
 				// If the last autosave was more than a minute ago,
 				// save their progress
-				if (Date.now() - this.lastSavedTimestamp > 60000) {
+				if (
+					Date.now() -
+						(this.lastSavedTimestamp ?? this.autosaveLoadedTimestamp) >
+					60000
+				) {
 					this.addAutosaves();
 				}
 				return;
```

The footer code needs no change: its existing check blanks it until the
first save. The first timed save still comes a minute after the page
opened.

Tried on `main` on all three apps: the footer stayed blank through the
two minutes and after the reload, and no request was sent. With a Title
typed just after the page opened, the timed save came at the same time
with and without the fix (61 seconds). With the fix the footer stayed
blank until that save, then read "Last saved 0 seconds ago". "Continue"
after a change still saved at once.

**Alternatives**:

- Show the draft's own last change from the server from the page load.
  This would be right for a reopened draft too, but it needs a new value
  passed to the page and a product call on what counts as a save.
- Keep the page-load value and add a "has saved" flag for the footer.
  That is two values for one fact, and the value would go on
  contradicting its own comment.

**What goes with it**:

- No REST API, plugin hook or stored data changes. The diff applies
  unchanged to `stable-3_5_0` and `stable-3_4_0`.
- The fix for cut saves while typing
  ([U21 A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A18-wizard-saves-late-typing-cut.md))
  edits the same condition. Each diff applies on its own to today's
  code; that report gives the combined line for when both are taken.
- The guard: the e2e scenario here, a **Planned** item in the spec (the
  footer blank on opening a draft until the first save). A vitest test
  would be ui-library's first test of a mixin or of this component. Its
  tests today cover composables and a store, with no Vue test utilities
  or DOM environment. It would call the mixin's `data()` and
  `_runAutosaveJobs()`, and the page's `setLastAutosaveMessage()`, on a
  stub under vitest's fake timers.

Small: a few lines in one ui-library file.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/wizard-autosave-timer/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-autosave-timer/walk.js)
  (`MODE=footer` for the Steps, `MODE=neighbour` for the typed-Title
  reading), run as
  `MODE=footer PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-autosave-timer/walk.js`.
- Walked on PostgreSQL, PKP's default test dataset at pkp/datasets
  27f1204 (2026-10-01), as `ccorino` (OJS, OPS) and `aclark` (OMP). A
  new draft's first arrival reads the same, but "Begin Submission" has
  just saved the draft then, so the reload is the clean reading.
- Tips: `main` OJS 4408b94def (pkp-lib f5bd392a69, ui-library
  64d6736318), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c570); `stable-3_5_0` OJS 18d097d94e, OMP b24879c3db,
  OPS 3f0919468c (pkp-lib 1fb843f491, ui-library 7a3c244b84). The two
  ui-library commits on `main` hold the same `autosave.js` and
  `SubmissionWizardPage.vue`.
- Code reads: `autosave.js` (`data()`, `_runAutosaveJobs()`,
  `_sendAutosave()`), `SubmissionWizardPage.vue` (`created()`,
  `setLastAutosaveMessage()`, `saveForLater()`, the `currentStepIndex`
  watcher) and `wizard.tpl` on `main` and 3.5. For 3.4, ui-library
  `origin/stable-3_4_0` ee684b341b has the same line 57, check and
  three-second refresh, and pkp-lib `origin/stable-3_4_0` df13621c2d
  has the same footer in `wizard.tpl`. 3.3 (ui-library 96959f9ed4,
  pkp-lib d446601ebe) has no `autosave.js`, and its older form-based
  wizard (`templates/submission/form/step1.tpl` …) has no "Last saved"
  line.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched for
  autosave, "last saved", the wizard and `lastSavedTimestamp`; none
  describes this fault. `pkp/pkp-lib#12602` (open) asks that screen
  readers stop announcing the footer's "Last saved" line every few
  seconds. This fix keeps the line, and its announcements, away until
  the first save, but does not settle that issue.
- MySQL not checked; the fault is in the browser.
