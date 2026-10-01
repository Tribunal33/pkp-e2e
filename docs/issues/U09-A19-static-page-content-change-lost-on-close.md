# Closing a static page, custom block or reviewer email window after editing only its text loses the text without asking

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS in the custom block window: it has no static pages)
  - 3.5: OJS, OMP, OPS (OPS read in the code)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [3f5f8361f0](https://github.com/pkp/pkp-lib/commit/3f5f8361f0f23efdc8137696d98fb2fef8e2a92e) (2014-12-10)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager writes or edits the text of a static page in its "Content"
box, then presses the window's back arrow. The window closes at once and
the text is gone, without a word. After a change to "Path" or "Title"
the same arrow first asks "The data on this form has changed. Do you
wish to continue without saving?", so the manager has no reason to
expect the loss. Going to another address with the window open loses
the text the same way, without the browser's "Leave site?" question.

The custom block window loses its "Content" the same way. So do an
editor's email windows to a reviewer: an editor who adds a line to the
message in "Thank Reviewer" or "Unassign Reviewer" and closes the panel
loses it without a question, and the window opens again with the
template's text. Any other window built with the older form code does
the same when its formatted-text box is the only thing changed (listed
under Cause). Pressing "Save" or sending before closing is the
only way round.

## Impact

- **Lost**: everything typed in the box since the window opened.
  "Save" and sending close the window, so that is all the unsaved text.
  The page or block keeps its old text; the reviewer gets nothing, since
  nothing was sent.
- **Who**: journal, press and preprint server managers editing a page
  or block (servers through the custom block window, since they have no
  static pages), and journal and press editors writing to a reviewer
  ("Thank Reviewer", "Unassign Reviewer", "Send Reminder" once a review
  is overdue). It happens whenever they close the window or leave the
  page after changing only the text, which is the usual edit of a page,
  a block or a prefilled message.
- **Way round**: "Save" or send before closing, then retype what was
  lost. The question after a "Title" change, or after ticking "Do not
  send an email to the reviewer.", suggests that the text is protected
  too.

Medium: the editor or manager loses typed text without a word, in a
core task (writing to a reviewer), but only by closing the window
without sending or saving, and the task can be done again. It would be
high if the panel also closed on a stray click or key, so that the text
went without the user choosing to close.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (or OMP), journal
  `publicknowledge`. Nothing else: step 2 turns on "Static Pages Plugin",
  which the dataset leaves off.

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Static Pages Plugin".
3. Reload the page and open the "Static Pages" tab. It says "No static
   pages have been created."

Adding:

4. Press "Add Static Page".
5. Click into "Content" and type "u09ir9 a long text the manager has
   just written". Leave "Path" and "Title" empty.
6. Press the window's back arrow (top left, "Close").
7. Press "Add Static Page" again.

Editing:

8. In the window step 7 opened, type Path `u09ir9`, Title "u09ir9 page"
   and Content "u09ir9 first text", and press "Save".
9. On the row "u09ir9 page", press the arrow, then "Edit".
10. In "Content", add " and a second paragraph" at the end. Change
    nothing else.
11. Press the back arrow.
12. Open "Edit" on "u09ir9 page" again.

**Expected**: steps 6 and 11 ask the browser's question

```
The data on this form has changed. Do you wish to continue without saving?
```

and "Cancel" keeps the window with the text.

**Observed**: no question at step 6 or 11; the window closes at once.
At step 7 the new window's "Content" is empty and the list still says
"No static pages have been created.". At step 12 "Content" reads
"u09ir9 first text" only.

Control: typing "x" in "Title" instead of step 5 makes the back arrow ask
the question above, and "Cancel" keeps the window with "x".

Writing to a reviewer (OJS submission 7, "Developing efficacy beliefs in
the classroom", Review round 1; on OMP submission 12, "Connecting ICTs
to Development", Internal review round 1):

13. Open the submission from the "Submissions" list. Under "Reviewers",
    on "Aisla McCrae" (Request Sent), press "More Actions", then
    "Unassign Reviewer".
14. In the message, add " u09ir9 extra line" at the end. Change nothing
    else.
15. Close the side panel with its close control ("Close", top right).
16. Open "Unassign Reviewer" for "Aisla McCrae" again.
17. On "Paul Hudson" (Review Submitted), press "Read Review", then "Mark
    as Complete", and "Mark as Complete" again in the question "Mark
    this review as complete? …" [3.5: "Confirm", no question].
18. On "Paul Hudson", press "Thank Reviewer". Add the same line to the
    message, close the panel, and open "Thank Reviewer" again.

**Expected**: steps 15 and 18 ask the same question before the panel
closes.

**Observed**: no question; the panel closes at once. At step 16 and on
reopening at step 18 the message is the template's text again, without
the added line.

Control: in "Thank Reviewer", adding the line and also ticking "Do not
send an email to the reviewer." makes the close control ask the
question, and "Cancel" keeps the panel with the line.

## Cause

The windows built with the older form code are jQuery handlers over
server-rendered forms: the static page window through the plugin's
`StaticPageFormHandler`, the custom block window and the reviewer and
user email windows through `AjaxFormHandler`. Both inherit change
tracking from pkp-lib's `$.pkp.controllers.form.FormHandler`
(`js/controllers/form/FormHandler.js`) and override none of it.

`FormHandler` learns that the form changed only from a DOM `change`
event on an `:input` of the form
(`$(':input', $form).change(this.callbackWrapper(this.formChange))`) or
from a `formChange` event that a control sends itself, as
`ListbuilderHandler` does. `formChange()` then sets `formChangesTracked`
and sends `formChanged`. Four places read that state before letting the
text go:

- `containerCloseHandler()`, when the window is closed (the back arrow,
  Escape, or a Vue side panel's close through `AjaxModalWrapper.vue`);
- `SiteHandler.pageUnloadHandler_()`, through `formChanged`, for the
  browser's "Leave site?";
- `TabHandler.tabsBeforeActivate()` and its tab close control
  (`TabHandler.js`, lines 135 and 309), when switching or closing a tab;
- `WizardHandler.checkForm_()` (`WizardHandler.js`, line 541), when
  leaving a wizard step.

A "Content" box is a TinyMCE editor in an iframe over a hidden
textarea. Typing there fires no `change` on the textarea. The form
handler's only hook on the editor, `FormHandler.tinyMCEInitHandler_()`,
binds `blur` to copy the text into the textarea
(`tinyMCEObject.save()`) and validate it, and never reports a change;
setting a textarea's value from script fires no `change` either.
(`MultilingualInputHandler.js` has a method of the same name; it only
shows and hides the other languages' popover.) So a change made only in
a formatted-text box never sets `formChangesTracked`, and none of the
four places asks. The hook took this shape in the move to TinyMCE 4
(3f5f8361f0, 2014).

Reach:

- The custom block window ("Custom Block Manager" › "Manage Custom
  Blocks" › "Add Block"): a change only in "Content", then the close
  control, closes without a question on all three apps (checked on
  screen, `main`).
- Leaving the page: with a "Content"-only change in the static page
  window, going to another address raises no "Leave site?" (checked on
  screen, `main`, OJS and OMP).
- Email windows an editor meets in the workflow, opened from the Vue
  submission page in a side panel but built with the older form code.
  "Unassign Reviewer" and "Thank Reviewer" close without a question
  after a change to the message alone (checked on screen, OJS and OMP,
  `main` and 3.5). The same holds in the code for "Send Reminder"
  (offered once a request or review is overdue), "Resend Request",
  "Cancel Reviewer", "Reinstate" and a participant's "Notify". Each
  holds a message prefilled from an email template, and the message is
  usually the only thing the editor changes; picking another template
  or ticking "Do not send an email" counts as a change. "Email Reviewer"
  is safe once its "Subject" is typed.
- Settings windows built the same way (checked in the code): "Email" on
  a user in Users & Roles, review forms and their items, OJS's section
  "Policy" and issue "Description", the subscription windows, and the
  "Bio Statement" on a user's public profile.
- Not affected: the Vue forms (`FieldRichTextarea`), which include the
  discussions, the editorial decisions and their emails, and the
  publication's own fields.

## Proposed fix

In `FormHandler.tinyMCEInitHandler_()`, which already hooks each editor
of the form, report the editor's edits as a form change, the way
listbuilders do:

```diff
 			validator.element(formElement);
 		}));
+
+		// A rich text box is not an ':input' that fires 'change', so report
+		// its edits as a form change, as listbuilders do.
+		tinyMCEObject.on('input change', this.callbackWrapper(function() {
+			this.getHtmlElement().trigger('formChange');
+		}));
 	};
```

The diff against the app root is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/fix.diff).
TinyMCE fires `input` on each keystroke and `change` when an undo level
is added (toolbar formatting, a pasted picture, an inserted tag, undo and
redo), not when the editor loads its saved text. The fix sits in the
shared handler that owns change tracking, so it covers every form built
with the older form code, every form language's box, and all four
places that read the state (closing, leaving the page, tabs, wizard
steps).

It was tried on `main` in all three apps. The static page window now asks
at steps 6 and 11, and "Cancel" keeps the window with its text. The
custom block window asks after a "Content"-only change, and leaving the
page raises "Leave site?". Untouched "Add" and "Edit" windows (a saved
page's filled "Content" included) still close without a question, and a
"Save" after a "Content" change still closes without one and stores the
text. In "Unassign Reviewer" and "Thank Reviewer" (OJS, OMP) the close
control now asks after a change to the message alone, and "Cancel"
keeps the panel with the line.

**Alternatives**

- Check each editor's `isDirty()` in `containerCloseHandler()` and in
  `SiteHandler.pageUnloadHandler_()`: two places to keep in step, and
  tab switching would still miss it.
- Send `formChange` from `SiteHandler.triggerTinyMCESetup()`: it works
  through bubbling, but the site-wide editor set-up does not own form
  state, and the form already has its own editor hook.
- Fire a DOM `change` on the textarea after `save()` on blur: it reports
  nothing until the editor loses the focus.

**What goes with it**

- Nothing stored is wrong, and no API or plugin hook changes. Windows
  that today close silently after a text-only edit will ask instead,
  which is the behaviour their other fields already have.
- Backport: `tinyMCEInitHandler_()` is the same on 3.5, 3.4 and 3.3, so
  the diff applies as written; those lines serve the built
  `pkp.min.js`, so the JavaScript build follows. It was tried only on
  `main` (TinyMCE 7). 3.4 ships TinyMCE 5 and 3.3 TinyMCE 4; read in
  their code, both pass the iframe's `input` event to the editor and
  fire `change` from the undo manager only after a user's edit, as 7
  does, but neither was tried.
- Test: an e2e check that a "Content"-only change, then the back arrow,
  asks the question (pkp-e2e plans one for its custom pages spec).

Small: one handler in one shared file, following the listbuilder
pattern.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/lib.js).
  The neighbour checks (untouched windows, "Cancel" then "Save",
  leaving the page, the custom block window on the three apps) are
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/neighbour.js),
  walked with the fix in and out. On an install freshly loaded from the
  default dataset, from a pkp-e2e checkout (`<feature>` names the set of
  test installs, `<id>` the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The reviewer
  windows (Steps 13–18 and their control) are
  [review.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/review.js),
  run the same way with `ONLY=ojs,omp` in front:
  `ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/review.js`;
  it walked `main` with the fix in and out, and 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-content-change-lost-on-close/fix.diff ojs omp ops`.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01). The `main` installs serve the older scripts
  unminified (`enable_minified = Off`), so the fix was tried without a
  rebuild; it was not tried on 3.5.
- Branch tips. `main`: OJS 68615b5a32, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib 25562b0e1a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  3517e640f2, OMP c7b45f88e, OPS 8eaf899468; pkp-lib b1981810da (OJS)
  and 1fb843f491 (OMP, OPS). 3.4: OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b, pkp-lib 32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883,
  OPS c5532e2161, pkp-lib f6ab331645.
- Code reads. `main`: `FormHandler.js` (`tinyMCEInitHandler_()`,
  `formChange()`, `containerCloseHandler()`), `SiteHandler.js`
  (`triggerTinyMCESetup()`, `registerUnsavedFormElement_()`,
  `pageUnloadHandler_()`), `TabHandler.js`, `WizardHandler.js`,
  `MultilingualInputHandler.js`, `Handler.js` (`initializeTinyMCE()`),
  `ListbuilderHandler.js`, the static page and custom block form
  templates, and the templates with `rich=true` for Reach (the reviewer
  and participant windows' fields). In ui-library on `main`:
  `useReviewerManagerActions.js`, `useParticipantManagerActions.js` and
  `useUserAccessManagerActions.js` (each window opened with
  `openLegacyModal()`), `useLegacyGridUrl.js`, `AjaxModalWrapper.vue`
  (its close sends `containerClose` to the form), and
  `DiscussionManager` (Vue fields). 3.5: `FormHandler.js`. 3.4 and 3.3:
  `FormHandler.js` (the same `tinyMCEInitHandler_()`, blur only),
  `SiteHandler.js` (no change hook on the editor), `package.json`
  (TinyMCE ^5.10.0 and ^4.9.11), and TinyMCE's own source at 5.10.9 and
  4.9.11 (`EventDispatcher.ts`, whose native events include `input`;
  `UndoManager.ts` and `undo/Operations.ts`, which fire `change` only
  for a level added after the first, or on the first typed character);
  the static page form at the plugin commits those lines pin
  (9568981e8c, 8c97bd09d4) runs the same handler; OMP and OPS ship
  "Custom Block Manager" there, OMP "Static Pages" too.
- Introduced: `git blame` on the hook gives 3f5f8361f0 (the move to
  TinyMCE 4, 2014-12-10), which rewrote 33a7240af0 (2012-09-04, the
  hook's first form: blur, save, validate). Neither reported a change,
  and no commit touching `FormHandler.js` or `SiteHandler.js` ever
  hooked an editor's change.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  TinyMCE with "unsaved", "without saving", `formChange`,
  `tinyMCEInitHandler`, and static page content lost. `pkp/pkp-lib#13177`
  (rich text boxes not reset between windows) and `pkp/pkp-lib#8059`
  (an error after cancelling the question in "Add discussion") are other
  faults.
- Not driven: 3.5 OPS and the custom block window on 3.5; 3.4 and 3.3;
  the other windows in Reach (code only), "Send Reminder" included, since
  no review in the default dataset is overdue; untouched reviewer email
  windows with the fix in (whether loading a template's text counts as
  a change is unverified there; untouched static page and block windows
  were checked); whether the side panel closes on a click outside it;
  Escape after a "Content"-only change; Firefox and Safari.
