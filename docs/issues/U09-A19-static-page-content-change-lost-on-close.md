# Closing a static page, custom block, reviewer email or issue window after editing only its text loses it without asking

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS in the custom block window: it has no static pages)
  - 3.5: OJS, OMP, OPS (OPS read in the code)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [3f5f8361f0](https://github.com/pkp/pkp-lib/commit/3f5f8361f0f23efdc8137696d98fb2fef8e2a92e) (2014-12-10)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U09 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a19),
  spec U50 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a16)
- **Checked** 2026-10-01 and 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager writes or edits the text of a static page in its "Content"
box, then presses the window's back arrow. The window closes at once and
the text is gone, without a word. After a change to "Path" or "Title"
the same arrow first asks "The data on this form has changed. Do you
wish to continue without saving?", so the manager has no reason to
expect the loss.

The same happens in about fifteen windows built on the older form
framework (the windows drawn by the server, not the newer Vue forms)
whenever a text box with formatting buttons is the only thing changed.
The ones met most often are the custom block window's "Content"; an
editor's emails to a reviewer ("Thank Reviewer", "Unassign Reviewer",
"Send Reminder", "Resend Request", "Cancel Reviewer", "Reinstate"), which
open again with the template's text; and an issue's "Description" on
"Issue Data", which is also lost without the question when the Journal
Manager presses another tab of the issue's window. Pressing "Save" or
sending before closing is the only way round.

All of these windows share one piece of form code, so one change there
fixes them all.

## Impact

- **Lost**: everything typed in the box since the window opened; nothing
  is saved or sent.
- **Who**: journal, press and preprint server managers editing a static
  page or custom block; journal and press editors writing to a reviewer;
  Journal Managers editing an issue. It happens whenever they close the
  window, switch tabs or leave the page after changing only the text,
  which is the usual edit of a page, a block or a prefilled message.
- **Way round**: none once the text is gone; it has to be typed again.

Medium: the editor or manager loses typed text without a word, in a
core task (writing to a reviewer), but only by closing the window or
switching tabs without saving or sending, and the task can be done
again. It would be high if the window closed without the user choosing
to; a click outside the panel and Escape were not checked.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, journal, press or server
  `publicknowledge`. Nothing else: step 2 turns on "Static Pages Plugin"
  and "Custom Block Manager", which the dataset leaves off.

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Static Pages Plugin" (OJS, OMP)
   and "Custom Block Manager".
3. Reload the page and open the "Static Pages" tab. It says "No static
   pages have been created."

Adding a static page (OJS, OMP):

4. Press "Add Static Page".
5. Click into "Content" and type "u09ir9 a long text the manager has
   just written". Leave "Path" and "Title" empty.
6. Press the window's back arrow (top left, "Close").
7. Press "Add Static Page" again.

Editing a static page (OJS, OMP):

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

The custom block window (OJS, OMP, OPS):

13. Settings › Website › "Plugins": on "Custom Block Manager", press the
    arrow, then "Manage Custom Blocks", then "Add Block".
14. Type "u09ir9 block text" in "Content" only, and press the window's
    close control.

**Expected**: the same question. **Observed**: the window closes at once.

Leaving the page (OJS, OMP):

15. Open the "Static Pages" tab, press "Add Static Page" and type
    "u09ir9 leaving" in "Content" only.
16. Type another address of the site in the browser's address bar
    (`/index.php/publicknowledge/en/submissions`) and press Enter.

**Expected**: the browser asks "Leave site?". **Observed**: the new page
opens at once.

