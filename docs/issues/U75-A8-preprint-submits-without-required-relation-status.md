# A preprint author can submit without answering the "Relation status" question marked required

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; no relation question in the submission form)
- **Introduced** `pkp/ops#411` for `pkp/pkp-lib#7191` · [8fd2c6d834](https://github.com/pkp/ops/commit/8fd2c6d8341aef30ca36115520f399af1e45494e) · 2022-10-19 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#9441` (open; labelled Bug:1:Minor, assigned to pkp-dev-distribution)
- **Tracked in** spec U75 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a8)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, the submission wizard's "For Readers" step marks
"Relation status" as "* Required". An author who leaves it unanswered
is not stopped: "Review" shows no problem, "Submit" stays enabled and
the submission completes.

The preprint is then stored with no relation status. Its "Relations"
panel shows no choice ticked, and the "Post the preprint" window reads
"This preprint's relations have not been entered.".

## Impact

- **Lost**: nothing the author entered. The server ends up without the
  answer it asks every author for, and nobody is told at submission.
  The Preprint Server manager who posts the preprint later sees "This
  preprint's relations have not been entered." in the "Post the
  preprint" window, as a note that does not block posting. On 3.5 and
  3.4 that window reads "This preprint has not been published
  elsewhere." instead.
- **Who**: every author on every preprint server who skips the
  question.
- **Way round**: the Preprint Server manager or an assigned moderator
  chooses the status in "Relations". The author can do the same until
  the preprint is posted.

Low: readers and Crossref get the same for a missing status as for
"This preprint has not been published elsewhere.". The preprint page
shows a notice only for "published elsewhere", and the Crossref record
carries a relation only when the DOI of the published version is saved
(code). So the missing answer changes nothing public. It would be medium
if a missing status reached readers or Crossref differently from an
answered one.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`.

Submitting:

1. Sign in as `ccorino`.
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u75r4 relation never answered", tick the requirement
   boxes and press "Begin Submission". [3.5: the wizard opens on
   "Details", before "Upload Files"; the steps are otherwise the same.]
3. On "Upload Files", press "Add File", type the label "PDF", upload a
   PDF as "Preprint Text", then press "Continue".
4. On "Details", type an abstract and press "Continue".
5. On "Contributors", press "Continue".
6. On "For Readers", leave "Relation status * Required" with none of its
   three choices ticked, and press "Continue".
7. On "Review", read the page, then press "Submit" and "Submit" in the
   confirmation.

**Expected**: "Review" lists "Relation status" as a problem
("This field is required."), the banner "There are one or more problems
that need to be fixed before you can submit. …" shows, and "Submit" is
disabled until the author answers.

**Observed**: "Review" shows no banner and no problem, and "Submit" is
enabled. After the confirmation, "Submission complete" shows.

Reading the preprint:

8. Sign out, sign in as `dbarnes` and open the new submission (its
   "View" in "Active submissions").
9. Open "Title & Abstract" and press "Relations".
10. Press "Post" and read the window, then close it without posting.

**Observed**: in "Relations", none of "This preprint's relations have
not been entered.", "This preprint has not been published elsewhere."
and "This preprint has been published elsewhere." is ticked. The "Post
the preprint" window reads "All requirements have been met.", and its
"Related Publication" reads "This preprint's relations have not been
entered.". [3.5: "Relations" offers only the last two choices, neither
ticked, and the window reads "This preprint has not been published
elsewhere.".]

## Cause

`APP\pages\submission\SubmissionHandler::getEditorsStep()`
(`pages/submission/SubmissionHandler.php`, line 221) adds the relation
form to the "For Readers" step and sets
`$relationForm->fields[0]->isRequired = true`. `isRequired` only draws
the "* Required" mark. The wizard does not check its fields itself: on
"Review" it sends `PUT submissions/{id}/submit` with `_validateOnly`,
and "Submit" sends the same request without it. Both reach
`PKPSubmissionController::submit()`, which refuses with the errors of
`Repo::submission()->validateSubmit()`, and the wizard shows those
errors on the step that holds the field.

OPS's `APP\submission\Repository::validateSubmit()`
(`classes/submission/Repository.php`, line 36) adds the abstract and
word-count checks to pkp-lib's. Nothing checks `relationStatus`, so an
unanswered question passes. Nothing writes a default either:
`schemas/publication.json` declares `default: 0`, but pkp-lib applies
schema defaults (`PKPSchemaService::setDefaults()`) only to contexts
and the site. The publication is left without a `relationStatus` value.

Every other "Required" in the wizard has its check in
`validateSubmit()`: the title, the contributors' names, the abstract,
the required metadata and the required files.

Reach:

- The submit endpoint is also the REST API's. An API client that
  submits a preprint is not asked for a status either (code).
- The "Review" panel's own line for an unanswered question is a separate
  fault with its own fix:
  [U75-A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A9-review-reads-unanswered-relation-as-not-published.md).

## Proposed fix

Proposed: check the answer where the wizard's other required answers
are checked, in OPS's `validateSubmit()`, and show the error in the
"Review" panel with the same markup the Files panel uses for
`errors.files`:

```diff
--- a/classes/submission/Repository.php
+++ b/classes/submission/Repository.php
@@ -47,6 +47,11 @@
             $errors['abstract'] = [$locale => [__('validator.required')]];
         }
 
