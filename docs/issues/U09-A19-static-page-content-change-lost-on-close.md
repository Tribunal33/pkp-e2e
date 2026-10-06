# A reviewer's typed review, a profile's signature or bio, or a static page's text is lost without asking on leaving the form

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS in the custom block window and on the Profile page)
  - 3.5: OJS, OMP, OPS (OPS on the Profile page; its custom block window read in the code)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [3f5f8361f0](https://github.com/pkp/pkp-lib/commit/3f5f8361f0f23efdc8137696d98fb2fef8e2a92e) (2014-12-10)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U09 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a19),
  spec U50 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a16),
  spec U28 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a15),
  spec U03 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a19),
  spec U27 [A43](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a43)
- **Checked** 2026-10-01 and 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A reviewer types a review into "For author and editor" on step 3, then
presses the "2. Guidelines" tab to look something up, or leaves the
page. The step is left at once and everything typed since the last
"Save for Later" is gone, without a word. After a "Recommendation" is
chosen on the same step, the tab first asks "The data on this form has
changed. Do you wish to continue without saving?"; after typing the
review alone it does not.

The Profile page loses "Signature", "Mailing Address" and "Bio
Statement" the same way, when the user presses another tab or reloads.
So do the side windows built on the older form framework (drawn by the
server, not the newer Vue forms), when they are closed or a tab of
theirs is pressed. In every case the question is skipped only when a
text box with formatting buttons is the one thing changed. The windows
met most often:

- a static page's and a custom block's "Content" (two plugins the
  default dataset leaves off);
- an editor's emails to a reviewer: "Thank Reviewer", "Unassign
  Reviewer", "Send Reminder", "Resend Request", "Cancel Reviewer",
  "Reinstate";
- an issue's "Description" on "Issue Data".

A side window is also closed by a click on the page beside it, so a
stray click loses its text too. The lost text cannot be brought back;
the only way round is to press "Save for Later", "Save" or send before
leaving.

## Impact

- **Lost**: the typed text, for good; nobody is told.
- **Who**: a journal's or press's reviewer whose review has no review
  form, so it is typed into the two comment boxes; every user on the
  Profile page; editors writing to a reviewer; managers editing a
  static page, a custom block or an issue. A text-only edit is the
  usual one in all of these.
- **Way round**: saving or sending before leaving; none afterwards.

Medium: a reviewer loses a typed review without a word, in a core task,
but only by pressing another tab or leaving the page unsaved, the
review can be typed again, and "Save for Later" is on the step. A side
window does close on a stray click beside it or on Escape (checked on
the static page window), so text there can be lost by accident; what
is at stake there is a message or a page's text typed in one sitting.
It would be high if the review itself could be lost without the
reviewer leaving the step.

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
14. Type "u09ir9 block text" in "Content" only, and press the "Add
    Block" window's own "Close" (not the "Manage Custom Blocks" window's
    behind it).

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

A reviewer's free-form review (OJS submission 12, "Sodium butyrate
improves growth performance of weaned piglets during the first period
after weaning"; on OMP submission 17, "Open Development: Networked
Innovations in International Development"; `jjanssen` has an unanswered
request on each, and neither review uses a review form):

30. Sign in as `jjanssen` and open the review
    (`/index.php/publicknowledge/en/reviewer/submission/12`, on OMP
    `…/17`).
31. On "1. Request", tick the privacy statement box and press "Accept
    Review, Continue to Step #2"; on "2. Guidelines", press "Continue to
    Step #3".
32. Click into "For author and editor" and type "u28j a review typed and
    not saved". Change nothing else.
33. Press the "2. Guidelines" tab.
34. Press "3. Download & Review".
35. Type the same text again. Type another address of the site in the
    browser's address bar
    (`/index.php/publicknowledge/en/dashboard/reviewAssignments`) and
    press Enter.
36. Open the review again by step 30's address; it opens on step 3.

**Expected**: step 33 asks the same question, and "Cancel" keeps step 3
with the text; step 35 makes the browser ask "Leave site?".