Writing to a reviewer (OJS submission 7, "Developing efficacy beliefs in
the classroom", Review round 1; on OMP submission 12, "Connecting ICTs
to Development", Internal review round 1):

17. Open the submission from the "Submissions" list ("All Active" on OMP,
    where submission 12 has no editor assigned). Under "Reviewers", on
    "Aisla McCrae" (Request Sent), press "More Actions", then "Unassign
    Reviewer".
18. In the message, add " u09ir9 extra line" at the end. Change nothing
    else.
19. Close the side panel with its close control ("Close", top right).
20. Open "Unassign Reviewer" for "Aisla McCrae" again.
21. On "Paul Hudson" (Review Submitted), press "Read Review", then "Mark
    as Complete", and "Mark as Complete" again in the question "Mark
    this review as complete? …" [3.5: "Confirm", no question].
22. On "Paul Hudson", press "Thank Reviewer". Add the same line to the
    message, close the panel, and open "Thank Reviewer" again.

**Expected**: steps 19 and 22 ask the same question before the panel
closes.

**Observed**: no question; the panel closes at once. At step 20 and on
reopening at step 22 the message is the template's text again, without
the added line.

Control: in "Thank Reviewer", adding the line and also ticking "Do not
send an email to the reviewer." makes the close control ask the
question, and "Cancel" keeps the panel with the line.

Switching tabs, in an issue's window (OJS; issue 2, "Vol. 2 No. 1
(2015)", which the dataset holds unpublished under "Future Issues"):

23. Open "Issues", tab "Future Issues". On "Vol. 2 No. 1 (2015)", press
    the arrow, then "Edit".
24. In "Issue Management: Vol. 2 No. 1 (2015)", press the "Issue Data"
    tab.
25. Click into "Description" and type "u50a16 An issue about tides.".
    Change nothing else.
26. Press the "Table of Contents" tab.
27. Press "Issue Data" again.
28. Type the same text in "Description" again, and press the window's
    "Close" (top right).
29. Open "Edit" on "Vol. 2 No. 1 (2015)" again, and press "Issue Data".

**Expected**: steps 26 and 28 ask the same question, and "Cancel" keeps
"Issue Data" with the text.

**Observed**: no question. At step 26 "Table of Contents" opens at once,
and at step 28 the window closes. At steps 27 and 29 "Description" is
empty.

Control: typing "u50a16" in "URL Path" instead of step 25 makes step 26
ask the question, and "Cancel" keeps "Issue Data" with "u50a16".

## Cause

The windows built on the older form framework are jQuery handlers over
server-rendered forms: the static page window through the plugin's
`StaticPageFormHandler`; the custom block window, "Thank Reviewer",
"Resend Request" and the user email window through `AjaxFormHandler`;
"Unassign Reviewer", "Cancel Reviewer", "Reinstate" and "Send Reminder"
through its subclass `ReviewerActionFormHandler`, and an issue's "Issue
Data" through its subclass `FileUploadFormHandler`. All inherit change tracking from pkp-lib's
`$.pkp.controllers.form.FormHandler` (`js/controllers/form/FormHandler.js`)
and override none of it.

`FormHandler` learns that the form changed only from a DOM `change`
event on an `:input` of the form
(`$(':input', $form).change(this.callbackWrapper(this.formChange))`) or
from a `formChange` event that a control sends itself, as
`ListbuilderHandler` does. `formChange()` then sets `formChangesTracked`
and sends `formChanged`. Four places read that state before letting the
text go:

- `containerCloseHandler()`, when the window is closed. On `main` every
  one of these windows is drawn in a Vue side panel
  (`AjaxModalHandler.modalOpen()` mounts `AjaxModalWrapper.vue`), so the
  back arrow and the panel's close control are one path, through the
  wrapper's close callback;
- `SiteHandler.pageUnloadHandler_()`, through `formChanged`, for the
  browser's "Leave site?";
- `TabHandler.tabsBeforeActivate()` and its tab close control
  (`TabHandler.js`, lines 135 and 309), when switching or closing a tab;
- `WizardHandler.checkForm_()` (`WizardHandler.js`, line 541), when
  leaving a wizard step.

A text box with formatting buttons is a TinyMCE editor in an iframe over
a hidden textarea. Typing there fires no `change` on the textarea. The
form handler's only hook on the editor,
`FormHandler.tinyMCEInitHandler_()`, binds `blur` to copy the text into
the textarea (`tinyMCEObject.save()`) and validate it, and never reports
a change; setting a textarea's value from script fires no `change`
either. (`MultilingualInputHandler.js` has a method of the same name; it
only shows and hides the other languages' popover.) So a change made
only in such a box never sets `formChangesTracked`, and none of the four
places asks.

Reach:

- The custom block window: a "Content"-only change, then the close
  control (checked on screen, `main`, three apps).
- Leaving the page with a "Content"-only change in the static page
  window raises no "Leave site?" (checked on screen, `main`, OJS and
  OMP).
- Switching tabs: in an issue's "Issue Management" window, after a change
  only in "Issue Data"'s "Description", another tab opens and the
  window's "Close" closes it, both without a question; the text is gone
  when "Issue Data" opens again (checked on screen, OJS `main` and 3.5).
  The window's tabs are a `TabHandler` (`editIssueTabs` in `issue.tpl`)
  on 3.4 and 3.3 too, with the same `tabsBeforeActivate()` (checked in
  the code).
- The email windows an editor meets in the workflow. "Unassign Reviewer"
  and "Thank Reviewer" close without a question after a change to the
  message alone (checked on screen, OJS and OMP, `main` and 3.5). The
  same holds in the code for "Send Reminder" (offered once a request or
  review is overdue), "Resend Request", "Cancel Reviewer", "Reinstate"
  and a participant's "Notify" (`StageParticipantNotifyHandler`). Picking
  another template or ticking "Do not send an email" counts as a change.
  "Email Reviewer" asks once its empty "Subject" is typed in.
- Other windows built the same way (checked in the code): "Email" on a
  user in Users & Roles, review forms and their items, OJS's section
  "Policy", the subscription windows, and the "Bio Statement" on a
  user's public profile.
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
 		}));
 	};
