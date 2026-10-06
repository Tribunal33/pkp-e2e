# Submitting a draft again from a second tab shows a problems banner with nothing to fix

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no Review check in the older wizard)
- **Introduced** `pkp/pkp-lib#8495` for `pkp/pkp-lib#7191` · [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) · 2022-10-18 · Nate Wright (NateWr), in a PR opened by Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author has the same draft open in two browser tabs. They submit it
from one tab, then press "Submit" in the other, which was left on the
"Review" step. That tab stays on "Review" under "There are one or more
problems that need to be fixed before you can submit…", with nothing
flagged on any panel and "Submit" now disabled. The app's own refusal,
"This submission has already been submitted. Please visit your
submissions dashboard to view it.", never appears.

The submission went in once, from the first tab, but the author is told
to fix problems that do not exist. Reloading the tab shows "Submission
complete". The same empty banner meets an author whose section a
manager closes to authors while the draft is on "Review"; there a
reload shows the "Section Closed" page and its reason.

## Impact

- **Lost**: nothing. The author is not told that the submission already
  went in, or, in the closed-section case, why it is refused and whom
  to ask.
- **Who**: an author, or anyone submitting, who has the same draft open
  in two tabs and submits from both; or whose section a manager
  restricts to editors while the draft sits on "Review". It needs no
  setting, but both are rarely met.
- **Way round**: reload the tab. After a second submit it shows
  "Submission complete"; after a section closes it shows "Section
  Closed" with the manager's contact.

Low: the screen misleads in rarely met states, and a reload shows the
truth in both.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS, OMP or OPS `main`. Nothing else is
  needed: the author starts a new submission.

Submitting twice:

1. Sign in as `ccorino` (OJS, OPS) or `aclark` (OMP), an author.
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`).
3. Type the title "u21ir33 submitted twice", choose the section
   "Articles" (OJS; OPS has one section and offers no choice), tick the
   boxes, press "Begin Submission".
4. On "Upload Files" upload a file (OJS "Article Text", OMP a
   manuscript, OPS a "PDF" galley), press "Continue".
5. On "Details" type "An abstract for the u21ir33 walk." in "Abstract",
   press "Continue". On OMP's "For the Editors" choose the series
   "Library & Information Studies" (optional; the walk chose it); on
   OPS's "For Readers" answer the relation status. Press "Continue"
   until "Review". [3.5: the wizard opens on "Details", and "Upload
   Files" comes second.]
6. Copy the page's address and open it in a second tab of the same
   browser. The wizard opens on its first step ("Upload Files"; 3.5
   "Details"). Press "Continue" until "Review", where "Submit" is
   enabled. On OPS `main` this tab's "Review" also says "No files have
   been uploaded for this submission." although the PDF is there, a
   known fault of a reopened preprint draft
   ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-OPS8-OPS9-preprint-reloaded-draft-galley-list.md));
   it does not block "Submit".
7. In the first tab press "Submit", then "Submit" in the confirmation.
   "Submission complete" appears.
8. In the second tab press "Submit", then "Submit" in the confirmation.

Section closed (OJS, OPS):

1. As `ccorino`, take a new submission titled "u21ir33 section closed"
   to "Review" as in steps 2–5 above.
2. In another browser, sign in as `rvaca` (manager), open Settings ›
   Journal (Server) › "Sections", "Edit" on "Articles" ("Preprints"),
   tick "Items can only be submitted by Editors and Section Editors."
   (OPS "…by Managers and Moderators."), press "Save".
3. As `ccorino`, press "Submit", then "Submit" in the confirmation.
4. Reload the page.

**Expected**: the refusal says why: "This submission has already been
submitted…" with its link to the dashboard, or "Journal of Public
Knowledge is not accepting submissions to the Articles section. If you
need help recovering your submission, please contact Ramiro Vaca."

**Observed**: in both cases the confirmation closes and the tab stays on
"Review" under the banner, no panel gains a complaint, and "Submit" is
now disabled. The browser's own traffic shows the refusal:

```
PUT …/api/v1/submissions/21/submit  → 400
{"submissionProgress":"This submission has already been submitted. Please visit your <a href=\"…/index.php/publicknowledge/en/dashboard\">submissions dashboard</a> to view it."}