**Observed**: no question. At step 33 "2. Guidelines" opens at once, and
at step 35 the new page. At steps 34 and 36 "For author and editor" is
empty.

Control (OJS): choosing "Accept Submission" under "Recommendation"
instead of step 32 makes step 33 ask the question, and "Cancel" keeps
step 3 with the choice.

The Profile page (OJS, OMP, OPS):

37. Sign in as `dbarnes` and open the Profile page
    (`/index.php/publicknowledge/en/user/profile`). Press the "Contact"
    tab.
38. Click into "Signature" and type "u28j signature typed and not
    saved". Change nothing else.
39. Press the "Identity" tab, then "Contact" again.
40. Click into "Mailing Address" and type "u28j address typed and not
    saved". Press "Identity", then "Contact" again.
41. Press the "Public" tab. Click into "Bio Statement" and type "u28j
    bio typed and not saved". Press "Identity", then "Public" again.
42. Press "Contact", type the signature of step 38 again and reload the
    browser page. Press "Contact".

**Expected**: each press of "Identity" in steps 39 to 41 asks the same
question, and "Cancel" keeps the tab with the text; the reload in step
42 makes the browser ask "Leave site?".

**Observed**: no question at any step; "Identity" opens at once and the
page reloads at once. "Signature", "Mailing Address" and "Bio Statement"
are empty when their tab opens again, in steps 39 to 42.

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
and sends `formChanged`. Four places read that state before letting the
text go:

- `containerCloseHandler()`, when the window is closed. On `main` every
  one of these windows is drawn in a Vue side panel
  (`AjaxModalHandler.modalOpen()` emits `open-modal-vue` with component
  `LegacyAjax`, which ui-library mounts as `AjaxModalWrapper.vue`). The
  back arrow, the panel's "Close", Escape and a click beside the panel
  are one path, through the wrapper's close callback, which sends
  `containerClose` to the first form in the panel only;
- `SiteHandler.pageUnloadHandler_()`, through `formChanged`, for the
  browser's "Leave site?";
- `TabHandler.tabsBeforeActivate()` and its tab close control
  (`TabHandler.js`, lines 135 and 309), when switching or closing a tab;
  a review's steps (`ReviewerTabHandler`, a `TabHandler`) and the
  Profile page's tabs go through it too;
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

- A click on the page beside the panel, and Escape once the caret is
  out of the box, close the static page window without a question after
  a "Content"-only change (checked on screen, OJS `main`); Escape with
  the caret in the box does nothing.
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
- A reviewer's review, step 3: text typed only in "For author and
  editor" is gone after the "2. Guidelines" tab or after leaving the
  page, with no question (checked on screen, OJS and OMP, `main` and
  3.5). "For editor" ("For editor only" on a press) is drawn by the
  same template line (`reviewer/review/step3.tpl`, `rich=true`), and
  the "Decline Review Request" message (`regretMessage.tpl`) is an
  `AjaxFormHandler` form with a rich box (both checked in the code). A
  change to a review form's own question does raise the question: those
  are plain inputs.
- The Profile page: "Signature" and "Mailing Address" on "Contact" and
  "Bio Statement" on "Public", on pressing another tab; "Signature" on
  a reload (checked on screen, three apps, `main` and 3.5).
  `contactForm.tpl`, `publicProfileForm.tpl` and `step3.tpl` hold the
  same `rich=true` boxes under the same handlers on 3.4 and 3.3
  (checked in the code).
- Other windows built the same way (checked in the code): "Email" on a
  user in Users & Roles, review forms and their items, OJS's section
  "Policy" and the subscription windows.
- Not affected: the Vue forms (`FieldRichTextarea`), which include the
  discussions, the editorial decisions and their emails, and the
  publication's own fields.

## Proposed fix

In `FormHandler.tinyMCEInitHandler_()`, which already hooks each editor
of the form, report the user's edits as a form change, the way
listbuilders do:

