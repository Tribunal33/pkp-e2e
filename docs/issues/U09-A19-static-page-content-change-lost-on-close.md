# A reviewer's typed review, a profile's signature or bio, or a static page's text is lost without asking on leaving the form

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS in the custom block window and on the Profile page; it has no static pages)
  - 3.5: OJS, OMP, OPS (OPS in the custom block window and on the Profile page; it has no static pages)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [3f5f8361f0](https://github.com/pkp/pkp-lib/commit/3f5f8361f0f23efdc8137696d98fb2fef8e2a92e) (2014-12-10)
- **Upstream** none found (2026-10-12)
- **Tracked in** spec U09 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a19),
  spec U50 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a16),
  spec U28 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a15),
  spec U03 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a19),
  spec U27 [A43](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a43)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-12: two changes. The Steps now take the other ways out of
the custom block window: a press on the page beside it, a reload,
another address and "Edit Profile" at its top each lose a "Content"-only
change without a question (steps 15 to 18; the earlier steps 15 to 42
are now 19 to 46). And the Proposed fix is another one: the earlier fix
asked the question in "Add Reviewer" after an arrow key was pressed in
the message, with nothing typed.

## Summary

A reviewer types a review into "For author and editor" on step 3, then
presses the "2. Guidelines" tab to look something up, or leaves the
page. The step is left at once, with no warning, and back on step 3 the
box holds only what was last saved with "Save for Later": everything
typed since is gone. After a "Recommendation" is chosen on the same
step, the tab first asks "The data on this form has changed. Do you
wish to continue without saving?"; after typing the review alone it
does not.

The Profile page loses "Signature", "Mailing Address" and "Bio
Statement" the same way, when the user presses another tab or reloads.
So do the side windows built on the older form framework (drawn by the
server, not the newer Vue forms), when they are closed or a tab of
theirs is pressed. In every case the question is skipped only when a
text box with formatting buttons is the one thing changed, and one
shared script decides that for all of them. Among the windows:

- a static page's (journals and presses) and a custom block's "Content"
  (two plugins that are off until a manager turns them on);
- an editor's emails to a reviewer: "Thank Reviewer", "Unassign
  Reviewer", "Send Reminder", "Resend Request", "Cancel Reviewer",
  "Reinstate";
- an issue's "Description" on "Issue Data".

A side window is also closed by a click on the page beside it, and by
Escape when the cursor is outside the box, so a stray click or key loses
its text too. The lost text cannot be brought back; the only way round
is to press "Save for Later", "Save" or send before leaving.

## Impact

- **Lost**: the typed text, for good; nobody is told.
- **Who**: a journal's or press's reviewer whose review has no review
  form, so it is typed into the two comment boxes; every user on the
  Profile page; editors writing to a reviewer; managers editing a
  static page, a custom block or an issue. A text-only edit is the
  usual one in all of these.
- **Way round**: saving or sending before leaving; none afterwards.

Medium. The reviewer's case is the one that pulls upward: opening
"2. Guidelines" while writing is an ordinary act, and nothing on the
step says that a tab discards what is typed. Three things the walks
show hold it at medium:

- only text typed since the last "Save for Later" is lost, never saved
  text;
- the loss shows at once: back on step 3, where the review is
  submitted, the box is empty or holds only the saved text;
- the task still gets done: the review can be typed again, and "Save
  for Later" on the same step carries it across the tab press.

It would be high if saved text were lost, or if a review could be
submitted without the reviewer seeing the box. How much reviewers type
straight into the box before a first save is what this report cannot
weigh: a team that knows it to be whole reviews may rate it high. In a
side window the loss is what was typed since the window was opened.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, journal, press or server
  `publicknowledge`. Nothing else: step 2 turns on "Static Pages Plugin"
  and "Custom Block Manager", which are off in the dataset.

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
14. Type "u09rf5 block text" in "Content" only, and press the "Add
    Block" window's own back arrow (top left, "Close"), not the one of
    the "Custom Block Manager" window behind it.
15. Press "Add Block" again, type the same text in "Content" only, and
    press the shaded page to the left of the two windows.

**Expected**: steps 14 and 15 ask the same question, and "Cancel" keeps
the window with the text.

