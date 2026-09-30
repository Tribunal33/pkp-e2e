# Text typed only into a rich-text box is lost unasked: static pages, profile, reviews

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS: the profile)
  - 3.5: OJS, OMP, OPS (OPS: the profile)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [ea8d4cda2f](https://github.com/pkp/pkp-lib/commit/ea8d4cda2f959149b9f5471f858f4defef931355) (2012-07-24)
- **Upstream** none found (2026-09-30)
- **Tracked in** U09 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a19), U03 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a19), U28 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a15)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

When the only change on a form is text typed into a rich-text box, the
form does not count itself as changed. So the question "The data on this
form has changed. Do you wish to continue without saving?", which a
change to any plain box gets, never comes, and the typed text is lost:

- The static page window asks the question when it is closed after a
  change to "Path" or "Title". A manager who has changed only "Content"
  and presses the back arrow gets no question: the window closes and the
  text is gone.
- On the Profile page, text typed into "Signature" on Contact, or into
  "Bio Statement" on Public, is lost when another tab is pressed: the
  tab opens at once, and back on the first tab the typed text is gone.
- A reviewer who types into "For author and editor" on step 3 and then
  presses another step's tab is asked nothing, and back on step 3 the
  text is gone, while a changed review-form answer gets the question.

Leaving the page loses the text the same way: a reload, or a link to
another page, goes ahead with no question, where a changed plain box
raises the browser's own "Leave site?" question.

All three share one cause: the legacy rich-text box never tells its
form that it changed. One small change in the shared form code fixes all
of them. The free-form review is the default review: a new journal or
press has no review forms, and the editor's choice when assigning a
reviewer starts at "None / Free Form Review". OPS meets it on the
profile only, since it has no Static Pages plugin and no reviewers.

## Impact

- **Lost:** everything typed into the box since it was last saved: a
  static page's text, a signature or biography, a reviewer's written
  review. Nothing already saved is touched.
- **Who:** every signed-in user on their own profile; every reviewer
  writing a review with no review form, the default; managers writing
  static pages. Moving to another tab, page or window before saving is
  ordinary use.
- **Way round:** save before moving on ("Save", or "Save for Later" on
  the review).

