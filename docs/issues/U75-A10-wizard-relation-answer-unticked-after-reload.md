# After a reload, the wizard's "For Readers" shows the saved relation unticked, and answering again erases the DOI

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; the form shows the saved answer)
  - 3.3: none (code; no relation question in the submission wizard)
- **Introduced** `pkp/ops#804` for `pkp/pkp-lib#7495` · [6d23162966](https://github.com/pkp/ops/commit/6d2316296680561daffc475f88a87b467e3ff056) · 2024-11-06 (merged 2024-11-07) · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U75 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a10)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An Author answers "Relation status" on the submission wizard's "For
Readers" step, for instance "This preprint has been published
elsewhere." with the published version's DOI, and the answer is saved.
When the wizard page is loaded afresh, by a reload or by opening the
draft again later, "For Readers" shows none of the choices ticked and no
DOI box. Moving between steps without a new page load ("Back" from
Review) keeps the answer on screen. The Review step still shows the
saved answer.

Left unticked, the question keeps the saved answer. An Author who
answers it again gets an empty DOI box, which looks like a DOI never
typed, and "Continue" saves it empty over the stored DOI. Nothing says a
DOI was there.

## Impact

- **Lost**: the DOI of the published version. Once the preprint is
  posted, its page shows "This preprint has been published elsewhere."
  without the DOI line and link, and the Crossref deposit carries no
  relation to the published version (code). The moderator's "Post the
  preprint" window reads "This preprint has been published, but no DOI
  is available yet." (code), which looks like an Author who had no DOI.
- **Who**: every Author who reloads the wizard or comes back to a draft
  after answering "published elsewhere", on every preprint server.
- **Way round**: the Author retypes the DOI, or a moderator who knows
  it adds it later in the workflow's "Relations".

Medium: a stored DOI is overwritten without a word on a path the
screen invites, and the public page and the Crossref record lose the
link to the published version; not high, as it needs an Author who
answers again and leaves the box empty, and the DOI can be typed in
again.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`. Nothing else: the dataset
  holds no draft, so the Author starts one.

Steps:

1. Sign in as `ccorino` (Author).
2. Make a new submission: title "u75r5 Relation after reload", English
   as the submission language, tick the two confirmation boxes, "Begin
   Submission".
3. "Continue" past "Upload Files", "Details" and "Contributors" to "For
   Readers" (3.5: "Details" comes before "Upload Files").
4. Under "Relation status * Required", tick "This preprint has been
   published elsewhere.". In "DOI of the published preprint" type
   `https://doi.org/10.1234/u75r5`.
5. "Continue" to "Review". The "Relation status" panel reads "This
   preprint has been published.", with "published" linking to the
   address.
6. Reload the page. The wizard reopens on its first step.
7. "Continue" to "For Readers".
8. "Continue" to "Review" without touching the question.
9. Open "For Readers" from the step list and tick "This preprint has
   been published elsewhere." again.
10. "Continue" to "Review".

**Expected**: in step 7, "This preprint has been published elsewhere."
ticked and "DOI of the published preprint" showing
`https://doi.org/10.1234/u75r5`; in step 9 the box still showing the
address; in step 10 the panel reading "This preprint has been
published." with the link.

**Observed**: in step 7, none of the three choices ("This preprint's
relations have not been entered.", "This preprint has not been
published elsewhere.", "This preprint has been published elsewhere.")
is ticked and no DOI box shows. In step 8 the panel still reads "This
preprint has been published." with the link, and "Continue" sent no
save. In step 9 the DOI box is empty. In step 10 "Continue" saves

```
PUT /index.php/publicknowledge/api/v1/submissions/20/publications/21
relationStatus=3&vorDoi=
```

and the panel reads "This preprint has been published elsewhere."
without a link: the stored DOI is gone.

## Cause

OPS's `SubmissionHandler::getEditorsStep()`
(`pages/submission/SubmissionHandler.php`, line 220) builds the
step's question with `new RelationForm($publicationApiUrl,
$publication)`. Since `pkp/ops#804`, `RelationForm::__construct($action)`
(`classes/components/forms/publication/RelationForm.php`, line 35)
takes the action alone and sets `'value' => null` on both fields
(lines 44 and 62). PHP drops the extra argument without a word, so the
wizard page always serves the question unanswered. Before that change
the constructor read `relationStatus` and `vorDoi` from the
publication, as 3.4 still does.

That change was for the new workflow page. The same commit added
`new RelationForm('emit')` to `pages/dashboard/DashboardHandlerNext.php`
(line 37, since renamed `DashboardHandler.php`): one shared form, which
ui-library's `WorkflowPublicationRelationDropdownOPS.vue` refills in the
browser for whichever publication is chosen. The wizard has no such
refill. (The PR's title, "I7495 OPS e2e tests updated for new submission
listing and workflow page", undersells it; the commit is in it.)

The Review panel (`templates/submission/review-relation.tpl`) is built
from the publication the page loaded, so it shows the saved answer. The
wizard's forms are built once per page load and kept in the page's
`steps` while the Author moves between steps
(`SubmissionWizardPage.vue`), so only a fresh page load empties the
question (code). The wizard saves only the forms changed on the page,
so an untouched question keeps the stored answer. A tick sends the whole
form, the empty DOI box included, and the empty value is stored as no
DOI.

Reach:

- The wizard's "For Readers" step: walked.
- The workflow's "Relations" control fills itself in the browser and
  shows a saved answer after a reload: walked.
- `WorkflowHandler::setupIndex()` and
  `AuthorDashboardHandler::setupTemplate()` also pass a publication to
  `RelationForm`. Neither page renders on `main`, since both addresses
  redirect to the dashboard: checked in the code.
- The erased DOI feeds the posted preprint's page
  (`preprint_details.tpl` prints the DOI line only with a `vorDoi`), the
  "Post the preprint" window (`PublishForm`) and the Crossref deposit
  (`PreprintCrossrefXmlFilter::appendRelationships()` adds the relation
  only with a `vorDoi`): code.

## Proposed fix

A proposal for the team: let `RelationForm` take the publication again,
as an optional argument, and fill both fields from it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-relation-answer-unticked-after-reload/fix.diff)):