```

The diff against the app root is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/fix.diff).
TinyMCE fires `input` on each keystroke and `change` when an undo level
is added (toolbar formatting, a pasted picture, an inserted tag, undo and
redo), not when the editor loads its saved text. The hook runs from the
editor's `init_instance_callback`, so the listener is bound after the
saved or template text is in. The fix sits in the shared handler that
owns change tracking, so all four places in the Cause see the change.

It was tried on `main` in all three apps. Every window in the Steps now
asks at the step that closed or left it, and "Cancel" keeps the text.
Untouched windows still close without a question: a static page's
"Add" and "Edit" (a saved page's filled "Content" included), "Add
Block", an issue's "Issue Data" (a saved description included), and
"Unassign Reviewer" and "Thank Reviewer" with their template text (OJS).
A "Save" after a change still closes without a question and stores the
text. The one place where script replaces an editor's text after it
loads, `ReviewerActionFormHandler.updateTemplate()` (`setContent()`),
runs only after the user picks another template, which the template
list's own `change` already counts.

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
- Backport: `tinyMCEInitHandler_()` is the same on 3.5, 3.4 and 3.3. The
  diff applies as written on 3.5, and with a two-line offset on 3.4 and
  3.3. Stable installs serve the built `pkp.min.js`, so a backport
  rebuilds it. It was tried only on `main` (TinyMCE 7). 3.4 ships
  TinyMCE 5 and 3.3 TinyMCE 4; read in their code, both pass the
  iframe's `input` event to the editor and fire `change` from the undo
  manager only after a user's edit, as 7 does, but neither was tried.
- Test: an e2e check that a "Content"-only change, then the back arrow,
  asks the question.

Small: one handler in one shared file, following the listbuilder
pattern.

## Evidence

- The kept scripts, run from a pkp-e2e checkout on an install freshly
  loaded from the default dataset (`<feature>` names the set of test
  installs, `<id>` the output folder), with `PKP_E2E_LINE=stable-3_5_0`
  in front for 3.5; the fix is applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-content-change-lost-on-close/fix.diff ojs omp ops`.
  - Steps 1–12:
    [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/walk.js),
    helpers in
    [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/lib.js):
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/walk.js`.
  - Steps 13–16 and the fix's reach on untouched static page and block
    windows:
    [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/neighbour.js),
    the same command; walked on `main` with the fix in and out.
  - Steps 17–22:
    [review.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/review.js),
    `ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/review.js`;
    walked on `main` with the fix in and out, and on 3.5. The untouched
    reviewer windows with the fix in:
    [untouched.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/untouched.js),
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/static-page-content-change-lost-on-close/untouched.js`
    (OJS `main`).
  - Steps 23–29:
    [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-description-tab-switch-no-question/walk.js)
    in its own folder, helpers in
    [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-description-tab-switch-no-question/lib.js):
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-description-tab-switch-no-question/walk.js`,
    with `neighbour` after the script's path for the fix's reach;
    walked on `main` with the fix in and out, and on 3.5.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01); "Static Pages Plugin" and "Custom Block Manager"
  are off in it. The `main` installs serve the older scripts unminified
  (`enable_minified = Off`), so the fix was tried without a rebuild; it
  was not tried on 3.5.
- Branch tips (2026-10-01). `main`: OJS 68615b5a32, OMP 3b0ecf794, OPS
  c8af945bb7; pkp-lib 25562b0e1a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5:
  OJS 3517e640f2, OMP c7b45f88e, OPS 8eaf899468; pkp-lib b1981810da (OJS)
  and 1fb843f491 (OMP, OPS). 3.4: OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b, pkp-lib 32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883,
  OPS c5532e2161, pkp-lib f6ab331645. The issue window and the untouched
  reviewer windows (2026-10-02): `main` OJS b84f8e2e44, pkp-lib
  ddd8ab243a; 3.5 OJS c346ee00a5, pkp-lib 3bb4450bea.
- Code reads, beyond the lines the Cause names. `main`: the templates
  with `rich=true` and their `pkpHandler` (which handler each window
  uses, for Reach); `ReviewerActionFormHandler.js` (`updateTemplate()`
  runs only on the template list's `change`); in ui-library,
  `useReviewerManagerActions.js`, `useParticipantManagerActions.js` and
  `useUserAccessManagerActions.js` (each window opened with
  `openLegacyModal()`) and `AjaxModalWrapper.vue` (its close sends
  `containerClose` to the form). 3.5: `FormHandler.js`. 3.4 and 3.3:
  `FormHandler.js` (the same `tinyMCEInitHandler_()`, blur only),
  `SiteHandler.js` (no change hook on the editor), `TabHandler.js`,
  OJS's `issue.tpl` and `issueForm.tpl`, `package.json` (TinyMCE
  ^5.10.0 and ^4.9.11), and TinyMCE's own source at 5.10.9 and 4.9.11
  (`EventDispatcher.ts`, whose native events include `input`;
  `UndoManager.ts` and `undo/Operations.ts`, which fire `change` only for
  a level added after the first, or on the first typed character); the
  static page form at the plugin commits those branches pin (9568981e8c,
  8c97bd09d4) runs the same handler, and OMP and OPS ship "Custom Block
  Manager" on them, OMP "Static Pages" too.
- Introduced: `git blame` on the hook gives 3f5f8361f0 (the move to
  TinyMCE 4, 2014-12-10), which rewrote 33a7240af0 (2012-09-04, the
  hook's first form: blur, save, validate). Neither reported a change,
  and no commit touching `FormHandler.js` or `SiteHandler.js` ever
  hooked an editor's change.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  TinyMCE with "unsaved", "without saving", `formChange`,
  `tinyMCEInitHandler`, static page content lost, "tab unsaved changes",
  `tabsBeforeActivate`, "data on this form has changed", and an issue
  description lost. `pkp/pkp-lib#13177` (rich text boxes not reset
  between windows), `pkp/pkp-lib#8059` (an error after cancelling the
  question in "Add discussion") and `pkp/pkp-lib#5937` (publishing with
  unsaved Vue publication forms) are other faults.
- Not driven: 3.5 OPS and the custom block window on 3.5; 3.4 and 3.3;
  the other windows in Reach (code only), "Send Reminder" included, since
  no review in the default dataset is overdue; the untouched reviewer
  windows on OMP with the fix in; whether the side panel closes on a
  click outside it or on Escape; Firefox and Safari.
