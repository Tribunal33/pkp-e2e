# Submission wizard saves a field cut off mid-typing when the author starts typing after a quiet minute

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no autosaving wizard)
- **Introduced** `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [467034aa4](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-31 · Alec Smecher (asmecher), PR author; commit by Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a18)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The submission wizard saves the author's changes on a timer. It saves a
change once a minute has passed since its last save, or since the page
opened if it has not saved anything yet. When that minute is already
over as the author starts typing, the timer saves the field at once,
after its first letter or two, and saves the rest only a minute later.

Meanwhile the box shows the whole text and the footer reads "Last saved
0 seconds ago", so nothing tells the author that the draft holds only
the first letters. If they leave the page within that minute, by
closing the tab, following a link, going Back or reloading, the draft
keeps the cut text. No question is asked on leaving, and no "Unsaved
Changes" dialog appears on return.

Any field in the wizard's forms can be cut this way, whenever the
author spends more than a minute on a step before typing.

## Impact

- **Lost**: everything typed after the first letters, when the author
  leaves the page within the minute after typing.
- **Who**: any submitter, in every journal, press and server. Spending
  a minute on a step before typing is ordinary. Leaving within the next
  minute without moving on through the wizard is less common.
- **Way round**: "Continue", the step rail and "Save for Later" save the
  text as typed. An author who notices the cut value on return can type
  it again.

The loss is silent and any way of leaving the page causes it, so this is
medium. It stays below high because the cut value cannot reach a
submitted submission unseen: every way to "Review" saves the text
first, and "Review" shows it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.

Steps:

1. Sign in as `ccorino` (OMP: `aclark`).
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`).
   Type "u21ir31 late" in "Title", choose "English" as the language and
   "Articles" as the section [OMP: leave the work type at "Monograph:
   Authors are associated with the book as a whole."; OPS: there is no
   section question, since the server has one section]. Tick "Yes, my
   submission meets all of these requirements." and "Yes, I agree to
   have my data collected and stored according to the privacy
   statement.", then press "Begin Submission".
3. The wizard opens on "Upload Files". Press "Continue" to "Details".
   [3.5: it opens on "Details".]
4. Touch nothing until the footer reads "Last saved 1 minute ago", then
   wait a few seconds more (about 75 seconds after the wizard opened).
5. Click into "Title", select its text (Ctrl+A or Cmd+A) and type
   "Autosave check typed late" at an ordinary pace, a key about every
   quarter second (about six seconds).
6. Stop, and wait five seconds.
7. Reload the page. The wizard reopens on "Upload Files"; press
   "Continue" to "Details" [3.5: it reopens on "Details"]. Read
   "Title".

**Expected**: the timer saves the Title as typed once the typing
pauses. After the reload "Details" shows "Autosave check typed late".

**Observed**: 0.8 seconds after the first key, while the typing went on,
the footer flashed "Saving" and then read "Last saved 0 seconds ago".
The box went on showing every letter typed. That one save carried the
Title as it stood then:

```
POST /index.php/publicknowledge/api/v1/submissions/{submissionId}/publications/{publicationId}
X-Http-Method-Override: PUT

title[en]=Au&…
```

The walks saved "Au" or "A". Which one depends only on where the first
key falls against the timer's 500 ms tick, not on the app or version.
Nothing more was sent before the reload. After the reload "Details"
showed the same "Au" or "A", and no "Unsaved Changes" dialog opened.

Control: a Title typed five seconds after the wizard opened is saved
whole, 61 seconds after the opening. An abstract typed and followed by
"Continue" is saved within half a second.

## Cause

The autosave mixin in ui-library, `src/mixins/autosave.js`, runs
`_runAutosaveJobs()` every 500 ms. When nothing is queued, it calls the
page's `addAutosaves()` once more than 60 seconds have passed since
`lastSavedTimestamp`:

```js
if (Date.now() - this.lastSavedTimestamp > 60000) {
	this.addAutosaves();
}
```

The wizard's forms report every change through
`@set="updateAutosaveForm"` (pkp-lib `templates/submission/wizard.tpl`,
line 76). `SubmissionWizardPage.updateAutosaveForm()` adds the form to
`staleForms` on its first change.

Once the minute is over, the author's first key therefore makes the form
stale. On the next tick, `addAutosaves()` copies the form's values as
they are at that moment into the queue, and `addAutosave()` stamps the
copy with that time. The tick after that sends the copy, so the save
leaves 0.5 to 1 second after the first key. When the save succeeds,
`lastSavedTimestamp` takes the copy's queue time, so whatever is typed
after it waits for the next minute.

Reach:

- Every form section of the wizard, plugin-added ones included, since
  `wizard.tpl` wires them all to `updateAutosaveForm()`, the only place
  `staleForms` grows. The files and contributors lists save through
  their own requests and are not part of the timer (checked in the code;
  walked on "Title").
- Every minute, not only the first after the page opens: any change
  begun more than a minute after the last save is cut the same way
  (checked in the code).
- Leaving the page sends nothing. The wizard's forms have no
  `beforeunload` handler: pkp-lib's `SiteHandler` asks before leaving
  only for the older forms that register with it. Walked for the reload
  (no question, no request). Closing the tab, a link and Back fire the
  same event, so they are read in the code.
- The step change (`currentStepIndex` watcher), "Save for Later" and the
  "Unsaved Changes" restore call `addAutosaves()` directly, not through
  the timer, and save the text as typed (walked for "Continue").
- The mixin has no other user than `SubmissionWizardPage` (checked in
  the code).

## Proposed fix

