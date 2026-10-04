# Closing "Activity Log & Notes" drops a typed, unadded note without asking once the submission has a note

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#1648` for `pkp/pkp-lib#1647` · [a90c31b1e8](https://github.com/pkp/pkp-lib/commit/a90c31b1e8164c8a441821181dd47b07e50ef826) · 2016-07-26 · Nate Wright (NateWr), for the silent close; the repeated question after a tab switch is older, present since at least [ea8d4cda2f](https://github.com/pkp/pkp-lib/commit/ea8d4cda2f959149b9f5471f858f4defef931355) (2012-07-24)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U38 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a3), [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a9), [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor types a note in "Activity Log & Notes" › "Notes" and closes
the window without pressing "Add Note": with "Close" (the arrow at the
window's top left), with Escape, or with a click beside the window.
While the submission has no note, the window asks "The data on this
form has changed. Do you wish to continue without saving?". Once the
submission has a note, it closes at once and the typed text is gone,
with no question.

The window also asks when nothing is left to lose. After such a silent
close, the next reload or page change asks the browser's "Leave site?";
answering "Leave" loses nothing, since nothing is typed. And on a
submission with no note, after the editor switches to "History" and
answers "OK" to discard the text, "Close" asks the same question again.

Only an unadded draft note is lost, and pressing "Add Note" before
closing avoids it.

## Impact

- **Lost:** the text of a note typed and not yet added, silently. The
  notes already added are kept.
- **Who:** editors, section editors and managers who use the
  submission's notes, on every submission that holds at least one note.
- **Way round:** press "Add Note" before closing. Nothing carries over:
  a page load ends the wrong questions.

Low: a draft internal note is lost without the question the window asks
on a submission without a note, and the other two symptoms only ask once too often. It would
be medium if the text lost were a core task's, such as a review or a
decision's message.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded.
- The submission used has no note. No submission in the dataset has one:
  OJS submission 4, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice"; OMP submission 3, "The
  Political Economy of Workplace Injury in Canada"; OPS submission 1,
  "The influence of lactation on the quantity and quality of cashmere
  production". Step 8 adds the one note the steps need.

Without a note:

1. Sign in as `dbarnes` and open the submission from the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`; each app's
   submission is listed under "Active submissions").
2. Press "Activity Log" in the workflow's header. "Activity Log & Notes"
   opens on "History".
3. Open "Notes" ("There are no notes to display."). Type "Draft u38a" in
   the box above "Add Note", and do not press "Add Note".
4. Press "Close". The browser asks "The data on this form has changed.
   Do you wish to continue without saving?". Press "Cancel": the window
   stays open, the text with it.
5. Press "History". The same question; press "OK". "History" opens.
6. Press "Close".
7. Reload the page.

With a note:

8. Press "Activity Log", open "Notes", type "First note u38a" and press
   "Add Note". "Note posted." shows and the note is listed.
9. Type "Draft u38a" in the box, and do not press "Add Note".
10. Press "Close".
11. Wait two seconds (for about half a second after any close the
    closing window can still raise the page's leave question, so the
    wait keeps this reload apart from the close), then reload the page.

**Expected:** at step 6 the window closes without a question, since
the switch in step 5 already discarded the text. At step 10 the question of step 4 comes up; "OK"
closes the window and drops the text. Neither reload asks anything,
since nothing is typed on screen.

**Observed:** at step 6 the browser asks again:

```
The data on this form has changed. Do you wish to continue without saving?
```

"OK" closes the window. At step 10 the window closes at once, without a
question. Reopened, "Notes" lists "First note u38a" and an empty box:
"Draft u38a" is gone. At step 11 the browser asks its own "Leave site?
Changes you made may not be saved." ("Leave" reloads). The reload at
step 7 asks nothing.

## Cause

The window is a legacy page fragment shown in a Vue side panel. Each of
its forms is a `FormHandler` (`lib/pkp/js/controllers/form/FormHandler.js`)
that sets `formChangesTracked` when one of its fields changes, and sends
`formChanged`, which puts an entry in `SiteHandler`'s list for the
browser's page-leave question. On closing, the panel asks the forms through ui-library's
`src/components/Modal/AjaxModalWrapper.vue`:

```js
registerCloseCallback(() => {
	const form = $(contentDiv.value).find('form').first();
	if (form.length == 1) {
		const informationObject = {closePermitted: true};
		form.trigger('containerClose', [informationObject]);
		...
```

Only the first form in the window hears of the close.
`FormHandler.containerCloseHandler()` asks the question when that form
has changes. On "OK" it triggers `unregisterAllForms`, which clears
`SiteHandler`'s list.

The "Notes" tab (`lib/pkp/templates/controllers/informationCenter/notes.tpl`)
lists the notes before the new note's form, and for an editor each note
carries a "Delete" form (`deleteNoteForm-{id}`, `note.tpl`). With no
note, the first form is `newNoteForm`, so closing asks (step 4). With a
note, the first form is the first note's "Delete" form, which never
changes, so the window closes without asking (step 10). Since no
`containerClose` reached `newNoteForm`, nothing unregisters it: the
form's entry stays in `SiteHandler`'s list, and `pageUnloadHandler_()`
raises "Leave site?" at the next reload (step 11). The form came first
until a90c31b1e8 moved it below the list.

The tab switch is the other half. `TabHandler.tabsBeforeActivate()`
(`lib/pkp/js/controllers/TabHandler.js`) asks the same question when a
form in the tab being left has changes. On "OK" it triggers
`unregisterAllForms` (line 148), but it leaves each form's
`formChangesTracked` set. The window's tabs keep the content of the tab
being left (no
`emptyLastTab`), and reload it when it is opened again. So after the
switch, `newNoteForm` sits in the hidden "Notes" panel still marked
changed. With no note it is the window's first form, and "Close" asks
again (step 6). Opening "Notes" again loads a fresh form, which
ends it.

Reach:

- A file's "More Information" window (the same templates, through
  `FileInformationCenterHandler`) has the History tab's search form
  (`eventLogFilterForm`) as its first form. So its "Close" never asks,
  with notes or without, and leaves the same stray "Leave site?"
  (checked on screen, all three apps; spec U36 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a18)).
- "Close", Escape and a click beside the window are one path: the side
  panel (`SideModal.vue`, `handleClose()`) runs the wrapper's close
  callback for each (checked in the code; Escape with the cursor out of
  the box also on screen, by the spec's own checks). Escape with the
  cursor in the box does nothing.
- Every legacy window opened in a side panel goes through the same close
  check: any whose typed-in form is not its first one drops the typing
  the same way (checked in the code; no other such window was walked).
- `tabsBeforeActivate()` serves every legacy tab set (`TabHandler`):
  among them the file metadata window, an issue's window, the review
  form editor and the import/export plugin pages (checked in the code).
  A tab's forms stay marked changed after "OK" in each of them. The mark
  is read later only by a window's close check: the side panel's on
  `main` and 3.5, `ModalHandler.modalClose()` on 3.4 and 3.3, so the
  repeated question shows in a window on every version.
- 3.4 and 3.3 open the window through the legacy `AjaxModalHandler`.
  `ModalHandler.modalClose()` there has the same first-form check, and
  the templates and `TabHandler` are the same (checked in the code).

## Proposed fix

Two changes, proposed as one fix because each one alone leaves a
symptom. In the wrapper, ask the form that holds changes, wherever it
sits. In `TabHandler`, clear the mark of the forms a switch has just
discarded. Without the second change, the first would make step 6 ask
again on every submission, notes or not.

```diff
--- a/lib/ui-library/src/components/Modal/AjaxModalWrapper.vue
+++ b/lib/ui-library/src/components/Modal/AjaxModalWrapper.vue
 registerCloseCallback(() => {
-	// eslint-disable-next-line no-unused-vars
-	const form = $(contentDiv.value).find('form').first();
+	// Ask the form that holds unsaved changes, wherever it sits in the window
+	// (the notes window lists a delete form per note above the new note's form);
+	// with none changed, the first form hears of the close as before
+	const forms = $(contentDiv.value).find('form');
+	const changedForms = forms.filter(function () {
+		return (
+			$.pkp.classes.Handler.hasHandler($(this)) &&
+			$.pkp.classes.Handler.getHandler($(this)).formChangesTracked
+		);
+	});
+	const form = (changedForms.length ? changedForms : forms).first();

--- a/lib/pkp/js/controllers/TabHandler.js
+++ b/lib/pkp/js/controllers/TabHandler.js
 			} else {
 				this.trigger('unregisterAllForms');
+				// The changes are discarded (the tab reloads its content when it
+				// is opened again), so its forms no longer hold unsaved data.
+				this.$currentTab_.find('form').each(function() {
+					var handler;
+					if ($.pkp.classes.Handler.hasHandler($(this))) {
+						handler = $.pkp.classes.Handler.getHandler($(this));
+						if (handler.formChangesTracked) {
+							handler.unregisterForm();
+						}
+					}
+				});
 			}
```

The diff against the app root is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-close-drops-typed-note/fix.diff),
and it applies unchanged to all three apps. Both changes follow code
already there. `tabsBeforeActivate()` itself finds a changed form among
all the tab's forms with `Handler.getHandler(...).formChangesTracked`.
The close link `TabHandler.addTab()` adds to a tab, and
`WizardHandler.checkForm_()`, call `unregisterForm()` on a form whose
changes the user has agreed to drop. The question, its "OK" and the
`unregisterAllForms` that clears the page-leave list stay in
`FormHandler.containerCloseHandler()`, so the window still asks once.

It was tried on `main` in all three apps. With the fix, step 6 closes
without a question, step 10 asks and "OK" closes, and step 11 reloads
without "Leave site?". The paths the fix must leave alone behaved the
same with the fix and without it: the tab switch still asks and
"Cancel" keeps the text, and a note added with "Add Note" and an
untouched window close without a question.

**Alternatives:**

- Ask from `SiteHandler`'s page-leave list instead of the forms. That
  list is page-wide, so it cannot tell this window's forms from a form
  changed elsewhere on the page.
- Put the new note's form above the list again. That fixes only this
  window: the file window's search form stays first.
- Empty the tab being left (`emptyLastTab`) in this window. That ends
  the repeated question here only, and every other tab set keeps the
  stale mark.

**What goes with it:**

- No stored data to repair, no API or plugin hook touched.
- A legacy window whose second form has changes will now ask on closing.
  That is the intended reach, the file window (U36 A18) included.
- The test: an e2e scenario of the Steps in pkp-e2e (a Planned item in
  spec U38; the kept script below takes them today). A ui-library unit
  test would need a mock of the legacy handler registry
  (`$.pkp.classes.Handler`), which its test setup does not provide.
- Shipping: the ui-library change reaches each app through a submodule
  bump and a JavaScript rebuild, beside the pkp-lib change.
- Backport: 3.5 takes the diff as it stands. 3.4 and 3.3 need the
  wrapper's change made in `ModalHandler.modalClose()` instead, plus the
  same `TabHandler` change.

Medium: two separate faults in the change tracking, a few lines each,
but in two repositories (pkp-lib and ui-library), and the change of
close check reaches every legacy window.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/activity-log-close-drops-typed-note/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-close-drops-typed-note/walk.js)
  takes the Steps on each app, signed in as `dbarnes`, with its helpers
  in `lib.js` beside it. It reads what the browser asked at each step and
  answers as the Steps say. It runs under pkp-e2e's own probe runner,
  on an install loaded with the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/activity-log-close-drops-typed-note/walk.js`.
  `MODE=neighbour` in front runs, alone, the paths the fix must leave
  alone: on a fresh load, the window with nothing typed, the tab switch
  answered "Cancel", a note added with "Add Note", and "History" and
  back to "Notes" with nothing typed, each followed by "Close" and a
  reload.
- Walked on `main` and 3.5, OJS, OMP and OPS, on PKP's default test
  dataset (pkp/datasets 566bb1f, 2026-10-03), PostgreSQL. The browser's
  questions are the `confirm()` and `beforeunload` dialogs the page
  raised. No request failed and no script error was logged.
- The fix trial: `fix.diff` applied to the `main` checkouts of the
  three apps (JavaScript rebuilt), the dataset reloaded before each run,
  then the script, then `MODE=neighbour` with the fix and again after
  reverting it.
- Tips: `main` OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363),
  OMP 3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5); 3.5 OJS c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246 and
  OPS 38b61882d3 (pkp-lib cf3f984335), ui-library d4e01883; 3.4 pkp-lib
  767353f4fe, ui-library ee684b34, OJS d68934d0d1, OMP 0aec65441, OPS
  acd8ae704b; 3.3 pkp-lib ac3fa73402, ui-library 96959f9e, OJS
  ac77c9fb35, OMP 8e72fc883, OPS c5532e2161.
- Code reads: `AjaxModalWrapper.vue` and `SideModal.vue` (`main`, 3.5);
  `TabHandler.js`, `FormHandler.js` (`containerCloseHandler`,
  `unregisterForm`), `SiteHandler.js` (`unsavedFormElements_`,
  `pageUnloadHandler_`), `notes.tpl`, `note.tpl`, `newNoteForm.tpl` and
  `informationCenter.tpl` on every line. On 3.4 and 3.3:
  `ModalHandler.modalClose()` (the same `find('form').first()` and
  `containerClose`), ui-library's `WorkflowPage.vue` `openActivity()`
  (an `AjaxModalHandler`), and each app's `templates/workflow/workflow.tpl`
  (the "Activity Log" button, in all three apps).
- Introduced: blame on the wrapper's line leads to ui-library bca29726a
  (2023-11-27, the side panel), which copied `ModalHandler.modalClose()`'s
  check, which dates from pkp-lib fa58d3dc19 (2011). It read the right
  form until a90c31b1e8 moved the new note's form below the notes list;
  before it (pkp-lib 002fb605a8, 2013) the form came first. GitHub's
  `commits/a90c31b1e8…/pulls` names `pkp/pkp-lib#1648` as its pull
  request. `TabHandler`'s `unregisterAllForms` without clearing the
  forms' mark is present at ea8d4cda2f (2012), the oldest commit read.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops,
  issues and pull requests, searched by the symptom's words ("note",
  "close", "unsaved", "continue without saving", "Leave site") and by
  `containerClose`, `formChangesTracked`, `AjaxModalWrapper`,
  `registerCloseCallback`, `unregisterAllForms` and
  `tabsBeforeActivate`; no match. `pkp/pkp-lib#7869` (a multilingual
  field closing a window on "Save", 3.3) is another fault.
- Not driven, and so unverified on screen: 3.4 and 3.3, and the other
  legacy windows whose typed-in form is not the first one (the file
  window apart). MySQL not checked; the fault is in the browser's script
  and does not depend on the database.
