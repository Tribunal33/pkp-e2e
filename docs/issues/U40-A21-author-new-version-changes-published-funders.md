# An Author who may edit only a new version changes the funders shown on the published version

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Security** unreleased
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no funders list)
  - 3.4: none (code; no funders list)
  - 3.3: none (code; no funders list)
- **Introduced** `pkp/pkp-lib#13273` for `pkp/pkp-lib#13109` · [18f402e585](https://github.com/pkp/pkp-lib/commit/18f402e585b7834cbb435ce143dfc50aa3d36936) · 2026-09-01 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U40 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a21)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)

## Summary

An editor creates a new version of a published article, book or
preprint, and its Author has "Allow this person to make changes to the
publication…". The Author may not change the published version: its
"Funding" page reads "This version has been published and can not be
edited." and "Add Funder" is disabled. On the new version's "Funding"
page "Add Funder" works, and a funder the Author adds there appears at
once on the published item's page.

Funders are one list shared by every version of an item, so adding,
editing or removing one on any version's "Funding" page changes them
all. Editors may change the published version anyway, so for them this
is within their rights. For the Author it goes around the lock that
keeps them off the published version. Nobody is told, and the item's
next Crossref or DataCite deposit sends the changed list.

## Impact

- **Lost**: control of the published record. A funder the editors did
  not check, or the loss of one the Author removed, shows on the live
  page and in what is exported and deposited from it.
- **Who**: Authors given "Allow this person to make changes to the
  publication…", on an item with a published version and a newer one
  in progress.
- **Way round**: an editor who notices can correct the list. Nothing
  stops the Author.

Medium: the published record changes without the editors, but only
where an Author is given edit rights on a new version, and an editor
can correct it. It would be high if journals routinely let Authors edit
new versions.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (`publicknowledge` in each app).
- OJS: submission 1, "Signalling Theory Dividends", already has a
  published version 1.0 and an unpublished version 1.1, and its author
  `amwandenga` already has the permission below.
- OMP: book 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots", is published with one version; its author `mdawson`
  lacks the permission. As `dbarnes`, open it and choose Publication ›
  "Create New Version" › "Confirm". Open the "Production" stage, and in
  Participants choose "Michael Dawson" › "Edit". Tick "Allow this person
  to make changes to the publication, such as the title, abstract,
  metadata and other publication details. …" and press "OK". Sign out.
- OPS: preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence", is posted with one
  version. As `dbarnes`, open it and choose Preprint › "Create New
  Version" › "Confirm". Its author `ckwantes` has the permission in the
  dataset; if not, give it to "Catherine Kwantes" in Participants, as
  for OMP. Sign out.

Steps:

1. Sign in as the author (`amwandenga`, `mdawson` or `ckwantes`) and
   open the submission from "My Submissions".
2. In the Publication menu (Preprint on OPS), open the published
   version's "Funding" page. "Add Funder" is disabled and the banner
   reads "This version has been published and can not be edited." ("…
   posted …" on OPS).
3. Open the new version's "Funding" page. "Add Funder" is enabled.
4. Press "Add Funder" and type "Funder sxx7". From the list, choose the
   entry with the typed name itself, not a registry match, and press
   "Save".
5. Sign out, and open the published item's page:
   `/index.php/publicknowledge/article/view/1`,
   `/index.php/publicknowledge/catalog/book/14` or
   `/index.php/publicknowledge/preprint/view/2`.

**Expected**: the published page shows no funders, as published, just
as the Author's edits to the new version's title leave the published
title alone. The Author is not offered "Add Funder" while another
version is published.

**Observed**: the save goes through (`POST
/api/v1/submissions/<id>/publications/<new version>/funders` answers
200), and in step 5 each app's published page shows:

```
Funders
Funder sxx7
```

The published version's own "Funding" page, still locked for the
Author, lists "Funder sxx7" as well.

## Cause

Funders belong to the submission, not to a version. The `funders`
table has a `submission_id` and no publication, every version's
"Funding" page lists the same rows, and `Submission\DAO` fills
`$submission->getData('funders')` by `submission_id`.

`PKPFunderController` (lib/pkp `api/v1/funders/PKPFunderController.php`)
is addressed by a publication
(`submissions/{submissionId}/publications/{publicationId}/funders`).
For `add`, `edit`, `delete` and `saveOrder`, `authorize()` (lines
102–120, the policy branch at 113–117) applies `PublicationWritePolicy`
to the publication in the address. The writes then use only the
submission: `add()` stores the `submissionId`, `edit()` and `delete()`
check only that the funder belongs to the submission, and `saveOrder()`
filters by `submission_id`. So the check asks "may this user edit
version 1.1?" while the write changes what version 1.0 shows too.

This was harmless until 18f402e585. Before it,
`Repo::submission()->canEditPublication(Publication $publication, int
$userId)` (lib/pkp `classes/submission/Repository.php`) loaded the
publication's submission and refused the Author when any of its
publications was published or scheduled. pkp/pkp-lib#13109 made the
lock per version (now `canEditPublication(Publication, User)`, lines
548–574), so that Authors can edit a new version. The funders
controller (pkp/pkp-lib#12392, d50c812aaf, 2026-07-06) was written
against the old, submission-wide lock and was not adjusted. It is a
regression because on `main` the Author could not change a published
item's funders until that change.

The Funding page follows the same per-version answer: it passes
`permissions.canEditPublication`, the selected version's
`canCurrentUserChangeMetadata`, to `FunderManager` as `canEdit`
(ui-library `workflowConfigAuthorOJS.js` and `workflowConfigEditorialOJS.js`,
which OMP and OPS merge into theirs).

Reach:

- Adding, editing, deleting and reordering funders all pass the same
  check (code). Adding was walked on all three apps.
- Readers of the shared list (code; the reader pages also on screen):
  the reader pages (OJS `article_details.tpl`, OMP `monograph_full.tpl`,
  OPS `preprint_details.tpl`), OJS's Publication Facts Label
  (`PflPlugin`, line 268), JATS export (`jatsTemplate`
  `ArticleFront.php`, line 729), Crossref and DataCite exports
  (`ArticleCrossrefXmlFilter`, `DataciteXmlFilter`), OPS's Crossref
  export (`PreprintCrossrefXmlFilter`), OMP's ONIX 3.0 export
  (`MonographONIX30XmlFilter`), the OpenSearch index
  (`OpenSearchEngine`) and the submission's REST map.
- The other routes `PublicationWritePolicy` guards (contributors,
  citations, data citations, JATS, body text, media files) write rows
  of the addressed publication only (code). Review rounds are shared
  between versions too; their fault is separate
  (`U40-A21-review-round-taken-from-other-version.md`).
- Editors: an editor's funder on a new version also shows on the
  published version (walked). It is not a fault for them, since they may
  edit the published version, which warns them with "Warning: This
  version has been published. Editing it may impact the published
  content.". Whether funders should be per version is an open product
  question in the Funding spec
  ([U43 A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U43-funding.md#a2)).

## Proposed fix

Treat a funders write as an edit of every version. Refuse it unless the
user may edit each publication of the submission, on the server and on
the "Funding" page.

On the server, add a policy after `PublicationWritePolicy` in
`PKPFunderController::authorize()` that applies the existing rule,
`Repo::submission()->canEditPublication()`, to every publication of the
authorized submission. It follows `PublicationCanBeEditedPolicy`: site
administrators pass, and the refusal message is
`api.submissions.403.userCantEdit`.

```php
$this->addPolicy(new PublicationWritePolicy($request, $args, $roleAssignments));
// Funders belong to the submission and every version shows them, so a change
// reaches the published versions too: require the right to edit every version.
$this->addPolicy(new SubmissionPublicationsCanBeEditedPolicy($request, 'api.submissions.403.userCantEdit'));
```

On the "Funding" page, offer the controls only when every version may
be changed. The submission's publication summaries already carry
`canCurrentUserChangeMetadata`:

```js
canEdit:
	permissions.canEditPublication &&
	submission.publications.every(
		(publication) => publication.canCurrentUserChangeMetadata,
	),
```

The full change is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-new-version-changes-published-funders/fix.diff)
(the new policy class, the controller, both workflow configs). Tried on
all three apps: the Author's "Add Funder" on the new version is
disabled and the published page keeps no funders. On OJS, the "Add
Funder" request sent directly as the Author is refused with "You are
not allowed to edit this publication.", while the same request as an
editor saves. The
Author still edits the new version's "Title & Abstract", and an editor
still adds funders on it.

**Alternatives**:

- Funders per version (a `publication_id`, copied with "Create New
  Version"): it matches the screen, which lists funding under each
  version, but it is a schema change and the product decision above.
  Until it is made, the check above holds; it would go with that change.
- Restore the submission-wide Author lock: it would undo
  pkp/pkp-lib#13109, whose point is that Authors edit new versions.
- Guard only the server: the Author would be offered "Add Funder" and
  then refused.

**What goes with it**:

- The submission wizard keeps working: it mounts `FunderManager` on its
  own (`templates/submission/wizard.tpl`, `canEdit` left at its default),
  and a submission there has one unpublished version, for which the new
  policy gives the same answer as `PublicationWritePolicy` (code).
- No stored data to repair: a funder an Author added this way is a
  valid funder, and editors can review the list.
- No backport: no release has a funders list.
- Tests: there is no test of `canEditPublication()` yet. The policy
  needs stage assignments from the database, so its test is a
  `DatabaseTestCase` (the policy tests in
  `tests/classes/security/authorization` with `PolicyTestCase` are the
  pattern): an Author whose assignment has `canChangeMetadata`, with one published and
  one queued version is denied, a Section Editor is permitted. The
  screen path belongs in this repo's publication-metadata e2e suite.

Medium: two repos (a pkp-lib policy and controller, a ui-library change
in two configs) and a database test, following existing patterns.

## Evidence

- Kept script: `shared/playwright/checks/issues/author-new-version-changes-published-funders/walk.js`
  (helpers in `lib.js`), run on an install loaded with the default
  dataset: `node bin/probe.js all <script> [steps|nb|server]`. The
  registry search (`api.ror.org`) was answered empty in the browser.
- Walked on `main`, 2026-10-05, PostgreSQL, dataset pkp/datasets
  58f1d08: OJS 1f4cef786f (lib/pkp a7f5e3081b, lib/ui-library
  64d67363), OMP a989fdc37 and OPS caddbb33da (lib/pkp a7f5e3081b,
  lib/ui-library 280f98c5). No server error or page script error.
- Fix tried with `bin/try-fix.js` on the three apps (lib/ui-library
  rebuilt): step 3 showed "Add Funder" disabled and step 5's page had
  no "Funders" section. With the fix and without it, the Author's
  "Save" on the new version's "Title & Abstract" stayed enabled, and
  `dbarnes`'s "Add Funder" on the new version answered 200. The server
  half alone (OJS, fix in; `server` mode): the "Add Funder" request
  (`POST …/submissions/1/publications/2/funders`, `{"funder":{"name":
  {"en":…}},"grants":[]}`), sent from the signed-in page with its CSRF
  token, answered 401 `{"error":"api.submissions.403.userCantEdit",
  "errorMessage":"You are not allowed to edit this publication."}` as
  `amwandenga` and 200 as `dbarnes`.
- 3.5 walked (stable-3_5_0: OJS 4342473090, lib/pkp 771474347e; OMP
  9c5e24246 and OPS 38b61882d3, lib/pkp cf3f984335; lib/ui-library
  d4e01883): no "Funding" entry in the Author's or `dbarnes`'s
  Publication menu, and the Author's "Save" on OJS submission 1's
  unpublished version 2 is disabled (3.5's
  `canEditPublication(int $submissionId, …)` locks the Author out of
  every version once one is published). 3.5 has no `api/v1/funders`.
- 3.4 and 3.3 were read in the code at OJS `upstream/stable-3_4_0`
  d68934d0d1 and `stable-3_3_0` ac77c9fb35, lib/pkp `origin/stable-3_4_0`
  767353f4fe and `origin/stable-3_3_0` ac3fa73402.
- Introduced: `git blame` on `canEditPublication()` gives 18f402e585
  (authored 2026-09-01; PR #13273 merged 2026-09-08); the version
  before it is read with `git show 18f402e585^:classes/submission/Repository.php`.
  The controller's `authorize()` is unchanged since d50c812aaf.
- Upstream: pkp/pkp-lib#13109 and pkp/pkp-lib#12392 (both closed) are
  the changes above and do not discuss funders across versions.
- MySQL not checked (nothing here depends on the database).
