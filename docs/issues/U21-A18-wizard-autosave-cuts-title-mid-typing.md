# Submission wizard autosaves a change after its first letter, and the rest only a minute later

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no autosaving submission wizard)
- **Introduced** `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [467034aa41](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-31 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a18)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When more than a minute has passed since the wizard last saved (or
since it opened, if nothing has been saved yet), the first key an
author types in a field starts a save at once. Within a second the
footer flashes "Saving" and the draft is saved with only the first
letter or two. The rest waits a full minute for the next save, while
the footer reads "Last saved 8 seconds ago" as if the change were
saved.

An author who leaves the wizard or reloads within that minute finds the
field cut: a Title typed as "u21w37 Autosave cut check" reopens as "u",
in the page heading too, with no warning. Moving to another step, or
"Save for Later", saves the whole text.

## Impact

- **Lost:** the text typed after the first letters, but only when the
  author leaves (another address, closing the tab) or reloads within
  the minute after the cut save, without changing step. Nothing asks
  first: the wizard has no "Leave site?" prompt, and its "Unsaved
  Changes" dialog, which offers back changes kept in the browser after
  a failed save, does not open, because the cut save succeeded.
- **Who:** authors, and editors completing a draft, typing in a text
  field once a minute has passed since the last save, which is the
  usual case: reading a step and its instructions takes longer. The
  text fields are Title, Prefix, Subtitle, Abstract, the plain language
  summary where the journal or server asks for one, and "Comments for
  the Editors"; keywords and the other suggestion lists change only
  when an entry is added, so they are not cut mid-word.
- **Way round:** waiting also works: the timer's next save, a minute
  after the cut one, carries whatever the field holds then. An author
  still typing at that moment is cut again; the whole text is saved at
  the first timer save after they stop, up to a minute later. A cut
  field shows on reopening and can be typed again.

Medium: the footer reports a change as saved when only a fragment was,
and an author who leaves within the minute loses the rest without a
prompt; an author who goes on through the wizard loses nothing.

## Steps to reproduce

Preconditions: the default dataset, OJS `main` (OMP and OPS the same;
on OMP sign in as `aclark`).

1. Sign in as `ccorino`.
2. Open the new-submission page
   (`/index.php/publicknowledge/en/submission`); Title "u21w37 Autosave
   Draft", section "Articles" (OMP: series "Library & Information
   Studies"; OPS: "Preprints"), language "English", tick the
   checkboxes, press "Begin Submission". The wizard opens on "Upload
   Files".
3. Press "Continue" at once, changing nothing: "Details" opens [3.5:
   the wizard opens on "Details"; skip this step].
4. Wait until the footer beside "Save for Later" reads "Last saved 1
   minute ago" (about a minute after step 2).
5. In "Title", select all and type "u21w37 Autosave cut check" at an
   ordinary pace, a key every quarter second (about six seconds).
6. Wait five seconds.
7. Reload the page. The wizard reopens on "Upload Files" [3.5: on
   "Details"].
8. Press "Continue" [3.5: skip] and read "Title" on "Details".

**Expected:** the new Title is saved whole once the typing stops, so
"Details" shows "u21w37 Autosave cut check" after the reload.

**Observed:** 0.6 to 0.8 seconds after the first key, while the Title
was still being typed, the footer showed "Saving", then "Last saved 0
seconds ago", and the browser sent the save with only the first
letters:

```
POST /index.php/publicknowledge/api/v1/submissions/21/publications/22
X-Http-Method-Override: PUT
title[en]=u2
→ 200
```

No other save followed. Five seconds after the last key the footer read
"Last saved 8 seconds ago". After the reload "Title" read "u2", as did
the page heading ("21 / Corino / u2"), and no dialog opened. OMP and OPS
gave "u": how many letters are sent depends on where the first key
falls against the wizard's half-second timer, not on the app.

Control: a new Title typed and "Continue" pressed at once is saved
whole within half a second.

## Cause

The wizard's timer, ui-library's `_runAutosaveJobs()` in
`src/mixins/autosave.js`, runs every 500 ms. When nothing is queued and
more than 60 seconds have passed since `lastSavedTimestamp` (line 195),
it calls the page's `addAutosaves()`, which queues every form in
`staleForms` with the values it holds at that tick
(`SubmissionWizardPage.addAutosaves()`, lines 312–326,
`{...form.submitValues}`).

A form joins `staleForms` on any change: every key in a text field
reaches `SubmissionWizardPage.updateAutosaveForm()` (line 759) through
the form's `@set` (pkp-lib `templates/submission/wizard.tpl`, line 76).
So once the minute is up, the first key makes the form stale and the
next tick, at most half a second later, sends what the field holds
then. The save's success sets `lastSavedTimestamp` to that moment (line
249), so the keys that follow make the form stale again but wait for
the next minute.

The timer has a rule for how often to save but none for whether the
author is still typing. Only the page is told of each key, and all it
does with it is add the form to `staleForms`; the mixin's timer never
learns that typing is still going on.

Reach:

- Every text field of the wizard's step forms, in the three apps,
  which share `SubmissionWizardPage` and the template (code; the Title
  driven in the browser on all three).
- The footer's "Saving" and "Last saved 0 seconds ago" while the
  author is still typing (driven).
- A step change and "Save for Later" call `addAutosaves()` directly
  and send the whole text (driven for "Continue"; "Save for Later"
  read in the code), so a cut value lasts only until the next step
  change, timer save or submission.

## Proposed fix

A proposal; the team decides. Let the timer wait until the data has stopped changing for two seconds
before it saves. The mixin keeps the time of the last change in a field
of its own, set through a new mixin method, and the page calls that
method where it already marks a form stale
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-autosave-cuts-title-mid-typing/fix.diff),
ui-library):

```diff
 			lastSavedTimestamp: Date.now(),