```diff
 			validator.element(formElement);
 		}));
+
+		// A rich text box is not an ':input' that fires 'change', so report
+		// its edits as a form change, as listbuilders do. TinyMCE also fires
+		// 'change' when it takes an undo snapshot on blur or on save(), which
+		// follows a script's setContent() (a template's text) with nothing
+		// typed: those are not edits.
+		tinyMCEObject.on('input change', this.callbackWrapper(
+				function(tinyMCEObject, event) {
+					var origin = event && event.originalEvent ?
+							String(event.originalEvent.type).toLowerCase() : '';
+					if (origin === 'blur' || origin === 'savecontent') {
+						return;
+					}
+					this.getHtmlElement().trigger('formChange');
+				}));
 	};
```

The diff against the app root is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-on-close/fix.diff).
The fix sits in the shared handler that owns change tracking, so all
four places in the Cause see the change.

TinyMCE fires `input` on each keystroke, and `change` whenever its undo
manager adds a level whose content differs from the last one: after
toolbar formatting, a paste, an inserted tag, undo and redo, and also
on `blur` and on `SaveContent` (`tinymce.js`, `registerEvents()`;
`FormHandler`'s own blur hook calls `save()`). The `change` event
carries the event that caused the level as `originalEvent`.

The filter on `blur` and `savecontent` is needed because four scripts
put a template's text into an editor after it has loaded, with
`setContent()`: `AdvancedReviewerSearchHandler.handleReviewerAssign_()`
(when a reviewer is picked in "Add Reviewer"), and the `updateTemplate()`
of `AddReviewerFormHandler`, `ReviewerActionFormHandler` and
`StageParticipantNotifyHandler`. The next blur then fires `change` with
nothing typed. A first version of this fix without the filter made "Add
Reviewer" ask the question after a reviewer was picked and the message
was only clicked into and out of (walked on OJS `main`). The three
`updateTemplate()` callers run after the user picks a template, and the
template list's own `change` already marks the form changed, with or
without the fix.

The fix as it stands was tried on `main` in all three apps:

- Every window and page in the Steps asks at the step that closed or
  left it, and "Cancel" keeps the text. So do Escape and a click beside
  the static page window.
- Nothing typed, nothing asked: a static page's "Add" and "Edit" (a
  saved page's filled "Content" included), "Add Block", an issue's
  "Issue Data", a review's step 3 and the Profile page's "Contact" and
  "Public", each with its box empty or holding saved text; "Unassign
  Reviewer" and "Thank Reviewer" with their template text (OJS); "Add
  Reviewer" after a reviewer is picked, with the message clicked into
  and out of or not (OJS); a participant's "Notify" untouched (OJS).
- "Add Reviewer" with text typed into the message asks (OJS).
- "Notify" with a predefined message chosen asks, as it does without
  the fix (OJS).
- After "Save" or "Save for Later" the form is left without a question
  and the text is stored.

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
- Backport: `tinyMCEInitHandler_()` is the same on 3.5, 3.4 and 3.3,
  a line or two away. Stable installs serve the built `pkp.min.js`, so
  a backport rebuilds it. It was tried only on `main` (TinyMCE 7, which
  3.5 ships too). 3.4 ships TinyMCE 5 and 3.3 TinyMCE 4; both pass the
  iframe's `input` event to the editor. Unverified there: that their
  `change` carries `originalEvent` as 7's does, which the filter needs.
- Test: an e2e check that a "Content"-only change, then the back arrow,
  asks the question.

Small: one handler in one shared file, following the listbuilder
pattern.

## Evidence

- The kept scripts, run from a pkp-e2e checkout on an install freshly
  loaded from the default dataset with `PKP_E2E_LINE=stable-3_5_0`
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
  - Steps 30–42:
    [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/walk.js)
    in its own folder, helpers in
    [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/lib.js):
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/walk.js`,
    with `neighbour` after the script's path for the fix's reach
    (untouched and saved forms); walked on `main` with the fix in and
    out, and on 3.5, the review on OJS and OMP and the Profile page on
    all three apps. Before steps 35 and 42 leave the page, the script
    clicks the page's heading, so the focus leaves the box as it does
    when a person goes to the address bar.
  - The fix's reach on "Add Reviewer" and "Notify", and Escape and a
    click beside the static page window:
    [reach.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/reach.js),
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/reach.js`;
    walked on OJS `main` with the fix out, with its first version in
    and with the fix as it stands in. Every other script above was
    walked again on `main` with the fix as it stands.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01); "Static Pages Plugin" and "Custom Block Manager"
  are off in it. The `main` installs serve the older scripts unminified
  (`enable_minified = Off`), so the fix was tried without a rebuild.