PUT …/api/v1/submissions/21/submit  → 400
{"sectionId":"Journal of Public Knowledge is not accepting submissions to the Articles section. If you need help recovering your submission, please contact <a href='mailto:rvaca@mailinator.com'>Ramiro Vaca</a>."}

There are one or more problems that need to be fixed before you can submit. Please review the information below and make the requested changes.
```

After a second submit the reload shows "Submission complete"; after the
section closed it shows the "Section Closed" page with the same
sentence as the refusal.

## Cause

`PKPSubmissionController::submit()` checks the submission with
`Repo::submission()->validateSubmit()`, which refuses a submission that
is no longer a draft: `$errors['submissionProgress']` gets the
`submission.wizard.alreadySubmitted` message
(`lib/pkp/classes/submission/Repository.php`). The controller itself
adds an error under the section's key (`sectionId` on OJS and OPS) with
`submission.wizard.sectionClosed.message` when the draft's section is
inactive or restricted to editors (`pkp/pkp-lib#8408`). The answer is a
400 with those errors, and the wizard's `submit()` stores it as
`this.errors` (ui-library `SubmissionWizardPage.vue`).

The wizard can show an error in two places. Its `errors` watcher copies
an error onto a step's form when a form field has the same name, and
the Review step's panels show their own keys (`errors.files`,
`errors.contributors`, `errors.title` and the other publication
fields). `submissionProgress` is neither, and no step's form has a
`sectionId` field (only the "Reconfigure" window does). Meanwhile the
banner in `lib/pkp/templates/submission/wizard.tpl` shows whenever
`errors` holds any key, always with the same text. So the refusal
raises the banner and nothing else, and `canSubmit`, which needs
`errors` empty, disables "Submit".

The rule this breaks: an error the server sends about the submission as
a whole, rather than one field, has no place on the Review step.

Reach:

- Both refusals above, walked on OJS and OPS (the closed section) and on
  all three apps (the second submit).
- A press: the closed-series error comes under `seriesId`, a field of
  "For the Editors", so it is flagged on that step but not on "Review",
  which shows the empty banner. Checked in the code.
- The wizard's "Cancel": `cancelSubmission()` stores a refusal the same
  way. An author's refused cancel answers `{"error": "You do not have
  permission to delete this submission."}`
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-OPS3-author-cancel-draft-does-nothing.md)),
  which raises the empty banner when the author is on "Review". Checked
  in the code.
- A plugin adding an error on the `Submission::validateSubmit` hook
  under a key no field has. Checked in the code.

## Proposed fix

Show the errors about the submission as a whole in the Review banner,
and keep the generic sentence for when something below is flagged.
Field errors are always arrays or locale-keyed objects; these errors are
plain strings, so the wizard can tell them apart
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/double-submit-empty-problems-banner/fix.diff),
the same diff):

```diff
--- a/lib/pkp/templates/submission/wizard.tpl
+++ b/lib/pkp/templates/submission/wizard.tpl
@@ -113,7 +113,10 @@
                                 v-if="Object.keys(errors).length" type="warning"
                                 class="submissionWizard__review_errors"
                             >
-                                {translate key="submission.wizard.errors"}
+                                <p v-for="(error, i) in submissionErrors" :key="i" v-strip-unsafe-html="error"></p>
+                                <template v-if="submissionErrors.length < Object.keys(errors).length">
+                                    {translate key="submission.wizard.errors"}
+                                </template>
                             </notification>
                             {foreach from=$reviewSteps item=$step}
                                 {if $step.reviewTemplate}
--- a/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
+++ b/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
@@ -197,6 +197,17 @@
 		},
 
 		/**
+		 * Validation errors about the submission as a whole, which no
+		 * step's form or review panel shows, such as a submission that
+		 * has already been submitted. Field errors are arrays or objects.
+		 */
+		submissionErrors() {
+			return Object.values(this.errors).filter(
+				(error) => typeof error === 'string',
+			);
+		},
+
+		/**
 		 * The title to show at the top of the page
 		 */
 		pageTitle() {
```