+
+			/**
+			 * A timestamp when the data waiting to be autosaved last
+			 * changed. See markAutosaveChanged()
+			 */
+			lastChangedTimestamp: 0,
…
+		/**
+		 * Note that data waiting to be autosaved has changed
+		 *
+		 * The timer waits until the data has not changed for
+		 * two seconds, so that it does not save in the middle
+		 * of typing.
+		 */
+		markAutosaveChanged() {
+			this.lastChangedTimestamp = Date.now();
+		},
…
-				if (Date.now() - this.lastSavedTimestamp > 60000) {
+				if (
+					Date.now() - this.lastSavedTimestamp > 60000 &&
+					Date.now() - this.lastChangedTimestamp > 2000
+				) {
…
 		updateAutosaveForm(formId, data) {
 			this.updateForm(formId, data);
+			this.markAutosaveChanged();
```

A method rather than the page writing the mixin's field keeps the field
the mixin's own, as `addAutosave()` already does for the queue. The fix
keeps what the timer was written for (save at most once a minute, never
per key) and adds "not while the author is typing"; step changes and
"Save for Later" are not delayed. It was tried on `main` in the three
apps: the save came 2.3 to 2.7 seconds after the last key and carried
the whole Title, and the reload showed it. The Control gave the same
result with the fix as without.

**Alternatives:**

- Save two seconds after every pause, with no minute: closer to a
  usual autosave, but it drops the once-a-minute limit the timer was
  written for and sends a request at every pause.
- Queue the form a second time when it changes again after a timer
  save: the rest would still wait a minute, and the cut value would
  still be stored first.

**What goes with it:**

- A pause of more than two seconds in the middle of a change still
  splits it, and the rest then waits for the next minute; a shorter
  interval after such a save is a product choice left out here.
- The fix of U21 A4 (the footer's "Last saved" counted from the page's
  opening) changes the same condition in `_runAutosaveJobs()`, so the
  two diffs do not apply together as they stand. With both, the
  condition reads:

  ```js
  const since = this.lastSavedTimestamp ?? this.autosaveStartedTimestamp;
  if (Date.now() - since > 60000 && Date.now() - this.lastChangedTimestamp > 2000) {
  ```
- It applies as written to `stable-3_5_0` and `stable-3_4_0`.
- Guard: a plain vitest test beside the mixin. ui-library has no
  `@vue/test-utils` and no DOM test environment, and none of its tests
  mounts a component; mounting this mixin would need both, plus its four
  required props and two callbacks, `$.ajax`, `pkp.currentUser` and a
  reset of the module's timer between tests. The plain test needs none
  of that: it builds the page from `autosave.data()` and
  `autosave.methods` bound to one object (with `isLocalStorageEnabled:
  false` and a `vi.fn()` for `addAutosaves`), moves the clock with
  `vi.setSystemTime()` past the minute, calls `markAutosaveChanged()`,
  and checks that `_runAutosaveJobs()` does not call `addAutosaves`
  until two seconds without a change have passed. It was sketched, not
  run.

Small: about fifteen lines in two ui-library files, and a plain unit
test of about twenty lines.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-autosave-cuts-title-mid-typing/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-footer-last-saved-without-save/lib.js)),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-autosave-cuts-title-mid-typing/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1–8,
  then the Control, and reads the posted title from the browser's own
  request and the stored title from the database.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/wizard-autosave-cuts-title-mid-typing/fix.diff ojs omp ops`,
  the script, then `node bin/try-fix.js revert <the same diff> ojs omp ops`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), on `main` and `stable-3_5_0`, the three apps
  each, one run per app and line ("u" or "u2" on each). The run recorded
  no browser dialog on the reload.
- Not driven: the second save of the rest a minute after the cut one
  (read in the code: line 249, then line 195); "Save for Later" after
  typing (read in the code: `saveForLater()` calls `addAutosaves()`
  first); fields other than Title (read in the code: Title and Subtitle
  are `FieldRichText`, Abstract, the plain language summary and
  "Comments for the Editors" `FieldRichTextarea`, Prefix a `FieldText`,
  each emitting its value on every key through the `currentValue`
  setter; keywords are a
  `FieldControlledVocab`, whose value changes when an entry is
  selected); 3.4 and 3.3. Unverified: the guard test, sketched and not
  run.
- Introduced: `git blame` of `src/mixins/autosave.js` line 195 ends at
  [467034aa41](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2)
  (Nate Wright), which created the mixin and the wizard page, merged in
  `pkp/ui-library#241` (opened by asmecher, merged 2022-12-14).
  `updateAutosaveForm()` in its present shape is from
  [ea75a023e6](https://github.com/pkp/ui-library/commit/ea75a023e6ee82f4ba2a83b04d75e2a6f3441960)
  (Nate Wright, 2023-02-08), which kept the mark-stale-on-every-change
  behaviour.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ui-library for "autosave wizard", "autosave title", "autosave
  typing", "autosave partial", "wizard saved truncated", "_runAutosaveJobs".
- Code reads:
  - 3.5: `src/mixins/autosave.js` is identical to `main`'s, and
    `SubmissionWizardPage.updateAutosaveForm()` the same.
  - 3.4: ui-library `stable-3_4_0`, `src/mixins/autosave.js` line 197
    (the same condition) and `SubmissionWizardPage.vue` lines 579–584
    (`updateAutosaveForm()`, the same); pkp-lib `stable-3_4_0`
    `templates/submission/wizard.tpl` line 84 wires it to the step forms.
  - 3.3: no `src/mixins/autosave.js` in ui-library `stable-3_3_0` and
    no autosave in pkp-lib's submission forms: the 3.3 wizard saves
    each step on its own button.
  - The fix's diff applies (dry run) to the 3.5 and 3.4 files.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
    all with ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1),
    ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
  - `stable-3_4_0`: pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747),
    ui-library
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f).
  - `stable-3_3_0`: pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072),
    ui-library
    [96959f9ed4](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708).