- Branch tips (2026-10-01). `main`: OJS 68615b5a32, OMP 3b0ecf794, OPS
  c8af945bb7; pkp-lib 25562b0e1a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5:
  OJS 3517e640f2, OMP c7b45f88e, OPS 8eaf899468; pkp-lib b1981810da (OJS)
  and 1fb843f491 (OMP, OPS). 3.4: OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b, pkp-lib 32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883,
  OPS c5532e2161, pkp-lib f6ab331645. The issue window and the untouched
  reviewer windows (2026-10-02): `main` OJS b84f8e2e44, pkp-lib
  ddd8ab243a; 3.5 OJS c346ee00a5, pkp-lib 3bb4450bea. The review and
  the Profile page (2026-10-02, pkp/datasets e8dafbc): `main` OJS
  b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794c and OPS c8af945bb7
  (pkp-lib 3dc90c81a6); 3.5 OJS 091fb65453, OMP 9c5e24246c, OPS
  38b61882d3, pkp-lib cf3f984335; read on 3.4 and 3.3 at pkp-lib
  6f96165c90 and 4156e50233.
- Code reads, beyond the lines the Cause names. `main`: the templates
  with `rich=true` and their `pkpHandler` (which handler each window
  uses, for Reach); the four `setContent()` callers the Proposed fix names
  (the only ones under `js/` of pkp-lib and the three apps, minified
  bundles apart) and what calls them; TinyMCE 7.9.3's `tinymce.js`
  (`registerEvents()` and `addUndoLevel()`: `change` on a new level,
  `originalEvent` in its arguments); in ui-library,
  `useReviewerManagerActions.js`, `useParticipantManagerActions.js` and
  `useUserAccessManagerActions.js` (each window opened with
  `openLegacyModal()`) and `AjaxModalWrapper.vue` (its close sends
  `containerClose` to the panel's first form). 3.5: `FormHandler.js`. 3.4 and 3.3:
  `FormHandler.js` (the same `tinyMCEInitHandler_()`, blur only),
  `reviewer/review/step3.tpl`, `reviewStepHeader.tpl`,
  `user/contactForm.tpl`, `publicProfileForm.tpl` and `profile.tpl`
  (the same boxes, form handlers and tab handlers as `main`, where
  `ReviewerReviewStep3FormHandler.js` and `ReviewerTabHandler.js` were
  read for an override of change tracking: none),
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
  hook's first version: blur, save, validate). Neither reported a change,
  and no commit touching `FormHandler.js` or `SiteHandler.js` ever
  hooked an editor's change.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  TinyMCE with "unsaved", "without saving", `formChange`,
  `tinyMCEInitHandler`, static page content lost, "tab unsaved changes",
  `tabsBeforeActivate`, "data on this form has changed", an issue
  description lost, and a reviewer's review or a profile's signature or
  biography lost unsaved. `pkp/pkp-lib#13177` (rich text boxes not reset
  between windows), `pkp/pkp-lib#8059` (an error after cancelling the
  question in "Add discussion") and `pkp/pkp-lib#5937` (publishing with
  unsaved Vue publication forms) are other faults.
- Not driven: 3.5 OPS outside the Profile page, the custom block
  window on 3.5, and the "Recommendation" control after step 36 on
  3.5; a review's "For editor" box and the "Decline Review
  Request" message; 3.4 and 3.3;
  the other windows in Reach (code only), "Send Reminder" included, since
  no review in the default dataset is overdue; the untouched reviewer
  windows, "Add Reviewer" and "Notify" on OMP with the fix in; Escape and
  a click beside the panel on windows other than the static page's;
  Firefox and Safari.