**Observed**: no question at either step. The "Add Block" window closes
at once and the "Custom Block Manager" window behind it stays open. The
window step 15 opens has an empty "Content".

Leaving the page from the custom block window (OJS, OMP, OPS):

16. Press "Add Block" again, type the same text in "Content" only, and
    reload the browser page.
17. Open "Add Block" as in step 13 and type the same text in "Content"
    only. Type another address of the site in the browser's address bar
    (`/index.php/publicknowledge/en/submissions`) and press Enter.
18. Open "Add Block" as in step 13 and type the same text in "Content"
    only. At the window's top right, press the round button with the
    user's initials ("DB"), then "Edit Profile".

**Expected**: each of the three makes the browser ask "Leave site?".

**Observed**: no question. The page reloads at step 16, the new page
opens at step 17 and the Profile page at step 18. Opened again after
each, "Manage Custom Blocks" says "No custom blocks have been created.".

Control: typing "u09rf5 name" in "Block Name" instead makes the press of
step 15 ask "The data on this form has changed. Do you wish to continue
without saving?", and "Cancel" keeps the window with the name. A reload
then makes the browser ask.

Leaving the page from the static page window (OJS, OMP):

19. Open the "Static Pages" tab, press "Add Static Page" and type
    "u09ir9 leaving" in "Content" only.
20. Type another address of the site in the browser's address bar
    (`/index.php/publicknowledge/en/submissions`) and press Enter.

**Expected**: the browser asks "Leave site?". **Observed**: the new page
opens at once.

