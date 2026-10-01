# Reopened submission draft's footer says "Last saved 3 seconds ago" though nothing was saved

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no autosaving submission wizard)
- **Introduced** `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [467034aa41](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-31 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An author who reopens a draft in the submission wizard, or reloads the
page, finds the footer reading "Last saved 3 seconds ago" and counting
up from there. Nothing has been saved: the time is counted from the
moment the page opened, and the draft's last save may lie minutes or
days back.

The draft itself is intact. The false time stays until the wizard
first saves a change, and for the whole visit when nothing is changed.

## Impact

- **Lost:** nothing. What the page shows on opening is what the server
  holds, and the false time is always earlier than any change typed
  since, as a true one would be.
- **Who:** every author, and every editor or manager completing a
  draft, each time a wizard page opens: "Complete submission" in "My
  Submissions", the "Save for Later" email's link, or a reload.
- **Way round:** none needed.

Low: a status line that shows a wrong time while the draft is right. It
would be medium if the false time could make an unsaved change look
saved; it cannot, because it is set when the page opens, before any
change. An author who types in the first minute and then leaves does
lose that change, with "Last saved 48 seconds ago" in the footer, but
the same happens after a real save (spec U21
[A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a15),
leaving without a prompt).

## Steps to reproduce

Preconditions: the default dataset, OJS `main` (OMP and OPS the same;
on OMP sign in as `aclark`).

1. Sign in as `ccorino`.
2. Open the new-submission page
   (`/index.php/publicknowledge/en/submission`).
3. Title "u21w37 Footer Check", section "Articles" (OMP: series
   "Library & Information Studies"; OPS: "Preprints"), language
   "English", tick the checkboxes, press "Begin Submission". The wizard
   opens on "Upload Files" [3.5: on "Details"].
4. Change nothing. Open "My Submissions"
   (`/index.php/publicknowledge/en/dashboard/mySubmissions`).
5. Wait two minutes.
6. On the row "u21w37 Footer Check", press "Complete submission".
7. Read the footer beside "Save for Later" a few seconds after the
   page opens, and again 30 seconds later.

**Expected:** nothing has been saved since step 3, more than two
minutes ago, so the footer shows no "Last saved" time (or "Last saved 2
minutes ago").

**Observed:** three seconds after the page opens the footer reads "Last
saved 3 seconds ago", and 30 seconds later "Last saved 33 seconds ago".
The browser sent no save request between step 3 and step 7.

Control: after a real save the footer is right. The author pressed
"Continue" to "Details" and typed in "Title" 34 seconds after the page
opened. The wizard saved the Title 61 seconds after the page opened,
not straight after the typing, and the footer then read "Last saved 0
seconds ago".

## Cause

In ui-library's autosave mixin (`src/mixins/autosave.js`), `data()`
starts `lastSavedTimestamp` at `Date.now()` (line 55), although the
field is documented as "A timestamp when the last autosave occured".
The one field serves two readers with different needs:

- the timer, `_runAutosaveJobs()` (line 195), which queues changed
  forms once more than a minute has passed since `lastSavedTimestamp`,
  and needs a start time when the page opens;
- the footer: `SubmissionWizardPage.setLastAutosaveMessage()` (lines
  599–610, run every three seconds from `created()`) renders
  `common.lastSaved`, "Last saved {$when}", from it, and pkp-lib's
  `templates/submission/wizard.tpl` (line 178) shows that message. The
  footer needs the time of a real save.

Seeding the field with the page's opening serves the timer and makes
the footer claim a save. `setLastAutosaveMessage()` already clears the
message when `lastSavedTimestamp` is empty (line 600), so the footer
was meant to stay blank until a save; that branch never runs today.

The false time lasts until the first real save: the timer's, on the
first 500 ms tick more than a minute after the page opened, and only
when a form has changed; a step change after a change; or "Save for
Later". While a save fails the footer shows "Reconnecting" instead of
any time (`wizard.tpl` lines 172–177).

Reach:

- All three apps: OMP's and OPS's wizards extend
  `SubmissionWizardPage` and share the template (driven on all three).
- No other screen: the mixin has no other user in ui-library (code).
- The one other writer, `_sendAutosave()`'s success callback, sets the
  field to the saved payload's time, which is right (code).

## Proposed fix

A proposal; the team decides. Start `lastSavedTimestamp` empty and give the timer its own start time,
which it uses until the first save
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-footer-last-saved-without-save/fix.diff),
ui-library):

```diff
-			lastSavedTimestamp: Date.now(),
+			lastSavedTimestamp: null,
+
+			/**
+			 * A timestamp when the autosave timer began counting
+			 * towards the first autosave
+			 */
+			autosaveStartedTimestamp: Date.now(),
…
-				if (Date.now() - this.lastSavedTimestamp > 60000) {
+				const since = this.lastSavedTimestamp ?? this.autosaveStartedTimestamp;
+				if (Date.now() - since > 60000) {
```

The footer's existing empty-message branch then does the rest, and the
first timer save still comes a minute after the page opens, as today.
It was tried on `main` in the three apps: the Steps showed an empty
footer at step 7, five seconds after the page opened and 30 seconds
later. In the Control the Title, typed 37 seconds after the page
opened, was saved 61 seconds after it, and the footer then read "Last
saved 0 seconds ago", as without the fix.

**Alternatives:**

- Seed the field from the submission's last-modified time, so the
  footer gives the real age of the draft: that time also moves on
  changes made outside the wizard, and on a draft untouched for more
  than a minute the timer would queue a save on the first keystroke
  instead of a minute later.
- Hide the message in `SubmissionWizardPage` behind a "has saved" flag:
  it works, but leaves the mixin's field meaning something else than
  its name.

**What goes with it:**

- The fix of U21 A18 (the wizard saving a change mid-typing) changes
  the same condition in `_runAutosaveJobs()`, so the two diffs do not
  apply together as they stand. With both, the condition reads:

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
  false` and a `vi.fn()` for `addAutosaves`), and checks with
  `vi.setSystemTime()` that `lastSavedTimestamp` is null after
  `data()`, and that `_runAutosaveJobs()` calls `addAutosaves` only once
  61 seconds have passed. It was sketched, not run.

Small: a few lines in one ui-library file, and a plain unit test of
about twenty lines.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-footer-last-saved-without-save/walk.js)
  (helpers in its `lib.js`), run on a fresh load of the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-footer-last-saved-without-save/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1–7,
  then the Control. With `EDIT=1` it takes steps 1–7 and then, in place
  of the Control, types " edited" at the end of the Title 35 seconds
  after the page opened, reads the footer 15 seconds later ("Last saved
  48 seconds ago"), opens "My Submissions" and reopens the draft: the
  Title was the old one, no save had been sent and no prompt appeared
  (OJS `main`, the Impact's severity sentence).
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/wizard-footer-last-saved-without-save/fix.diff ojs omp ops`,
  the script, then `node bin/try-fix.js revert <the same diff> ojs omp ops`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), on `main` and `stable-3_5_0`, the three apps
  each.
- Introduced: `git blame` of `src/mixins/autosave.js` lines 55 and 195
  and of `SubmissionWizardPage.vue` line 600 ends at
  [467034aa41](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2)
  (Nate Wright), which created the mixin, merged in
  `pkp/ui-library#241` (opened by asmecher, merged 2022-12-14). Lines
  604, 605 and 608 of `setLastAutosaveMessage()` blame to
  [70e4f77b8c](https://github.com/pkp/ui-library/commit/70e4f77b8ca5493295272168ac7c7b09c8ddb5d9) (2025-03-06), which
  moved the relative time from moment to `useDate` and changed nothing
  else.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ui-library for "autosave wizard", "last saved", "autosave
  title", "lastSavedTimestamp", "_runAutosaveJobs". `pkp/pkp-lib#12602`
  (open) is about the same footer but another fault: its live region
  announcing the time to screen readers.
- Code reads:
  - 3.5: `src/mixins/autosave.js` is identical to `main`'s, and
    `SubmissionWizardPage.vue`'s `setLastAutosaveMessage()` the same.
  - 3.4: ui-library `stable-3_4_0`, `src/mixins/autosave.js` line 57
    (`lastSavedTimestamp: Date.now()`) and line 197, and
    `SubmissionWizardPage.vue` lines 451–457 (the same message, built
    with moment); pkp-lib `stable-3_4_0`
    `templates/submission/wizard.tpl` line 165 shows it.
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
- Not driven: the "Save for Later" email's link and a plain reload (the
  same page load as "Complete submission", read in the code); 3.4 and
  3.3. Unverified: the guard test, sketched and not run.