Make the timer wait for a short pause in the typing before it queues the
stale forms. The mixin keeps the time of the last change. The page sets
that time in the one method that marks a form as changed, since only the
page knows when a form changes. The timer's minute check then also
requires two seconds without a change
([fix-a18.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-autosave-timer/fix-a18.diff),
which applies as pasted here):

```diff
--- a/lib/ui-library/src/mixins/autosave.js
+++ b/lib/ui-library/src/mixins/autosave.js
@@ -55,6 +55,12 @@
 			lastSavedTimestamp: Date.now(),
 
 			/**
+			 * A timestamp when the data waiting to be autosaved last changed.
+			 * Components set it whenever they mark data as changed.
+			 */
+			lastChangedTimestamp: 0,
+
+			/**
 			 * Autosave payloads that are in the queue waiting to be saved
 			 */
 			pendingAutosaves: [],
@@ -191,8 +197,12 @@
 
 			if (!payload) {
 				// If the last autosave was more than a minute ago,
-				// save their progress
-				if (Date.now() - this.lastSavedTimestamp > 60000) {
+				// save their progress once they pause, so that a
+				// field is not saved halfway through being typed
+				if (
+					Date.now() - this.lastSavedTimestamp > 60000 &&
+					Date.now() - this.lastChangedTimestamp > 2000
+				) {
 					this.addAutosaves();
 				}
 				return;
--- a/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
+++ b/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
@@ -758,6 +758,7 @@
 		 */
 		updateAutosaveForm(formId, data) {
 			this.updateForm(formId, data);
+			this.lastChangedTimestamp = Date.now();
 			if (this.staleForms.indexOf(formId) === -1) {
 				this.staleForms.push(formId);
 			}
```

The fix keeps what the timer was written for: at most one timed save a
minute, and no save per keystroke.

Tried on `main` on all three apps: the Title typed 75 seconds after the
wizard opened was saved whole 2.3 seconds after its last key, and read
back whole after the reload. The control behaved the same with and
without the fix.

**Alternatives**:

- Debounce every change (save a few seconds after the typing stops,
  whatever the minute): simpler, but it drops the once-a-minute limit
  and sends a request at every pause.
- Shorten the wait after a timed save when the form changed again: the
  first save would still carry a cut value.
- Save when a field loses focus: an author who leaves the page from a
  focused field never triggers it.

**What goes with it**:

- An author who types without a two-second pause gets no timed save
  until they pause. The step change and "Save for Later" still save at
  once.
- The fix adds a rule to the mixin's contract: a component must set
  `lastChangedTimestamp` when it marks data as changed. The mixin's page
  in the component library, `src/mixins/autosave.mdx`, should say so.
- No REST API, plugin hook or stored data changes. The diff applies
  unchanged to `stable-3_5_0` and `stable-3_4_0`.
- The fix for the footer's "Last saved" time on page load
  ([U21 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A4-wizard-footer-claims-save-on-load.md))
  edits the same condition. Each diff applies on its own to today's
  code. If both are taken, the condition becomes the line below, where
  `autosaveLoadedTimestamp` is the field the A4 fix adds:
  `Date.now() - (this.lastSavedTimestamp ?? this.autosaveLoadedTimestamp) > 60000 && Date.now() - this.lastChangedTimestamp > 2000`.
- The guard: the e2e scenario here, a **Planned** item in the spec (a
  Title typed after a quiet minute is saved whole). A vitest test would
  be ui-library's first test of a mixin. Its tests today cover
  composables and a store, with no Vue test utilities or DOM
  environment. So such a test would call `_runAutosaveJobs()` on a stub
  component under vitest's fake timers rather than mount the page.

Small: a few lines in two ui-library files, plus a line in the mixin's
docs.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/wizard-autosave-timer/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-autosave-timer/walk.js)
  (`MODE=late` for the Steps, `MODE=neighbour` for the control), run as
  `MODE=late PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-autosave-timer/walk.js`.
- Walked on PostgreSQL, PKP's default test dataset at pkp/datasets
  27f1204 (2026-10-01), as `ccorino` (OJS, OPS) and `aclark` (OMP), with
  Playwright typing at 250 ms a key. An earlier campaign probe of the
  same steps also saw "Auto", "Autosav" and an emptied box.
- Tips: `main` OJS 4408b94def (pkp-lib f5bd392a69, ui-library
  64d6736318), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c570); `stable-3_5_0` OJS 18d097d94e, OMP b24879c3db,
  OPS 3f0919468c (pkp-lib 1fb843f491, ui-library 7a3c244b84). The two
  ui-library commits on `main` hold the same `autosave.js` and
  `SubmissionWizardPage.vue`.
- Code reads: `autosave.js` (`data()`, `_runAutosaveJobs()`,
  `addAutosave()`, `_sendAutosave()`), `SubmissionWizardPage.vue`
  (`addAutosaves()`, `updateAutosaveForm()`, `saveForLater()`, the
  `currentStepIndex` watcher), `wizard.tpl` and pkp-lib
  `js/controllers/SiteHandler.js` on `main` and 3.5. For 3.4, ui-library
  `origin/stable-3_4_0` ee684b341b has the same minute check (line 197)
  and the same `staleForms` marking. 3.3 (ui-library 96959f9ed4, pkp-lib
  d446601ebe) has no `autosave.js`, and its older form-based wizard
  (`templates/submission/form/step1.tpl` …) saves only on its buttons.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched for
  autosave, "last saved", the wizard and `lastSavedTimestamp`; none
  describes this fault. `pkp/pkp-lib#12602` (open) is about screen
  readers announcing the footer's "Last saved" line, not about what is
  saved.
- MySQL not checked; the fault is in the browser.