The messages go through `v-strip-unsafe-html`, as `FieldError.vue`
shows field errors, so the dashboard and contact links work while
anything unsafe in a section or journal name is stripped. One change
covers both refusals, the Cancel refusal and a plugin's message, without
a new key for each.

On a press the closed-series message then shows twice: in the banner and
on "For the Editors". That is intended: "Review" otherwise flags nothing,
and the field's copy is on another step.

Tried on `main`. With the fix in, the second submit leaves the banner
reading "This submission has already been submitted. Please visit your
submissions dashboard to view it.", its link opening the dashboard (OJS,
OMP, OPS). The closed section gives the "not accepting submissions"
sentence with its contact link (OJS, OPS). A draft taken to "Review"
without a file reads the same with the fix in and out: the generic
sentence, and the files panel's "You must upload at least one Article
Text file." (OMP "Book Manuscript", OPS "Preprint Text").

**Alternatives**:

- Send the tab to "Submission complete" when the refusal is
  `submissionProgress`: right for that case, but it covers no other
  error, and that screen says a confirmation was just emailed.
- Name the keys in the template instead of testing for strings: the
  section key differs per app (`sectionId`, `seriesId`), and a plugin's
  error would still raise the empty banner.
- The same filter inline in `wizard.tpl`, without the computed
  property: one repo, but it cannot be unit-tested in ui-library.

**What goes with it**:

- No stored data to repair, no REST API or plugin hook change.
- Backport: the banner and the computed block are the same on
  `stable-3_5_0` and `stable-3_4_0`, so the diff applies there with its
  context adjusted.
- Guard: a ui-library vitest that `submissionErrors` returns the string
  values of `errors` and leaves field errors out.

Medium: about a dozen lines, but in two repos, so two pull requests and
a submodule update in each app.

## Evidence

- Kept scripts, run on an install loaded from the default dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/double-submit-empty-problems-banner/walk.js)
  (submitting twice),
  [section-closed.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/double-submit-empty-problems-banner/section-closed.js)
  and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/double-submit-empty-problems-banner/neighbour.js)
  (a draft without a file), helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/double-submit-empty-problems-banner/lib.js):
  `node bin/probe.js all shared/playwright/checks/issues/double-submit-empty-problems-banner/walk.js`.
- Tips walked: OJS `main` 4408b94def (pkp-lib f5bd392a69, ui-library
  64d67363), OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (pkp-lib
  3dc90c81a6, ui-library 280f98c5); `stable-3_5_0` OJS 18d097d94e, OMP
  b24879c3d and OPS 3f0919468c (pkp-lib 1fb843f491, ui-library
  7a3c244b); pkp/datasets 27f1204. The 3.5 code read the same lines:
  the banner in `wizard.tpl`, `validateSubmit()`'s `submissionProgress`
  error and `submit()`'s `this.errors = r.responseJSON`.
- The closed section was walked on `main` only.
- 3.4 (code): pkp-lib `origin/stable-3_4_0` df13621c2d has the same
  banner in `templates/submission/wizard.tpl`, the same
  `submissionProgress` error in `validateSubmit()`, and review templates
  that read only `errors.files`, `errors.contributors`,
  `errors.citationsRaw` and the publication fields. ui-library
  `origin/stable-3_4_0` ee684b34 stores the refusal the same way in
  `submit()`. OJS `upstream/stable-3_4_0` 9571d8fde7.
- 3.3 (code): ui-library `origin/stable-3_3_0` 96959f9e has no
  `SubmissionWizardPage.vue`; pkp-lib `origin/stable-3_3_0` d446601ebe
  `PKPSubmissionHandler.inc.php` runs the older step-by-step wizard,
  which has no Review check and no such banner. OJS
  `upstream/stable-3_3_0` 9fdb9bcf9a.
- Introduced: `git log -S` finds the banner's `submission.wizard.errors`
  and the `alreadySubmitted` error both first in e79fc21e20 (blame on
  the banner's lines stops at later reindentations). The wizard's
  `submit()` handler came with the same feature in ui-library 467034aa4
  (`pkp/ui-library#241`); the section check in 957bab3ce2
  (`pkp/pkp-lib#8408`).
- Unverified: the fix on a press's closed series, and on the Cancel
  refusal.
