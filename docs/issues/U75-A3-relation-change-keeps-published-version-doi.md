# A preprint switched away from "published elsewhere" keeps the published version's DOI, and its Crossref record still names it

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code; the submission wizard's "For Readers" step only)
  - 3.3: none (code; the DOI is kept, but nothing reads it without the status)
- **Introduced** `pkp/ops#411` for `pkp/pkp-lib#7191` · [8fd2c6d834](https://github.com/pkp/ops/commit/8fd2c6d8341aef30ca36115520f399af1e45494e) · 2022-10-19 · Alec Smecher (asmecher), PR author; commit by Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U75 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A version marked "This preprint has been published elsewhere." with a
DOI is switched to "This preprint has not been published elsewhere."
(or to "This preprint's relations have not been entered.") in the
workflow's "Relations" and saved. The preprint page drops its
"published elsewhere" notice, but the DOI stays saved: the "DOI of the
published preprint" box shows it again, after a reload too, as soon as
"published elsewhere" is ticked. An author who ticks "published
elsewhere" on the submission wizard's "For Readers" step, types a DOI
and then picks "not published elsewhere" stores the DOI the same way.

When that version is deposited with Crossref, its record names the work
behind the DOI as the preprint's published version, while the preprint
page says nothing of the kind. Nothing on screen shows the record.

It reaches only a relation changed away from "published elsewhere"
after a DOI was typed, on a server that deposits with Crossref.

## Impact

- **Lost**: a correct public record: Crossref links the preprint to a
  work that is not its published version.
- **Who**: an Author who changes their answer on "For Readers" before
  submitting, and the Preprint Server manager, Moderator or Author who
  corrects a relation saved by mistake (a DOI of a work that is not this
  preprint's published version).
- **Way round**: before changing the status, tick "published
  elsewhere", empty the box and save. Nothing on screen says this is
  needed, and a record already deposited stays wrong until the version
  is deposited again.

Medium: a public record is wrong in one relation and nobody is told,
which by the scale sits a level above a shown error, but only for the
narrow state of a relation changed away from "published elsewhere"
after a DOI was typed, on a server that deposits with Crossref; it would
be high if every deposit carried it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main` (`publicknowledge`).
- Submission 2, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence", is posted and has no
  relation saved. Nothing is created for the "Relations" steps.

"Relations", not published elsewhere:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open submission 2's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=2`),
   "Preprint" › "Title & Abstract".
3. Press "Relations", tick "This preprint has been published elsewhere.",
   type `https://doi.org/10.1234/u75r2` in "DOI of the published
   preprint" and press "Save". "Saved" shows.
4. Open the preprint page (`/index.php/publicknowledge/en/preprint/view/2`).
   It opens with "This preprint has been published elsewhere. DOI of the
   published preprint https://doi.org/10.1234/u75r2".
5. Back on "Title & Abstract", press "Relations" and tick "This preprint
   has not been published elsewhere." The DOI box disappears. Press
   "Save". "Saved" shows.
6. Reload the preprint page. It shows no notice.
7. Reload the workflow, press "Relations" ("This preprint has not been
   published elsewhere." is ticked) and tick "This preprint has been
   published elsewhere.", without saving.

"Relations", not entered (3.5 offers only the other two choices, so it
has no steps 8 and 9):

8. In the same open panel, tick "This preprint's relations have not been
   entered." and press "Save". "Saved" shows.
9. Reload the workflow, press "Relations" and tick "This preprint has
   been published elsewhere.".

The submission wizard:

10. Sign in as `ccorino` (Author) and start a submission: "New
    Submission", title "u75r2 wizard relation", section "Preprints", the
    two boxes ticked, "Begin Submission".
11. On "Upload Files" add a PDF galley, on "Details" type an abstract,
    and leave "Contributors" as it is, pressing "Continue" after each.
12. On "For Readers" tick "This preprint has been published elsewhere.",
    type `https://doi.org/10.1234/u75r2` in "DOI of the published
    preprint", then tick "This preprint has not been published
    elsewhere." (the box disappears) and press "Continue".
13. On "Review" the "Relation status" panel reads "This preprint has not
    been published elsewhere."; press "Submit" and "Submit" again.
14. Sign in as `dbarnes`, open the new submission's "Title & Abstract",
    press "Relations" ("This preprint has not been published elsewhere."
    is ticked) and tick "This preprint has been published elsewhere.".

**Expected:** after steps 7, 9 and 14 the box is empty, because the DOI
belongs to "published elsewhere" and went when that status went.

**Observed:** after steps 7, 9 and 14 the box holds
`https://doi.org/10.1234/u75r2`. The step 5 save sent the DOI from the
hidden box together with the new status, and the answer kept both:

```
POST /index.php/publicknowledge/api/v1/submissions/2/publications/2   (X-Http-Method-Override: PUT)
relationStatus=1&vorDoi=https%3A%2F%2Fdoi.org%2F10.1234%2Fu75r2
200 {"relationStatus":1, "vorDoi":"https://doi.org/10.1234/u75r2", …}
```

Step 8's save answered the same with `relationStatus` 0, and step 12's
autosave sent `relationStatus=1&vorDoi=https://doi.org/10.1234/u75r2` to
the same address. No request failed and the page logged no error.

## Cause

The rule that the DOI of the published version goes with "published
elsewhere" lives only in OPS's `APP\publication\Repository::relate()`,
which empties `vorDoi` for any other status (added for `pkp/pkp-lib#7274`,
[1adca1ce4c](https://github.com/pkp/ops/commit/1adca1ce4c8a253339b6138fa5ae9f2b1a7c9313),
2021, first released in 3.4.0). Only the `PUT …/publications/{id}/relate`
route calls it. The two pages that still build `RelationForm` on that
route, `WorkflowHandler::setupIndex()` and
`AuthorDashboardHandler::setupTemplate()`, now redirect to the
dashboard, so no screen on `main` calls it.

The forms that ask the question save to the plain publication route
instead: `PKPSubmissionController::editPublication()` and then
`PKP\publication\Repository::edit()`, which stores every property as
sent. `Form.vue::submitValues()` sends every field that is not
`isInert`, including one that `showWhen` hides, so a save of another
status carries the old DOI and `edit()` keeps it.

- The wizard's "For Readers" step (ops `SubmissionHandler::getEditorsStep()`)
  has put `RelationForm` on that route since it came with
  `pkp/ops#411`, in the same release as the rule, so on this path the
  rule never held.
- The workflow's "Relations" kept the rule in 3.4: its form posted to
  `/relate`. ui-library e88d2d20 (`pkp/ui-library#445` for
  `pkp/pkp-lib#7495`, 2024-11-06, in 3.5) rebuilt it as
  `WorkflowPublicationRelationDropdownOPS.vue` on the plain route.

The Crossref record then reads the DOI alone. Since crossref-ops
e1d57b3 (`pkp/pkp-lib#6251`, 2022),
`PreprintCrossrefXmlFilter::createPostedContentNode()` takes
`$publication->getData('vorDoi')` without looking at `relationStatus`,
and through `appendRelationships()` `createVorDoiNode()` writes it as a
`rel:intra_work_relation relationship-type="isPreprintOf"`. The other
readers check the status first: the preprint page
(`preprint_details.tpl`, on screen in steps 4 and 6), the "Post the
preprint" window (`PublishForm`) and the wizard's Review panel
(`review-relation.tpl`, on screen in step 13).

## Proposed fix

Move the rule from `relate()` into OPS's `APP\publication\Repository`
by overriding `edit()`, which every edit goes through. Then make the
Crossref filter read the DOI only with "published elsewhere", as the
other readers do. That covers versions already stored with a stray DOI
and the two writers `edit()` does not see: a REST `POST …/publications`
(`addPublication()`, through `add()`) and `version()`, which copies a
stray DOI onto a new version through `add()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/relation-change-keeps-published-version-doi/fix.diff),
one change in `pkp/ops` and one in `pkp/crossref-ops`):

```diff
--- a/classes/publication/Repository.php
+++ b/classes/publication/Repository.php
+    public function edit(Publication $publication, array $params): Publication
+    {
+        if (array_key_exists('relationStatus', $params) || array_key_exists('vorDoi', $params)) {
+            $relationStatus = array_key_exists('relationStatus', $params)
+                ? $params['relationStatus']
+                : $publication->getData('relationStatus');
+            if ((int) $relationStatus !== Publication::PUBLICATION_RELATION_PUBLISHED) {
+                $params['vorDoi'] = null;
+            }
+        }
+
+        return parent::edit($publication, $params);
+    }
--- a/plugins/generic/crossref/filter/PreprintCrossrefXmlFilter.php
+++ b/plugins/generic/crossref/filter/PreprintCrossrefXmlFilter.php
-        $vorDoi = $publication->getData('vorDoi') ? $publication->getData('vorDoi') : '';
+        $vorDoi = $publication->getData('relationStatus') == Publication::PUBLICATION_RELATION_PUBLISHED && $publication->getData('vorDoi')
+            ? $publication->getData('vorDoi')
+            : '';
```

An edit that touches neither field (a "Title & Abstract" save) is left
alone. Tried on `main` with steps 1 to 9: after step 5 the save
answered `"vorDoi": null`, steps 7 and 9 showed an empty box, and the
preprint page read as before. Neighbour check, with the fix in and out:
a "published elsewhere" save with a DOI, then a "Title & Abstract" save,
kept the relation and its DOI, and the preprint page kept its notice. A
proposal; the team decides.

**Alternatives:**

- Point the workflow control back at `/relate`: the fix the
  [U75 A1-A2 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A1-A2-relations-save-refused.md)
  proposes, for the route's own access check
  (`requiresProductionStageAccess` in OPS's `SubmissionController`). For
  this fault it covers that control only, not the wizard or API
  clients.
- Stop `Form.vue` from sending fields that `showWhen` hides: changes
  what every form in every app saves, and would not clear the DOI
  anyway, since `edit()` keeps a property it is not sent.
- Clear the box in the browser when the status changes: covers one
  caller, loses a DOI on a mistaken click, and leaves the server open
  to API clients.
- An upgrade migration that deletes `vorDoi` where `relationStatus` is
  not 3, instead of the filter change: repairs the stored data but
  discards it, and leaves the filter the one reader that ignores the
  status.

**What goes with it:**

- An API client that sends `vorDoi` under another status, alone or with
  it, gets 200 with `vorDoi` null, as the `/relate` route has answered
  since 3.4; a 400 from `validate()` would be the stricter choice.
  `Publication::edit` hook listeners see `vorDoi` null in those params.
  `relate()` becomes redundant but can stay.
- The [U75 A1-A2 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A1-A2-relations-save-refused.md)
  points the workflow's "Relations" back at `/relate`, whose `relate()`
  stores an empty DOI for the other two statuses. That fix alone ends
  steps 1 to 9. The wizard path, API clients (POST and PUT), stored
  stray DOIs and the Crossref filter stay, and steps 10 to 14 still
  reproduce. The two fixes combine, since `relate()` goes through the
  `edit()` override, and either may land first.
- Versions stored with a stray DOI still show it in the box until their
  next relation save; the filter change keeps it out of their deposits.
- A record already deposited stays wrong until someone deposits the
  version again: a relation save does not mark the DOI "Needs Sync"
  (only publishing and unpublishing do). Calling
  `Repo::doi()->markStale()` when a save changes `vorDoi` on a posted
  version would close that, and is left out of the diff.
- Backport: both hunks apply as written to 3.5, and to 3.4 (the
  `crossref-ops` hunk with fuzz). 3.3 needs nothing.
- Guard: a unit test of `Repository::edit()` in OPS.

Medium: a few lines each in two repositories (`pkp/ops` and
`pkp/crossref-ops`), with a unit test, and an answer that API clients
see change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/relation-change-keeps-published-version-doi/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/relation-change-keeps-published-version-doi/lib.js),
  run on an install loaded from the default dataset:
  `node bin/probe.js ops shared/playwright/checks/issues/relation-change-keeps-published-version-doi/walk.js`
  takes steps 1 to 9; `MODE=wizard` in front takes steps 10 to 14, and
  `MODE=nb` the neighbour check.
- Tips walked: OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5, crossref-ops b6b94dd); OPS `stable-3_5_0` 38b61882d3
  (pkp-lib cf3f984335, ui-library d4e01883, crossref-ops 20f5409).
  pkp/datasets e8dafbc (2026-10-02). PostgreSQL; the fault is in which
  properties are saved, not in the database.
- 3.5 walk: steps 1 to 7 as on `main`, with the same request and
  answer. Its panel offers two choices. The 3.5 code read: the same
  dropdown action, `relate()` and filter line as `main`. The wizard
  steps were walked on `main` only; 3.5's `getEditorsStep()` is the same.
- 3.4 (code): OPS `upstream/stable-3_4_0` acd8ae704b with the pointers
  it records: pkp-lib df13621c2d, ui-library ee684b34, crossref-ops
  50cef72. The workflow's "Relations" posts to `/relate`
  (`pages/workflow/WorkflowHandler.php`), whose `relate()` clears the
  DOI. The wizard's `getEditorsStep()` puts `RelationForm` (filled from
  the stored relation) on the publication route, and `Form.vue`
  `submitValues()` skips only `field-html` fields. The crossref-ops
  filter reads `vorDoi` alone. 1adca1ce4c and 8fd2c6d834 are both first
  in tag `3_4_0-0`.
- 3.3 (code): OPS `upstream/stable-3_3_0` c5532e2161 with pkp-lib
  d446601ebe and ui-library 96959f9e. The "Relations" form posts to
  `/relate`, but the 3.3 `PublicationService::relate()` stores `vorDoi`
  as sent and the 3.3 `Form.vue` sends every field, so the DOI is kept.
  The preprint page shows it only with "published elsewhere", and the
  3.3 Crossref filter (`plugins/importexport/crossref`) writes no
  `isPreprintOf` relation.
- Introduced: the wizard's `RelationForm` on `$publicationApiUrl`
  comes from 8fd2c6d834 (`git log -S RelationForm` on
  `pages/submission/SubmissionHandler.php`); `git log -L` on the
  workflow dropdown's action stops at e88d2d20, which created the
  component.
- Not driven: the Crossref record. The DOIs page's "Export DOIs" writes
  it without depositing, but `PubObjectsExportPlugin::exportXML()`
  validates it against `crossref5.4.0.xsd` fetched from crossref.org,
  which a test install cannot reach, so the export answers 400 "An XML
  validation error occurred and the XML could not be exported." before
  writing anything (seen on OJS `main` the same day, the same method).
  The record is read in the code on `main`, 3.5 and 3.4, and the filter
  change was checked only with `php -l`. MySQL not checked.