```diff
-    public function __construct($action)
+    public function __construct($action, ?Publication $publication = null)
@@ relationStatus
-            'value' => null,
+            'value' => $publication?->getData('relationStatus'),
@@ vorDoi
-                'value' => null,
+                'value' => $publication?->getData('vorDoi'),
```

The wizard and the two legacy callers already pass the publication, and
the dashboard's `RelationForm('emit')` passes none and keeps filling in
the browser, so the introducing change keeps its purpose. The other
forms of the same step build their values the same way:
`LicenseUrlForm`, built a line above, reads the publication's
`licenseUrl`. The status is passed as stored, unlike 3.4, which cast it
with `(int)`: since `pkp/pkp-lib#11719` 0 is the choice "This
preprint's relations have not been entered.", and a cast would tick it
on every unanswered draft.

Tried on OPS `main`: after the reload, "For Readers" showed "This
preprint has been published elsewhere." ticked with the address, the
Review panel kept it, and ticking it again kept the address and sent no
save. Two nearby cases the fix must leave alone behaved the same with
the fix in and out: a draft never answered still shows no choice ticked
after a reload, and
the workflow's "Relations" on preprint 2 shows a saved "This preprint
has not been published elsewhere." after a reload.

**Alternatives**

- Set the two values in `getEditorsStep()` after building the form:
  mends the wizard but leaves a constructor that ignores what three
  callers pass.
- Fill the wizard's form in the browser, as the workflow control does:
  a ui-library change for values the server already has.

**What goes with it**

- No data repair (an erased DOI cannot be recovered), and no change to
  the REST API or a plugin hook.
- Backport: on 3.5 the second hunk does not apply cleanly, because its
  context names `Publication::PUBLICATION_RELATION_UNKNOWN`, which 3.5's
  `RelationForm.php` lacks: `git apply --check` refuses it, and it
  applies with fuzz (GNU `patch` fuzz 1, `git apply -C2`) or by hand.
  The three changed lines are the same there.
- A guard: a unit test that a `RelationForm` built with a publication
  carries its two values.

Small: about an hour with the test.

## Evidence

- A Playwright script that takes the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-relation-answer-unticked-after-reload/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-relation-answer-unticked-after-reload/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ops shared/playwright/checks/issues/wizard-relation-answer-unticked-after-reload/walk.js`.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OPS c8af945bb7 (lib/pkp 3dc90c81a6, ui-library 280f98c5);
    the fix tried there.
  - stable-3_5_0: OPS 38b61882d3 (lib/pkp cf3f984335, ui-library
    d4e01883). The same result in steps 7 to 10. The question offers
    two choices, without "This preprint's relations have not been
    entered." (added on `main` by `pkp/pkp-lib#11719`). Its
    `RelationForm` and `getEditorsStep()` are `main`'s.
- 3.4, by code: OPS `stable-3_4_0` at acd8ae704b (lib/pkp 767353f4fe,
  ui-library ee684b34). `RelationForm::__construct($action,
  $publication)` sets `(int) $publication->getData('relationStatus')`
  and `$publication->getData('vorDoi')`, and `getEditorsStep()` passes
  the publication; 6d23162966 is not on the branch.
- 3.3, by code: OPS `stable-3_3_0` at c5532e2161 (lib/pkp ac3fa73402,
  ui-library 96959f9e). `RelationForm` is built only by
  `WorkflowHandler.inc.php` and `AuthorDashboardHandler.inc.php`, from
  the publication; the submission wizard asks no relation question.
- Introduced: `git blame` on `RelationForm.php` lines 35, 44 and 62
  gives 6d23162966 ("initial adjustments for new submission listing &
  workflow for OPS"), which removed the `$publication` parameter and
  its two reads; the GitHub API's `commits/<sha>/pulls` names
  `pkp/ops#804`. The commit is on `stable-3_5_0`.
- Not walked: "Back" from Review without a reload, and the posted
  preprint's page, "Post the preprint" window and Crossref deposit after
  a DOI is erased; each is read in the code named in the Cause.
- Not walked: opening the draft from "My Submissions" after "Save for
  Later". It loads the same wizard address as the reload
  (`/submission?id=<id>`).
- Each time "Review" opened, the step's check (`PUT
  …/submissions/20/submit`) answered 400 with the missing file, as for
  any draft without one. The steps upload no file, since the question
  does not need one.
- MySQL not checked; the fault does not touch the database.
- Upstream search 2026-10-03, pkp/pkp-lib, pkp/ops and pkp/ui-library
  issues and PRs, by "relation status" with "wizard", "reload", "not
  saved", "For Readers" and "published elsewhere", and by
  `RelationForm`, `getEditorsStep` and `vorDoi`: none about this.
  `pkp/pkp-lib#7134` (closed) asked for the question in the wizard,
  and `pkp/pkp-lib#9008` (closed) is about a version's status on the
  preprint page.
