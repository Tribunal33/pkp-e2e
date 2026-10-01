# "Submit" refused with an empty problems banner when the draft was already submitted or its section closed

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the older wizard has no "Review" step)
- **Introduced** `pkp/pkp-lib#8495` for `pkp/pkp-lib#7191` · [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) · 2022-10-18 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#8408` (closed; pkp chose to leave the closed-section refusal unshown, since a reload explains it; it does not mention the double submit)
- **Tracked in** spec U21 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An author has the same draft open in two browser tabs. They submit it
from one tab, then press "Submit" in the other tab, which was still open
on "Review". The second tab stays on "Review" under the banner "There
are one or more problems that need to be fixed before you can submit…",
nothing below it is flagged, and its "Submit" button is now disabled.
The server's actual refusal, "This submission has already been
submitted…", never reaches the screen.

The same happens when a manager closes the draft's section to authors
while the author is on "Review": "Submit" is refused and the author sees
only the empty banner, not "… is not accepting submissions to the
Articles section…". On a press, the "For the Editors" step also shows
that message spelled out one character per line under "Series".

The double submit costs nothing: the submission went in from the first
tab. With a closed section the submission stays a draft, and the author
learns why only by reloading the page.

## Impact

Already submitted from another tab:

- **Lost**: nothing; the submission went in once.
- **Who**: anyone submitting who has the same draft open in two tabs or
  windows and presses "Submit" in both; uncommon.
- **Way round**: reloading the page shows "Submission complete".

Section closed while the author is on "Review":

- **Lost**: the submission is refused, correctly, but the author is not
  told why and is asked to fix problems that do not exist.
- **Who**: an author whose journal, press or server closes the section
  or series to authors (deactivates it, or restricts it to editors)
  while the author is on "Review"; a rare timing, but managers do close
  sections.
- **Way round**: reloading the page shows the "Section Closed" page,
  which names the section and the person to contact.

Medium: in the section case the submit fails and misleads, in a rarely
met state, and a reload on screen explains it. Low would fit the double
submit alone, where the submission goes in.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`.

Starting a draft (OJS and OPS as `ccorino`, OMP as `aclark`):

1. Sign in as `ccorino` (OMP: `aclark`).
2. Open "New Submission" (`/index.php/publicknowledge/en/submission`).
   Type the title "u21w43 Submitted Twice", choose the section
   "Articles" (OPS: "Preprints"; OMP has no section here), choose
   English, tick every box and press "Begin Submission".
3. On "Upload Files", upload a PDF as "Article Text" (OMP: "Book
   Manuscript"; OPS: "Add File", label "PDF"). Press "Continue".
   [3.5: the wizard opens on "Details" and "Upload Files" is the second
   step, so step 4's abstract comes before this upload.]
4. On "Details", type an abstract. Press "Continue" through
   "Contributors" and "For the Editors" (OMP: choose the series "Library
   & Information Studies"; OPS "For Readers": "This preprint has not
   been published elsewhere.") to "Review". Tick the confirmation boxes.
   This is tab A. Leave it open.

Already submitted from another tab:

5. Open a second tab on the same draft (tab A's address without
   `#review`). Press "Continue" to "Review" and tick the confirmation
   boxes. This is tab B.
6. In tab B, press "Submit", then "Submit" in the confirmation. The page
   shows "Submission complete".
7. Go back to tab A and press "Submit". The confirmation reads "The
   submission, u21w43 Submitted Twice, will be submitted to Journal of
   Public Knowledge for editorial review. Are you sure you want to
   complete this submission?" Press "Submit".

Section closed (steps 1-4 again, with the title "u21w43 Section Closed"):

5. In another browser, sign in as `dbarnes`. Open Settings › Journal ›
   "Sections" (OPS: Settings › Server › "Sections"; OMP: Settings ›
   Press › "Series"), open the row "Articles" (OPS "Preprints", OMP
   "Library & Information Studies") and choose "Edit".