+        // Required relation status, asked on the "For Readers" step
+        if ($publication->getData('relationStatus') === null) {
+            $errors['relationStatus'] = [__('validator.required')];
+        }
+
         // Abstract/Plain Language Summary word limit validation
         if ($section->getAbstractWordCount()) {
             // validate abstract word count and add to errors
--- a/templates/submission/review-relation.tpl
+++ b/templates/submission/review-relation.tpl
@@ -26,6 +26,15 @@
             submissionWizard__reviewPanel__body--relation
         "
     >
+        <notification
+            v-for="(error, i) in errors.relationStatus"
+            :key="i"
+            type="warning"
+            class="submissionWizard__reviewEmptyWarning"
+        >
+            <icon icon="Error" class="h-5 w-5" :inline="true"></icon>
+            {{ error }}
+        </notification>
         <div class="submissionWizard__reviewPanel__item">
             <template v-if="publication.relationStatus === {\APP\publication\Publication::PUBLICATION_RELATION_PUBLISHED}">
                 <template v-if="publication.vorDoi">
```

([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-submits-without-required-relation-status/fix.diff).)
Only a never-answered status (`null`) is refused. "This preprint's
relations have not been entered." (0) is an answer the author chose, so
it passes.

Tried on `main`: with the fix, step 7's "Review" shows the problems
banner and "This field is required." in the "Relation status" panel,
"Submit" is disabled, and the draft stays unsubmitted. Without the
[U75-A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A9-review-reads-unanswered-relation-as-not-published.md)
fix, the panel still reads "This preprint has not been published
elsewhere." under the new error, so the two fixes belong together. A
draft whose author ticks "This preprint's relations have not been
entered." reaches "Review" with no problem and submits, with the fix
and without it.

**A choice for the team.** `pkp/pkp-lib#11719` (Alec Smecher) plans
the other way: OPS 5614d772ef changed the schema default to 0 on
purpose, so that new publications start as "This preprint's relations
have not been entered.". A stored default and this check cannot both
hold. With 0 stored, the question counts as answered before the author
sees it, and the "* Required" mark (`SubmissionHandler.php` line 221)
should go. The A9 report's first Alternative names the same choice from
the other side. This report recommends the check: the wizard has asked
every author the question as required since 3.4, `pkp/pkp-lib#9441`
reports the missing check as a bug, and a stored default records "not
entered" for an author who was never asked to choose it.

**Alternatives**:

- Store "not entered" (0) on every new publication, as
  `pkp/pkp-lib#11719` plans, and drop the "* Required" mark: the choice
  above. It also needs a write point and a migration for the `null`s
  already stored.
- Make the browser enforce `isRequired`: the wizard checks nothing in
  the browser, only through the submit check, and an API client would
  still pass.

**What goes with it**:

- No stored data needs repair on any line, because the check runs only
  at submit: preprints already submitted are never checked again, and
  their missing status keeps reading as it does today ("not entered" on
  `main`, "not published elsewhere" on 3.5 and 3.4).
- REST API: `POST submissions` creates a publication with no status, so
  a client must now set `relationStatus` with `PUT
  submissions/{id}/publications/{publicationId}` (what the wizard saves)
  or OPS's `PUT submissions/{id}/publications/{publicationId}/relate`
  before `PUT submissions/{id}/submit`. Otherwise the submit answers
  400 with a `relationStatus` error. This needs a line in the release
  notes.
- Backport: in code, 3.5 and 3.4 take the same two hunks after a small
  rebase (the PHP hunk's trailing context differs there). Putting a new
  400 on the submit endpoint into a stable patch release is a question
  of stable-release policy for the team.
- Guard: a unit test of OPS's `validateSubmit()` with and without a
  status, and a Planned e2e item in the Preprint relations spec: the
  wizard refuses an unanswered "Relation status".

Medium: a few lines in OPS's repository and one template, but the REST
API's submit endpoint changes for API clients that submit preprints.

## Evidence

- Script that takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-submits-without-required-relation-status/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-submits-without-required-relation-status/lib.js),
  run on an install loaded from the default dataset:
  `node bin/probe.js ops shared/playwright/checks/issues/preprint-submits-without-required-relation-status/walk.js`.
  The check that a draft answered "not entered" still submits is the
  same script with `MODE=neighbour` in front, run with the fix applied
  and without it.
- Tips walked: `main`: OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5). `stable-3_5_0`: OPS 38b61882d3 (pkp-lib cf3f984335,
  ui-library d4e01883). pkp/datasets e8dafbc (2026-10-02). PostgreSQL;
  the fault does not depend on the database.