Medium: users lose text they wrote without a word, a reviewer's review
among it, but saving first keeps it. It would be high if a review could
be lost with no way to keep it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`).
  Static page and review steps: OJS or OMP; profile steps: any of the
  three apps.
- In the dataset "Static Pages Plugin" is installed but unticked, so
  steps 3 and 4 turn it on, and the journal or press has no static page,
  so step 5 adds one.

Static page window (OJS, OMP):

1. Sign in as `rvaca` (the journal or press manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Generic Plugins", tick "Static Pages Plugin". "The plugin
   "Static Pages Plugin" has been enabled." shows at the top right.
4. Reload the page and open the tab "Static Pages", which now shows.
5. Press "Add Static Page". Type "u09a19" into "Path", "u09a19 page"
   into "Title" and "u09a19 saved text" into "Content", and press
   "Save". The page "u09a19 page" is listed.
6. Open the row's actions and press "Edit".
7. Click at the end of "Content" and type " and more". Touch nothing
   else.
8. Press the window's "Close" (the back arrow at its top left).
9. Press "Edit" on "u09a19 page" again.
10. Type " and more" at the end of "Content" again, and reload the page.

Profile (OJS, OMP, OPS):

11. Sign in as `dbarnes`. Open "Edit Profile"
    (`/index.php/publicknowledge/en/user/profile`), tab "Contact".
12. Click into "Signature" and type "u09a19 signature". Touch nothing
    else.
13. Press the tab "Public", then "Contact" again.
14. On "Public", type "u09a19 biography" into "Bio Statement". Press
    "Identity", then "Public" again.
15. On "Contact", type "u09a19 signature" into "Signature" again, and
    press the journal's (press's, server's) name at the top left, a link
    to its home page.

Review (OJS submission 12, "Sodium butyrate improves growth performance
of weaned piglets during the first period after weaning"; OMP submission
17, "Open Development: Networked Innovations in International
Development"):

16. Sign in as `jjanssen` and open the review request from "Review
    Assignments" (`/index.php/publicknowledge/en/reviewer/submission/12`;
    OMP `/17`).
17. On step 1 press "Accept Review, Continue to Step #2", on step 2
    "Continue to Step #3".
18. Type "u09a19 review text" into "For author and editor".
19. Press the tab "2. Guidelines", then "3. Download & Review".

**Expected.** Steps 8, 13, 14 and 19 ask, before closing the window or
opening the tab:

```
The data on this form has changed. Do you wish to continue without saving?
```

"Cancel" keeps the text; "OK" goes on. Steps 10 and 15 raise the
browser's "Leave site?" question.

**Observed.** None of them asks. Step 8 closes the window at once, and
in step 9 "Content" reads "u09a19 saved text": " and more" is gone. In
step 13 "Public" opens at once, and back on "Contact" "Signature" is
empty; in step 14 the same with "Bio Statement". In step 19 "2.
Guidelines" opens at once, and back on step 3 "For author and editor"
is empty. Step 10 reloads the page and step 15 opens the home page, with
no question, and "Signature" is empty when the profile is opened again.

Controls: with "Title" changed instead of "Content", step 8 asks the
question and a reload raises "Leave site?". With a number typed into
"Phone" alone, step 13 asks the question and the link in step 15 raises
"Leave site?". In both "Cancel" keeps the text.

## Cause

The legacy form handler counts a form as changed only when one of its
inputs sends a `change` event.
`FormHandler` binds `formChange()` to `$(':input', $form).change(…)`
([js/controllers/form/FormHandler.js, lines 146–150](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L146-L150)).
`formChange()` sets the handler's `formChangesTracked` and triggers
`formChanged`
([lines 277–283](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L277-L283)).

The three questions read that state:

- Closing a window: `FormHandler.containerCloseHandler()` asks
  `form.dataHasChanged` only while `formChangesTracked` is set
  ([lines 550–571](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L550-L571)).
- Switching tabs: `TabHandler.tabsBeforeActivate()` goes through the
  forms in the open tab and asks when one handler's `formChangesTracked`
  is set
  ([js/controllers/TabHandler.js, lines 126–150](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/TabHandler.js#L126-L150)).
  The reviewer's steps use it too, through `ReviewerTabHandler`.
- Leaving the page: `SiteHandler` registers a form as unsaved when it
  receives `formChanged`
  ([js/controllers/SiteHandler.js, lines 58–60](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/SiteHandler.js#L58-L60)),
  and its `beforeunload` handler, `pageUnloadHandler_()`, asks only while
  a form is registered.

A rich-text box is a hidden `<textarea>` with a TinyMCE editor in front
of it. Typing goes into the editor's iframe, and the textarea is written
only by `editor.save()`, which sends no `change` event. The handler that
wires each editor into its form, `FormHandler.tinyMCEInitHandler_()`
([lines 520–538](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L520-L538)),
binds the editor's `blur` to `save()` and to validating the textarea. It
never calls `formChange()`. So no edit in a rich-text box ever marks the
form as changed, and the window closes, the tab switches and the page
unloads as if nothing had been typed. Just before each close, tab press
or reload, the walk read the editor holding the typed text while its
textarea still held the saved value.

The Vue forms do not have the fault: `FieldRichTextarea.vue` uses
tinymce-vue's `v-model`, which listens to the editor's
`change input undo redo` events.

Reach (the same fault wherever a legacy form holds a rich-text box):

- The static page window's "Content" in every language box, on "Add" and
  "Edit" (on screen, OJS and OMP).
- The Profile page's "Signature" and "Bio Statement" (on screen, OJS,
  OMP and OPS) and "Mailing Address", a rich-text box in the same
  Contact form (code).
- The reviewer's step 3: "For author and editor" (on screen, OJS and
  OMP) and the box for the editor alone (code).
- The other legacy windows with a rich-text box (code): the "Custom
  Page" item's "Content" (Navigation), the custom block's "Content",
  "Notify" on a submission's participants, the reviewer email windows
  (thank, remind, cancel, reinstate, unassign, resend, the reviewer's own
  decline message), the user's email and details windows, review forms
  and their items, sections (OJS), issues (OJS) and the subscription,
  subscription type and subscription policy windows (OJS).

## Proposed fix

Mark the form as changed from the editor itself, in the one handler that
already wires every legacy editor into its form
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-unasked/fix.diff)):

```diff
--- a/lib/pkp/js/controllers/form/FormHandler.js
+++ b/lib/pkp/js/controllers/form/FormHandler.js
@@ -522,6 +522,11 @@
 
 		var editorId = tinyMCEObject.id;
 