Writing to a reviewer (OJS submission 7, "Developing efficacy beliefs in
the classroom", Review round 1; on OMP submission 12, "Connecting ICTs
to Development", Internal review round 1):

21. Open the submission's workflow
    (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=7`,
    on OMP `…=12`). Under "Reviewers", on "Aisla McCrae" (Request Sent),
    press "More Actions", then "Unassign Reviewer".
22. In the message, add " u09ir9 extra line" at the end. Change nothing
    else.
23. Close the side panel with its back arrow (top left, "Close").
24. Open "Unassign Reviewer" for "Aisla McCrae" again.
25. On "Paul Hudson" (Review Submitted), press "Read Review", then "Mark
    as Complete", and "Mark as Complete" again in the question "Mark
    this review as complete? …" [3.5: the button reads "Confirm", and no
    question follows it].
26. On "Paul Hudson", press "Thank Reviewer". Add the same line to the
    message, close the panel the same way, and open "Thank Reviewer"
    again.

**Expected**: steps 23 and 26 ask the same question before the panel
closes.

**Observed**: no question; the panel closes at once. At step 24 and on
reopening at step 26 the message is the template's text again, without
the added line.

Control: in "Thank Reviewer", adding the line and also ticking "Do not
send email to Reviewer." makes the back arrow ask the question, and
"Cancel" keeps the panel with the line.

Switching tabs, in an issue's window (OJS; issue 2, "Vol. 2 No. 1
(2015)", which the dataset holds unpublished under "Future Issues"):

27. Open "Issues", tab "Future Issues". On "Vol. 2 No. 1 (2015)", press
    the arrow, then "Edit".
28. In "Issue Management: Vol. 2 No. 1 (2015)", press the "Issue Data"
    tab.
29. Click into "Description" and type "u50a16 An issue about tides.".
    Change nothing else.
30. Press the "Table of Contents" tab.
31. Press "Issue Data" again.
32. Type the same text in "Description" again, and press the window's
    back arrow (top left, "Close").
33. Open "Edit" on "Vol. 2 No. 1 (2015)" again, and press "Issue Data".

**Expected**: steps 30 and 32 ask the same question, and "Cancel" keeps
"Issue Data" with the text.

**Observed**: no question. At step 30 "Table of Contents" opens at once,
and at step 32 the window closes. At steps 31 and 33 "Description" is
empty.

Control: typing "u50a16" in "URL Path" instead of step 29 makes step 30
ask the question, and "Cancel" keeps "Issue Data" with "u50a16".

A reviewer's free-form review (OJS submission 12, "Sodium butyrate
improves growth performance of weaned piglets during the first period
after weaning"; on OMP submission 17, "Open Development: Networked
Innovations in International Development"; `jjanssen` has an unanswered
request on each, and neither review uses a review form):

34. Sign in as `jjanssen` and open the review
    (`/index.php/publicknowledge/en/reviewer/submission/12`, on OMP
    `…/17`).
35. On "1. Request", tick the privacy statement box and press "Accept
    Review, Continue to Step #2"; on "2. Guidelines", press "Continue to
    Step #3".
36. Click into "For author and editor" and type "u28j a review typed and
    not saved". Change nothing else.
37. Press the "2. Guidelines" tab.
38. Press "3. Download & Review".
39. Type the same text again. Type another address of the site in the
    browser's address bar
    (`/index.php/publicknowledge/en/dashboard/reviewAssignments`) and
    press Enter.
40. Open the review again by step 34's address; it opens on step 3.

**Expected**: step 37 asks the same question, and "Cancel" keeps step 3
with the text; step 39 makes the browser ask "Leave site?".

**Observed**: no question. At step 37 "2. Guidelines" opens at once, and
at step 39 the new page. At steps 38 and 40 "For author and editor" is
empty.

Control (OJS): choosing "Accept Submission" under "Recommendation"
instead of step 36 makes step 37 ask the question, and "Cancel" keeps
step 3 with the choice.

The Profile page (OJS, OMP, OPS):

41. Sign in as `dbarnes` and open the Profile page
    (`/index.php/publicknowledge/en/user/profile`). Press the "Contact"
    tab.
42. Click into "Signature" and type "u28j signature typed and not
    saved". Change nothing else.
43. Press the "Identity" tab, then "Contact" again.
44. Click into "Mailing Address" and type "u28j address typed and not
    saved". Press "Identity", then "Contact" again.
45. Press the "Public" tab. Click into "Bio Statement" and type "u28j
    bio typed and not saved". Press "Identity", then "Public" again.
46. Press "Contact", type the signature of step 42 again and reload the
    browser page. Press "Contact".

**Expected**: each press of "Identity" in steps 43 to 45 asks the same
question, and "Cancel" keeps the tab with the text; the reload in step
46 makes the browser ask "Leave site?".

**Observed**: no question at any step; "Identity" opens at once and the
page reloads at once. "Signature", "Mailing Address" and "Bio Statement"
are empty when their tab opens again, in steps 43 to 46.

Control: typing "555" in "Phone" on "Contact" and pressing "Identity"
asks the question, and "Cancel" keeps "Contact" with "555".

## Cause

The windows built on the older form framework are jQuery handlers over
server-rendered forms: the static page window through the plugin's
`StaticPageFormHandler`; the custom block window, "Thank Reviewer",
"Resend Request" and the user email window through `AjaxFormHandler`;
"Unassign Reviewer", "Cancel Reviewer", "Reinstate" and "Send Reminder"
through its subclass `ReviewerActionFormHandler`, and an issue's "Issue
Data" through its subclass `FileUploadFormHandler`. The full pages use
the same handlers: a review's step 3 runs `ReviewerReviewStep3FormHandler` (an
`AjaxFormHandler`), the Profile page's "Contact" `AjaxFormHandler` and
its "Public" `FileUploadFormHandler`. All inherit change tracking from pkp-lib's
`$.pkp.controllers.form.FormHandler` (`js/controllers/form/FormHandler.js`)
and override none of it.

`FormHandler` learns that the form changed only from a DOM `change`
event on an `:input` of the form
(`$(':input', $form).change(this.callbackWrapper(this.formChange))`) or
from a `formChange` event that a control sends itself, as
`ListbuilderHandler` does. `formChange()` then sets `formChangesTracked`
and sends `formChanged`, on which
`SiteHandler.registerUnsavedFormElement_()` puts the form on the page's
list of unsaved forms. Four places read the flag or the list before
letting the text go:

- `containerCloseHandler()` reads the flag when the window is closed.
  On `main` and 3.5 every one of these windows is a Vue side panel
  around `AjaxModalWrapper.vue`, whether a legacy link opens it
  (`AjaxModalHandler.modalOpen()` emits `open-modal-vue` with component
  `LegacyAjax`) or a Vue screen does (`openLegacyModal()`, the reviewer
  windows). The panel's one close control (the back arrow, labelled
  "Close"), Escape and a click beside the panel all end in
  `SideModal.vue`'s `handleClose()`, which runs the wrapper's close
  callback; that sends `containerClose` to the first form in the panel
  only;
- `SiteHandler.pageUnloadHandler_()` reads the list, for the browser's
  "Leave site?" on a reload, another address or a link that leaves the
  page. On `main` and 3.5 every side panel has such links at its top:
  `SideModalBody.vue` draws `TopNavActions` there, the initials menu
  with "Edit Profile";
- `TabHandler.tabsBeforeActivate()` and its tab close control
  (`TabHandler.js`, lines 135 and 309) read the flag when a tab is
  switched or closed; a review's steps (`ReviewerTabHandler`, a
  `TabHandler`) and the Profile page's tabs go through it too;
- `WizardHandler.checkForm_()` (`WizardHandler.js`, line 541) reads it
  when a wizard step is left.

A text box with formatting buttons is a TinyMCE editor in an iframe over
a hidden textarea. Typing there fires no `change` on the textarea. The
form handler's only hook on the editor,
`FormHandler.tinyMCEInitHandler_()`, binds `blur` to copy the text into
the textarea (`tinyMCEObject.save()`) and validate it, and never reports
a change; setting a textarea's value from script fires no `change`
either. (`MultilingualInputHandler.js` has a method of the same name; it
only shows and hides the other languages' popover.) So a change made
only in such a box never sets the flag or reaches the list, and none of
the four places asks.

Reach, beyond what the Steps show:

- Ways out of a side panel. Every panel closes through the same
  `handleClose()` and has the same top bar, so each window named here
  can lose its text by a click beside it, by Escape and by the top
  bar's links (checked in the code). On screen: the click beside, on
  the static page window (OJS `main`) and the custom block window;
  Escape, on the static page window and "Unassign Reviewer" (OJS
  `main`), where it closes the panel without a question once the caret
  is out of the box and does nothing with the caret in it; "Edit
  Profile", on the custom block window.
- The issue window's tabs are a `TabHandler` (`editIssueTabs` in
  `issue.tpl`) on 3.4 and 3.3 too, with the same `tabsBeforeActivate()`
  (checked in the code).
- The other email windows an editor meets in the workflow (checked in
  the code): "Send Reminder" (offered once a request or review is
  overdue), "Resend Request", "Cancel Reviewer", "Reinstate" and a
  participant's "Notify" (`StageParticipantNotifyHandler`). Picking
  another template or ticking "Do not send email to Reviewer." counts
  as a change. "Email Reviewer" opens with an empty "Subject", a plain
  box: once that is typed in, the window asks.
- A review's other boxes (checked in the code): "For editor" ("For
  editor only" on a press) is drawn by the same template line
  (`reviewer/review/step3.tpl`, `rich=true`), and the "Decline Review
  Request" message (`regretMessage.tpl`) is an `AjaxFormHandler` form
  with a rich box. A change to a review form's own question does raise
  the question: those are plain inputs.
- The Profile page and step 3 on 3.4 and 3.3: `contactForm.tpl`,
  `publicProfileForm.tpl` and `step3.tpl` hold the same `rich=true`
  boxes under the same handlers (checked in the code).
- Other windows built the same way (checked in the code): "Email" on a
  user in Users & Roles, review forms and their items, OJS's section
  "Policy" and the subscription windows.
- Not affected: the Vue forms (`FieldRichTextarea`), which include the
  discussions, the editorial decisions and their emails, and the
  publication's own fields.

## Proposed fix

Two changes in pkp-lib, proposed together. In
`FormHandler.tinyMCEInitHandler_()`, which already hooks each editor of
the form, report the editor's changes as a form change, the way
listbuilders report theirs:

```diff
 			validator.element(formElement);
 		}));