- Stored state after step 7, on `main` and 3.5: no `relationStatus`
  row in `publication_settings` for the new publication. The default
  dataset's 19 preprints hold none either.
- What readers and Crossref get (code, `main`): `preprint_details.tpl`
  line 93 shows the notice only for `relationStatus ==
  PUBLICATION_RELATION_PUBLISHED`; `PreprintCrossrefXmlFilter`
  (lines 208–213, 499) reads only `vorDoi`. The "Post the preprint"
  window: `PublishForm` builds "Related Publication" as a note
  (`FieldHTML`), and only the requirement errors passed to it block
  posting, none of which concern the relation.
- 3.5 (walked): `getEditorsStep()` sets `isRequired` at line 221, and
  OPS's `validateSubmit()` has no relation check.
- 3.4 (code): OPS `upstream/stable-3_4_0` acd8ae704b sets `isRequired`
  at `pages/submission/SubmissionHandler.php` line 217, and its
  `classes/submission/Repository.php` `validateSubmit()` (line 34) has
  no relation check. pkp-lib `origin/stable-3_4_0` 767353f4fe's
  `validateSubmit()` has none either.
- 3.3 (code): OPS `upstream/stable-3_3_0` c5532e2161 builds
  `RelationForm` only in `WorkflowHandler` and `AuthorDashboardHandler`.
  The submission form does not ask the question.
- Introduced: `git blame` on `pages/submission/SubmissionHandler.php`
  line 221 gives 8fd2c6d834 ("pkp/pkp-lib#7191 Implement new submission
  wizard", authored by Nate Wright on 2022-10-19, committed by Alec
  Smecher on 2022-12-13), merged through `pkp/ops#411` (opened by Alec
  Smecher, merged 2022-12-14).
- Upstream: `pkp/pkp-lib#9441` ("[OPS] Relation status field marked as
  required on wizard, but can be left empty", OPS 3.4, open since
  2023-10-20, no comments, no linked PR) is the same fault. Searched
  2026-10-03 on pkp/pkp-lib, pkp/ops and pkp/ui-library ("relation
  status required", "relationStatus", "published elsewhere", "relations
  have not been entered", "validateSubmit").