+		// An edit in the editor changes the form, as a change to any other
+		// input does (the events tinymce-vue binds for v-model).
+		tinyMCEObject.on('change input undo redo',
+				this.callbackWrapper(this.formChange));
+
 		tinyMCEObject.on('blur', this.callbackWrapper(function(tinyMCEObject) {
```

The events are the ones tinymce-vue binds for the Vue forms, so the two
kinds of form count the same edits: typing (`input`), toolbar commands,
pastes and a blur after an edit (`change`, which TinyMCE sends only when
the content differs from its last undo level, never for the content the
editor opened with), and undo and redo. `formChange()` already ignores
forms with `trackFormChanges` off and repeated calls, and a submit or
"Cancel" clears the flag as before. All three questions read that flag,
so they follow with no other change.

Where a script fills an editor, the fix changes little. The legacy
`editor.setContent()` callers all run after a user action.
`AddReviewerFormHandler`, `ReviewerActionFormHandler` and
`StageParticipantNotifyHandler` fill the message when an email template
is chosen in the `#template` list. That list's own `change` event
already marks the form as changed, so a template choice asks today and
still does. `AdvancedReviewerSearchHandler` fills the request message
when a reviewer is picked, and refills an emptied editor when it is
activated. With the fix, read in the code and not walked, the next blur
of that editor counts as a change, so closing "Add Reviewer" after
picking a reviewer would ask. That is intended: the window then holds a
request nobody has sent. Nothing fills
an editor when a window opens, so an untouched window still closes
without a question.

Tried on `main`, OJS, OMP and OPS, with the fix applied to pkp-lib:

- The static page window asked on "Close" after a change only in
  "Content", "Cancel" kept the text and "OK" closed the window. A reload
  after such a change raised "Leave site?".
- A profile tab press after "Signature" or "Bio Statement" alone asked
  the question, on all three apps.
- The "2. Guidelines" tab press after "For author and editor" alone
  asked the question, on OJS and OMP.

A neighbour check gave the same result with the fix in and out:

- An untouched "Add Static Page" window closed at once.
- A page added with "Content" typed and "Save" pressed closed its window,
  was stored and showed its text at its address.
- That page's "Edit" window, loaded with the saved text and left
  untouched, closed at once.
- On an untouched "Contact" tab, pressing "Public" opened it at once.
  The same happened right after "Save", and on "Contact" reopened with
  the saved "Signature".
- On an untouched review step 3, pressing "2. Guidelines" opened it at
  once.

**Alternatives:**

- Send a jQuery `change` on the textarea from `SiteHandler`'s TinyMCE
  set-up. That reaches `formChange()` through the existing binding, but
  it also fires every other `change` handler on the textarea (validation,
  the multilingual popover) on each keystroke. It also puts a form
  concern into the site-wide editor set-up.
- Call `formChange()` on `blur` only, next to the existing `save()`.
  Nothing would count until the cursor leaves the editor, where the Vue
  forms count each edit as it is made.
- Fix each form's own handler: there are over twenty such forms, and a
  new one would have the fault again.

**What goes with it:**

- `js/pkp.min.js` in each app, which serves the handler when
  `enable_minified` is on, is rebuilt from the source
  (`lib/pkp/tools/buildjs.sh`).
- Backport: `tinyMCEInitHandler_()` is the same on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, so the diff applies as written
  (at a two-line offset on 3.4 and 3.3). Those branches ship TinyMCE 5
  (3.4) and 4 (3.3); that the four events behave there as in TinyMCE 7
  is read, not run.
- Test: e2e checks in U09, U03 and U28 for a change made only in a
  rich-text box: the static page window's back arrow, a profile tab and
  a review step tab.

Small: four lines in the shared form handler, following the pattern the
Vue forms use, with the e2e checks as its test.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/static-page-content-change-lost-unasked/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/static-page-content-change-lost-unasked/walk.js)
  takes the Steps and the controls through the screens as `rvaca`,
  `dbarnes` and `jjanssen`, from a freshly loaded default dataset
  (pkp/datasets 38ab955, 2026-09-30, PostgreSQL; the fault is in the
  browser and does not touch the database). Run:
  `node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-unasked/walk.js [neighbour]`.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/static-page-content-change-lost-unasked/fix.diff ojs omp ops`,
  then reverted. The dataset's configuration has `enable_minified = Off`,
  so the patched source file was served; `js/pkp.min.js` was not
  rebuilt. The static page part of the fix trial used an "Add Static
  Page" window with text typed only into "Content". Step 15 was not
  walked with the fix.
- Tips walked: `main` OJS
  [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
  (pkp-lib
  [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)),
  OMP
  [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
  (pkp-lib
  [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)),
  OPS
  [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
  (pkp-lib 3dc90c81a6), staticPages
  [45d02c085e](https://github.com/pkp/staticPages/commit/45d02c085ee125bf390f89e5bff1f0833838a647);
  `stable-3_5_0` OJS
  [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
  OMP
  [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
  OPS
  [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994)
  (pkp-lib
  [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1),
  staticPages
  [fb9b499e6f](https://github.com/pkp/staticPages/commit/fb9b499e6f16b0a7f01ca130776bb993a0ec443b)).
- On `stable-3_5_0` the static page steps were walked in their earlier
  form, and so were steps 11–14 and 16–19. That form used an "Add Static
  Page" window with text typed only into "Content", then "Close", then a
  reload. Steps 5–9 as written (the "Edit" window) and step 15 were
  walked on `main` only.
- Code reads: `FormHandler.js` is the same in the two pkp-lib commits
  `main` uses (OJS 2e377d27fc; OMP and OPS 3dc90c81a6). On
  `stable-3_5_0` it is the same apart from whitespace on one line. On
  pkp-lib `stable-3_4_0`
  ([df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747))
  and `stable-3_3_0`
  ([d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072)),
  `tinyMCEInitHandler_()` binds `blur` alone, change tracking binds
  `:input` `change` alone, and `SiteHandler`'s TinyMCE set-up binds no
  change event. On both branches the staticPages plugin's
  `editStaticPageForm.tpl`, `templates/user/contactForm.tpl`
  ("Signature"), `templates/user/publicProfileForm.tpl` ("Bio
  Statement") and `templates/reviewer/review/step3.tpl` (`comments`,
  `commentsPrivate`) render those boxes `rich=true` in legacy forms. App
  tips read: OJS `stable-3_4_0`
  [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
  `stable-3_3_0`
  [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144);
  OMP `stable-3_4_0`
  [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
  `stable-3_3_0`
  [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2);
  OPS `stable-3_4_0`
  [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
  `stable-3_3_0`
  [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09).
- Review default: the review form list in the "Add Reviewer" window
  (`reviewerFormFooter.tpl`) shows only when the context has review
  forms, and starts at `manager.reviewForms.noneChosen` "None / Free Form
  Review". The default dataset holds no review forms.
- Script-filled editors: `editor.setContent()` in
  `AddReviewerFormHandler.js` (line 117), `ReviewerActionFormHandler.js`
  (line 129) and `StageParticipantNotifyHandler.js` (line 209), each in
  `updateTemplate()`, which answers the `#template` list's `change`; and
  in `AdvancedReviewerSearchHandler.js` (lines 116 and 121), after a
  reviewer is picked. The "Add Reviewer" case with the fix was not
  walked.
- Introduced: change tracking came with
  [fa58d3dc19](https://github.com/pkp/pkp-lib/commit/fa58d3dc190cbfa85efe073d66d0c739a259e401)
  and followed the inputs' `change` events from ea8d4cda2f. The editor's
  form wiring came with
  [33a7240af0](https://github.com/pkp/pkp-lib/commit/33a7240af0ba397c1094149a8cdc4c85af19e50c),
  for validation only. No version of the handler reported an editor
  change, so there is no commit that broke it.
- Upstream search 2026-09-30, pkp/pkp-lib, pkp/ojs, pkp/staticPages and
  pkp/ui-library, issues and PRs: "data on this form has changed",
  tinymce with "without saving", "unsaved" and "changes lost",
  "unsaved changes rich text", "static page content lost",
  `tinyMCEInitHandler`, `formChangesTracked`. The nearest,
  `pkp/pkp-lib#13177`, is about the Vue publication forms' multilingual
  editor not resetting between windows, a different fault.
- Not driven: the static page and review steps on OPS, which has no
  Static Pages plugin and no reviewers; "Mailing Address" and the
  reviewer's box for the editor alone (the same forms as "Signature" and
  "For author and editor"); leaving the review by a link; Escape with the
  cursor in an editor; the other windows of the Cause's reach, with or
  without the fix.