6. Tick "Items can only be submitted by Editors and Section Editors."
   (OPS: "… by Managers and Moderators."; OMP: "Don't allow authors to
   submit directly to this series.") and press "Save".
7. Back in the author's tab A, press "Submit", then "Submit" in the
   confirmation.
8. (OMP) Open "For the Editors" from the step bar.

**Expected**: tab A tells the author why. After a double submit: "This
submission has already been submitted. Please visit your submissions
dashboard to view it.", with the link to the dashboard. With the section
closed: "Journal of Public Knowledge is not accepting submissions to the
Articles section. If you need help recovering your submission, please
contact Ramiro Vaca."

**Observed**: in both cases the confirmation closes and tab A stays on
"Review" under the banner "There are one or more problems that need to
be fixed before you can submit. Please review the information below and
make the requested changes." No panel below it flags anything, no other
message appears, and tab A's "Submit" is disabled. The request behind
the confirmation was refused:

```
POST /index.php/publicknowledge/api/v1/submissions/21/submit   (X-Http-Method-Override: PUT)
400 {"submissionProgress":"This submission has already been submitted. Please visit your <a href=\"http://…/index.php/publicknowledge/en/dashboard\">submissions dashboard</a> to view it."}

400 {"sectionId":"Journal of Public Knowledge is not accepting submissions to the Articles section. If you need help recovering your submission, please contact <a href='mailto:rvaca@mailinator.com'>Ramiro Vaca</a>."}
```

On OMP the answer's key is `seriesId`, and "For the Editors" shows the
message under "Series" as a column of single characters, one per line,
each with a warning icon, the `<a href='mailto:…'>` tag included. After
a reload, the section case shows the "Section Closed" page and the draft
is still a draft.

A draft with real problems (no file, no abstract) gets the same banner
on "Review" with its complaints under it ("You must upload at least one
Article Text file.").

## Cause

Two refusals of the whole submission come back as a single string
rather than as a field's list of messages:

- `Repository::validateSubmit()` (`lib/pkp/classes/submission/Repository.php`,
  lines 379-394 on `main`) refuses a submission that is no longer a
  draft, under the key `submissionProgress`.
- `PKPSubmissionController::submit()`
  (`lib/pkp/api/v1/submissions/PKPSubmissionController.php`, lines
  874-893) refuses a section that is inactive or restricted to editors,
  under `Application::getSectionIdPropName()`: `sectionId` on a journal
  and a server, `seriesId` on a press. It answers 400 with both kinds of
  error at line 895.

The wizard page puts the whole answer into its `errors`
(`SubmissionWizardPage.vue` `submit()`, lines 693-700 in
`lib/ui-library`). An error then reaches the screen in one of two ways.
The `errors` watcher (lines 247-264) copies each key that names a field
of a step's form into that form. And the Review step's templates show
their own keys: `errors.files` in `review-files.tpl`,
`errors.contributors` in `review-contributors.tpl`, the publication
fields in `review-publication-field.tpl`. No field and no template on
Review shows `submissionProgress` or `sectionId`.

The banner (`lib/pkp/templates/submission/wizard.tpl`, lines 112-117)
shows whenever `errors` has any key, and says the problems are "below".
`isValid` (line 195) is false while `errors` has a key, and `canSubmit`
(line 131) needs `isValid`, so "Submit" goes disabled too.

On a press, `seriesId` does name a field, the series on "For the
Editors", so the watcher copies the string there. `FieldError.vue`
renders its `messages` with `v-for="message in messages"`, which over a
string gives one message per character. Review still shows the empty
banner.

Reach (code, except where marked walked):

- Field refusals (title, abstract, files, contributors, required
  metadata) each have a place on Review and show under the banner
  (walked: files, abstract). Hidden are the refusals with no place on
  Review: the two strings above (walked), an authorization refusal,
  which answers `{"error": …, "errorMessage": …}`, and any key a plugin
  adds through the `Submission::validateSubmit` hook without a Review
  template of its own. An answer that is not JSON opens the generic
  error dialog instead.
- A tab that reaches "Review" after the draft was submitted or its
  section closed gets the same banner at once: the check on arrival
  (`validate()`, with `_validateOnly`) runs the same code.
- Stored data: none. The second submit changes nothing, and with the
  section closed the draft stays a draft (both checked on the walk).

## Proposed fix

A proposal; the team decides. Show the `submissionProgress` refusal in place of the generic banner on
"Review", in the shared wizard template. This is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submitted-twice-empty-problems-banner/fix.diff)
for `main`:

```diff
--- a/lib/pkp/templates/submission/wizard.tpl
+++ b/lib/pkp/templates/submission/wizard.tpl
@@ -110,9 +110,16 @@
                         ></funder-manager>
                         <template v-else-if="section.type === 'review'">
                             <notification
-                                v-if="Object.keys(errors).length" type="warning"
+                                v-if="errors.submissionProgress"
+                                type="warning"
                                 class="submissionWizard__review_errors"
                             >
+                                <span v-strip-unsafe-html="errors.submissionProgress"></span>
+                            </notification>
+                            <notification
+                                v-else-if="Object.keys(errors).length" type="warning"
+                                class="submissionWizard__review_errors"
+                            >
                                 {translate key="submission.wizard.errors"}
                             </notification>
                             {foreach from=$reviewSteps item=$step}
```

The template owns the Review step's error display, and the three apps
use it without overriding it, so one change covers OJS, OMP and OPS. It
follows how Review shows its other keys (a warning `notification` per
key, as `review-files.tpl` does for `errors.files`). The message carries
a link, so it is rendered through `v-strip-unsafe-html`, which
`wizard.tpl` already uses for the title. Field errors keep the generic
banner, which still lists its problems below it. The answer, the
`Submission::validateSubmit` hook and the `submission:submit:errors`
event stay as they are. Tried on `main`: after a double submit, tab A
shows "This submission has already been submitted. Please visit your
submissions dashboard to view it." with the link; a draft with a
missing file and abstract shows the same banner and complaints with the
change in and out.

**Alternatives**:

- Show every error whose value is a string. That would also cover the
  closed section and plugins' keys, but an authorization refusal's
  `error` can be a raw locale key, and it would then show on Review.
- Send tab A to "Submission complete" on this refusal (in
  `SubmissionWizardPage.vue`'s `submit()`). That needs a second
  repository and a build, and the message already links to the
  dashboard.
- A dialog, as `pkp/pkp-lib#8408` considered. That too needs a
  ui-library change.

**What goes with it**:

- The closed-section refusal is left out, as pkp decided in
  `pkp/pkp-lib#8408`. Covering it needs a new template variable:
  `PKPSubmissionHandler::showWizard()` reads
  `Application::getSectionIdPropName()` (line 177) but assigns nothing
  to the template, and the notification would show
  `errors[<that name>]`. A press also needs the controller to send that
  error as a list (`[$message]`), as field errors are, so "For the
  Editors" stops spelling it out.
- Backport: `fix.diff` does not apply to `stable-3_5_0`, where the
  block starts at line 99 after `></reviewer-suggestions-list-panel>`.
  The same change rebased is
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submitted-twice-empty-problems-banner/fix-stable-3_5_0.diff)
  (`git apply --check` passes on the three apps; not walked). On 3.4
  the block follows `></contributors-list-panel>` and needs its own
  rebase; 3.4 has the `v-strip-unsafe-html` directive.
- A test: an e2e scenario with two tabs on one draft, both submitted.

Small: one template block in pkp-lib, following the pattern of the
other Review keys, tried on the three apps.

## Evidence

- Kept scripts, on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets 38ab955, 2026-09-30):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submitted-twice-empty-problems-banner/walk.js)
  takes the double-submit steps, then a second draft with no file and
  no abstract to "Review";
  [section-closed.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submitted-twice-empty-problems-banner/section-closed.js)
  takes the section steps (helper in `lib.js` beside it). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/submitted-twice-empty-problems-banner/walk.js`
  (or `section-closed.js`), with `PKP_E2E_LINE=stable-3_5_0` in front
  for 3.5. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/submitted-twice-empty-problems-banner/fix.diff ojs omp ops`,
  then `walk.js`, then `revert` with the same arguments. No request
  answered 500 and no page script failed in any run.