+
+		// A rich text box is not an ':input' that fires 'change', so report
+		// its edits as a form change, as listbuilders do. TinyMCE fires
+		// 'input' on each keystroke and 'change' when its content differs
+		// from the last undo level. A script that puts text into an editor
+		// after it has loaded resets the undo levels (undoManager.reset()),
+		// so that its text is the starting point and not an edit.
+		tinyMCEObject.on('input change', this.callbackWrapper(function() {
+			this.getHtmlElement().trigger('formChange');
+		}));
 	};
```

And in `AdvancedReviewerSearchHandler.handleReviewerAssign_()`, which
puts the request's template into the "Add Reviewer" message when a
reviewer is picked, make that text the editor's starting point:

```diff
 		editor.setContent(templateContent);
+		// The template's text is the message's starting point, not an edit
+		// (FormHandler reports the editor's 'change' as a form change).
+		editor.undoManager.reset();
 		$templateInput.val(templateKey);

 		editor.on('activate', function () {
 			if (!editor.getContent().length) {
 				editor.setContent(templateContent);
+				editor.undoManager.reset();
 			}
 		});
```

The diff against the app root is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/fix.diff).
The first change sits in the shared handler that owns change tracking,
so all four places in the Cause see the change.

The second is needed because of how TinyMCE reports a change. It fires
`input` on each keystroke, and `change` whenever its undo manager takes
a level that differs from the last one (`tinymce.js`,
`addUndoLevel()`). It takes one after toolbar formatting, a paste or an
inserted tag, and also on blur, on `save()` and on the release of an
arrow key, Home, End, Page Up or Down, Insert or any key with Ctrl held
(`registerEvents()`). So text a script puts into an editor after it has
loaded, with `setContent()`, reads as a change at the next of these,
with nothing typed. `undoManager.reset()` clears the levels and takes
one of the current content, which fires no `change`.

Five `setContent()` calls in four scripts do that. The two in
`handleReviewerAssign_()` are the only ones that run before the user
has changed a plain field. The other three are the `updateTemplate()`
methods of `AddReviewerFormHandler`, `ReviewerActionFormHandler` and
`StageParticipantNotifyHandler`: each runs when the user picks from the
template list, and that list's own `change` already marks the form
changed, with or without the fix. They are left as they are.

The fix was tried on `main` in all three apps:

- Every window and page in the Steps asks at the step that closed or
  left it, and "Cancel" keeps the text. So do Escape and a click beside
  the static page window (OJS).
- Nothing typed, nothing asked: a static page's "Add" and "Edit" (a
  saved page's filled "Content" included), an issue's "Issue Data", a
  review's step 3 and the Profile page's "Contact" and "Public", each
  with its box empty or holding saved text; an untouched "Add Block"
  left by its back arrow, a click beside it, a reload and "Edit
  Profile"; a saved block's "Edit" with "Content" clicked into and out
  of, or with arrow keys pressed in it; "Unassign Reviewer" and "Thank
  Reviewer" with their template text (OJS); a participant's "Notify"
  untouched (OJS).
- "Add Reviewer" after a reviewer is picked asks nothing, whether the
  message is left alone, clicked into and out of, or has arrow keys
  pressed in it; with text typed into the message it asks (OJS).
- "Notify" with a predefined message chosen asks, as it does without
  the fix (OJS).
- After "Save" or "Save for Later" the form is left without a question
  and the text is stored.

**Alternatives**

- Tell the editor's changes apart in the handler alone, by the event
  that caused each. The fix filed here on 2026-10-02 did so: it ignored
  a `change` whose `originalEvent` was a blur or a save. A level taken
  on a key's release carries no `originalEvent`, so with that fix "Add
  Reviewer" asked after a reviewer was picked and an arrow key pressed
  in the message (walked on OJS `main`). A list of causes in the
  handler would have to follow TinyMCE's own.
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
  which is the behaviour their other fields already have. A plugin's
  script that fills an editor after it has loaded would need the same
  `reset()`, or its window asks once the editor is clicked into and
  left.
- Backport (read in the code, tried only on `main`).
  `tinyMCEInitHandler_()` is the same on 3.5, 3.4 and 3.3, and all
  three TinyMCE versions (7 on 3.5, 5 on 3.4, 4 on 3.3) pass the
  iframe's `input` to the editor and fire `change` the same way. 3.5
  has the same two calls in `handleReviewerAssign_()`; 3.4's
  `AdvancedReviewerSearchHandler.js` has them written differently
  (lines 62 and 67). 3.3 has no such call, and its
  TinyMCE 4 has no `undoManager.reset()` (`clear()` then `add()` does
  the same); its other `setContent()` callers were not traced. Stable
  installs serve the built `pkp.min.js`, so a backport rebuilds it.
- Test: in pkp-lib's Cypress tests the Profile page needs no plugin
  and no side panel: "Signature" typed on "Contact", then the
  "Identity" tab, must ask. Here, an e2e check that a "Content"-only
  change in the static page window, then the back arrow, asks.

Small: a few lines in two scripts of one repo, and a test.

## Evidence

- The kept scripts. Each runs from a pkp-e2e checkout, on an install
  freshly loaded from the default dataset, as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js <app|all> <script> [mode]`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix is applied
  with
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-content-change-lost-on-close/fix.diff ojs omp ops`.
  A mode named `neighbour` holds the script's checks that untouched and
  saved forms ask nothing.
  - Steps 1–12: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/walk.js); the helpers of this folder are
    in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/lib.js).
  - Steps 13–18 and their control: [block.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/block.js), with a
    `neighbour` mode.
  - Steps 19–20, with the untouched and saved static page windows:
    [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/neighbour.js) (OJS, OMP).
  - Steps 21–26: [review.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/review.js) (OJS, OMP); its `escape`
    mode is Escape on "Unassign Reviewer" (OJS). The untouched reviewer
    windows: [untouched.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/untouched.js) (OJS).
  - Steps 27–33: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-description-tab-switch-no-question/walk.js) in its own folder, with a
    `neighbour` mode (OJS).
  - Steps 34–46: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/walk.js) in its own folder, with a
    `neighbour` mode; the review on OJS and OMP, the Profile page on
    all three apps.
  - "Add Reviewer" and "Notify", and Escape and a click beside the
    static page window: [reach.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/reach.js) (OJS); its part `a3`
    is the arrow keys in the "Add Reviewer" message.
- How the scripts differ from a person. They press each panel's
  "Close" by its name, which is the back arrow. Before a step leaves
  the page (16 to 18, 20, 39, 46) they first press elsewhere in the
  window, so the focus leaves the box as it does on the way to the
  address bar, and they load the address or reload themselves. Step 21
  opens the workflow by the address the step gives.
- What was walked, all on 2026-10-12. Every script of the Steps on
  `main` and on 3.5. On `main` with the fix in: every script above and
  every `neighbour` mode. With the fix out: `block.js neighbour`
  (three apps), and on OJS `reach.js a3` and `review.js escape`. With
  the fix filed on 2026-10-02 in: `reach.js a3` on OJS, which asked.
  The other `neighbour` modes, `untouched.js` and the rest of
  `reach.js` were walked with the fix out on 2026-10-02.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  fac2371 (2026-10-11); "Static Pages Plugin" and "Custom Block Manager"
  are off in it, and neither plugin has a settings file that turns it
  on for a new journal. The `main` installs serve the older scripts
  unminified (`enable_minified = Off`), so the fix was tried without a
  rebuild.
- Branch tips (2026-10-12). `main`: OJS d0b69b108d (pkp-lib
  1ec9023e8a), OMP eb4c30aa3c and OPS 8d04ca333c (pkp-lib 58c7f454ff),
  ui-library 38814ea159. 3.5: OJS c90dfdb577 (pkp-lib f4f8fcdbc0), OMP
  486cbf9eb0 and OPS 399c4ebca3 (pkp-lib 8094f06bf5), ui-library
  2576e00afd. 3.4: OJS daf0ca971d, OMP 0aec65441f, OPS acd8ae704b,
  pkp-lib 55c8e406b3. 3.3: OJS d7d9dd14ec, OMP 8e72fc8836, OPS
  c5532e2161, pkp-lib 5e84acd11b. At these 3.4 and 3.3 tips
  `FormHandler.js` and the `setContent()` callers were read; the other
  files there were read on 2026-10-01 and 2026-10-02.
- Code reads, beyond the lines the Cause names. `main`: the templates
  with `rich=true` and their `pkpHandler` (which handler each window
  uses, for Reach), the custom block form's `editCustomBlockForm.tpl`
  among them (`AjaxFormHandler`, plugin commit 1f8d452d8c; the same
  on 3.5 at 87092d8a46); the `setContent()` callers the Proposed fix
  names (the only ones under `js/` of pkp-lib and the three apps,
  minified bundles apart) and what calls them; TinyMCE 7.9.3's
  `tinymce.js` (`addUndoLevel()`: `change` only for a level after the
  first; `registerEvents()`: the level on a key's release is taken
  without an event; the undo manager's `reset()`: `clear()`, then
  `add()`); in ui-library, `useReviewerManagerActions.js`,
  `useParticipantManagerActions.js` and
  `useUserAccessManagerActions.js` (each window opened with
  `openLegacyModal()`) and `SideModal.vue` (a press on the shade,
  `DialogOverlay`, Escape and the close control end in `handleClose()`,
  which asks the registered close callbacks). 3.5: `FormHandler.js`
  (the same hook), `SiteHandler.js`, `AjaxModalWrapper.vue`,
  `SideModal.vue`, `SideModalBody.vue` and
  `AdvancedReviewerSearchHandler.js` (the same as `main` in what the
  Cause and the fix rest on). 3.4 and 3.3:
  `FormHandler.js` (the same `tinyMCEInitHandler_()`, blur only),
  `reviewer/review/step3.tpl`, `reviewStepHeader.tpl`,
  `user/contactForm.tpl`, `publicProfileForm.tpl` and `profile.tpl`
  (the same boxes, form handlers and tab handlers as `main`, where
  `ReviewerReviewStep3FormHandler.js` and `ReviewerTabHandler.js` were
  read for an override of change tracking: none),
  `SiteHandler.js` (no change hook on the editor), `TabHandler.js`,
  OJS's `issue.tpl` and `issueForm.tpl`, `package.json` (TinyMCE
  ^5.10.0 and ^4.9.11), and TinyMCE 5.10.9 and 4.9.11 (the native
  events they pass on include `input`; `change` fires only for a level
  added after the first; 4.9.11's undo manager has `clear()` and no
  `reset()`); the static page form at the plugin commits those
  branches pin (9568981e8c, 8c97bd09d4) runs the same handler, and OMP
  and OPS ship "Custom Block Manager" on them, OMP "Static Pages" too.
  3.4's ui-library has no `SideModal.vue` or `SideModalBody.vue`, so
  the links at a panel's top are a `main` and 3.5 path.
- Introduced: `git blame` on the hook gives 3f5f8361f0 (the move to
  TinyMCE 4, 2014-12-10), which rewrote 33a7240af0 (2012-09-04, the
  hook's first version: blur, save, validate). Neither reported a change,
  and no commit touching `FormHandler.js` or `SiteHandler.js` ever
  hooked an editor's change.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/ui-library and
  pkp/customBlockManager searched, on 2026-10-02 and again on
  2026-10-12, by the symptom's words (TinyMCE or a rich text box with
  "unsaved", "without saving", "data on this form has changed", a
  custom block's or static page's content lost, leaving or reloading
  the page) and by `formChange`, `tinyMCEInitHandler` and
  `tabsBeforeActivate`. `pkp/pkp-lib#13177` (rich text boxes not reset
  between windows), `pkp/pkp-lib#8059` (an error after cancelling the
  question in "Add discussion"), `pkp/pkp-lib#5937` (publishing with
  unsaved Vue publication forms) and `pkp/ui-library#853` (when a table
  reloads after a side window closes) are other matters.
- Not driven: the review's control (a "Recommendation" chosen) on 3.5;
  a review's "For editor" box and the "Decline Review Request" message;
  3.4 and 3.3; the other windows in Reach (code only), "Send Reminder"
  included, since no review in the default dataset is overdue; the
  untouched reviewer windows, "Add Reviewer" and "Notify" on OMP with
  the fix in; Escape, a click beside the panel and the top bar's links
  on the windows the first Reach bullet does not name; a saved block's
  "Edit" with "Content" changed, on the ways out of steps 15 to 18;
  "Logout" in the initials menu; a Ctrl-key, Home, End or Page Up or
  Down in the "Add Reviewer" message (the arrow keys stand for them);
  the browser's own address bar and reload key with the caret still in
  the box, which a script cannot press; Firefox and Safari.