- Tips: `main`: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6), lib/ui-library 280f98c5.
  `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd, lib/pkp
  a9c76aed62, lib/ui-library 1a7a4750.
- Walked: the double submit on `main` and 3.5, the three apps; the
  closed section on `main` only, the three apps. On 3.5 the closed
  section was read in the code: the same section check
  (`PKPSubmissionController.php` line 838), the same watcher
  (`SubmissionWizardPage.vue` line 232) and `FieldError.vue`'s
  `v-for`.
- 3.4 (code): pkp-lib `stable-3_4_0` df13621c2d: `templates/submission/wizard.tpl`
  lines 100-104 (the same banner), `classes/submission/Repository.php`
  lines 345-348 (the same check), `api/v1/submissions/PKPSubmissionHandler.php`
  line 716 (the section check). ui-library `stable-3_4_0` ee684b34:
  `SubmissionWizardPage.vue` `submit()` puts the answer into `errors`
  the same way; `FieldError.vue` has the same `v-for`. OJS
  `stable-3_4_0` 9571d8fde7; no app overrides `wizard.tpl` there.
- 3.3 (code): pkp-lib `stable-3_3_0` d446601ebe, OJS 9fdb9bcf9a. The
  older wizard (`pages/submission/PKPSubmissionHandler.inc.php`) refuses
  every step but the last on a completed submission (lines 63-67) and
  has no "Review" step or banner. What a second "Finish Submission"
  shows there was not looked at.
- Introduced: blame on `wizard.tpl` lines 112-117 passes two
  re-indentations (6938a4b00e and e414460a26, both 2026-07-23) and
  reaches e79fc21e20, as `git log -S "submission.wizard.errors"` does.
  GitHub lists it under `pkp/pkp-lib#8495`, opened by Alec Smecher
  (asmecher) and merged on 2022-12-14.
- Upstream: `pkp/pkp-lib#8408`'s closing comment (NateWr, 2022-12-14)
  says the section's validation error "is not shown anywhere" and calls
  that "good enough for now". Searched 2026-10-01 in pkp/pkp-lib,
  pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library.
- Not looked at: two quick presses of the confirmation's "Submit" in
  one tab; deactivating a section (the walk restricted it to editors,
  which takes the same check).
