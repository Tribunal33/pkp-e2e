# A preprint's submission "Review" says "not published elsewhere" when the author never answered "Relation status"

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OPS
  - 3.5: none (a missing status meant "not published elsewhere" there, and every screen agreed)
  - 3.4: none (code; as on 3.5)
  - 3.3: none (code; no relation question in the submission form)
- **Introduced** issue `pkp/pkp-lib#11719`, no PR · [5614d772ef](https://github.com/pkp/ops/commit/5614d772ef2967b4295dcb9ed86ccbbd904c28f6) · 2025-08-21 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#11719` (open, milestone 3.6): the issue whose change left this
- **Tracked in** spec U75 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, an author who leaves "Relation status" unanswered
on the submission wizard's "For Readers" step finds the "Review" step's
"Relation status" panel reading "This preprint has not been published
elsewhere.", an answer they never gave. When the preprint is later
posted, the Preprint Server manager's "Post the preprint" window reads
"This preprint's relations have not been entered." for the same
preprint.

## Impact

- **Lost**: nothing stored. The author is shown a wrong answer on the
  step meant for checking the submission before sending it.
- **Who**: every author on a preprint server who does not answer the
  question and then reaches the wizard's "Review" step.
- **Way round**: answering the question on "For Readers"; "Review" then
  reads the answer given.

Low: an unanswered status costs nothing at posting. The "Post the
preprint" window only notes "This preprint's relations have not been
entered." under "Related Publication" and still reads "All requirements
have been met.", and the preprint page shows no notice for it. It would
be medium if the misleading line changed what is stored or shown to
readers.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`. Nothing else: `ccorino` is an author
  on "Public Knowledge Preprint Server", and `dbarnes` is its Preprint
  Server manager.

Reviewing the draft:

1. Sign in as `ccorino`.
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u75r4 relation never answered", tick the requirement
   boxes and press "Begin Submission".
3. On "Upload Files", press "Add File", type the label "PDF", upload a
   PDF as "Preprint Text", then press "Continue".
4. On "Details", type an abstract and press "Continue".
5. On "Contributors", press "Continue".
6. On "For Readers", leave "Relation status * Required" with none of its
   three choices ticked, and press "Continue".
7. On "Review", read the "Relation status" panel.

**Expected**: the panel does not claim an answer. It reads "This
preprint's relations have not been entered.".

**Observed**: the panel reads "This preprint has not been published
elsewhere.".

The manager's view of the same state:

8. Press "Submit" and "Submit" in the confirmation ("Submission
   complete" shows). [This works only while the required question can be
   skipped:
   [U75-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A8-preprint-submits-without-required-relation-status.md).]
9. Sign out, sign in as `dbarnes`, open the new submission (its "View"
   in "Active submissions") and press "Post".

**Observed**: the window reads "All requirements have been met.", and
its "Related Publication" reads "This preprint's relations have not been
entered.". "Relations" on the submission's publication pages shows none
of the three choices ticked.

Control: on 3.5, which has no "not entered" choice, step 7 reads "This
preprint has not been published elsewhere." and the "Post the preprint"
window reads the same.

## Cause

`templates/submission/review-relation.tpl` (OPS, lines 30–43) picks the
panel's line in Vue: `publication.relationStatus === 3` for "published
elsewhere", `== 0` for "This preprint's relations have not been
entered.", and anything else for "This preprint has not been published
elsewhere.". A preprint whose question was never answered holds no
`relationStatus`, and the publication reaches the page with
`relationStatus: null`. In JavaScript `null == 0` is false, so `null`
falls through to "not published elsewhere".

The "not entered" status (0) came with 5614d772ef, for
`pkp/pkp-lib#11719`, which asks for it to be "the default for new
publications". The commit changed the schema's default for
`relationStatus` from 1 to 0 in `schemas/publication.json` and added the
0 branch here and in `PublishForm`, but nothing writes that default to a
new publication: pkp-lib applies schema defaults
(`PKPSchemaService::setDefaults()`) only to contexts and the site. So a
never-answered preprint still holds nothing, and the declared default 0
is never stored. `PublishForm::__construct()` compares in PHP, where
`null == 0` is true, and reads it as "not entered". The template's
fallback was left as it was, reading `null` as "not published
elsewhere", the meaning it had while the default was 1.

Reach:

- `PublishForm`, the "Post the preprint" window: reads `null` as "not
  entered" (walked).
- "Relations" (`WorkflowPublicationRelationDropdownOPS.vue`) sets its
  radio from `null` and shows no choice ticked (walked). That is true to
  the unanswered state, and the fix leaves it alone.
- The preprint page (`preprint_details.tpl`) and the Crossref filter
  test only for "published elsewhere" or read the DOI, so `null` and 0
  give the same result there (code).
- Only drafts show the Review panel. Preprints already submitted
  unanswered, including all 19 of the default dataset, are shown only
  by the "Post the preprint" window, "Relations" and the preprint page,
  which read them correctly.
- Submitting without an answer, which the question's "* Required" mark
  forbids, is a separate fault with its own fix:
  [U75-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A8-preprint-submits-without-required-relation-status.md).

## Proposed fix

Proposed: read a missing status as "not entered" in the panel, as
`PublishForm` does. This also covers the `null`s already stored, with no
migration:

```diff
--- a/templates/submission/review-relation.tpl
+++ b/templates/submission/review-relation.tpl
@@ -35,7 +35,7 @@
                     {translate key="publication.relation.published"}
                 </template>
             </template>
-            <template v-else-if="publication.relationStatus == {\APP\publication\Publication::PUBLICATION_RELATION_UNKNOWN}">
+            <template v-else-if="publication.relationStatus === null || publication.relationStatus === undefined || publication.relationStatus == {\APP\publication\Publication::PUBLICATION_RELATION_UNKNOWN}">
                 {translate key="publication.relation.unknown"}
             </template>
             <template v-else>
```

([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-reads-unanswered-relation-as-not-published/fix.diff).
The condition may be shortened to `publication.relationStatus == null ||
publication.relationStatus == …UNKNOWN`, since a loose `== null` also
matches `undefined`.)

Tried on `main`: with the fix, step 7's panel reads "This preprint's
relations have not been entered.", and the rest of the steps go on as
before. To check that answered drafts are untouched, a draft was
answered in turn "This preprint has not been published elsewhere.",
"This preprint's relations have not been entered." and "This preprint
has been published elsewhere.". "Review" read each answer as given,
with the fix and without it.

**Alternatives**:

- Write the default to every new publication, as `pkp/pkp-lib#11719`
  asks: this fixes every reader at the source. But a stored 0 would
  pre-tick "This preprint's relations have not been entered." in the
  wizard, so the "* Required" mark (`SubmissionHandler.php` line 221)
  would mean nothing. It also needs a write point (OPS's publication
  `add()` or the submission `add` endpoint) and an upgrade migration
  for the existing `null`s.
- "None provided" (`common.noneProvided`), as
  `review-publication-field.tpl` shows an empty field: also true, but
  the author and the manager would then see different words for the
  same state.

**What goes with it**:

- With the U75-A8 fix applied as well, an unanswered question on
  "Review" shows "This field is required." above "This preprint's
  relations have not been entered.". The two fixes touch different
  lines of the template.
- Backport: none needed. 3.5 and 3.4 have no "not entered" status.
- Guard: a Planned e2e item in the Preprint relations spec: "Review"
  reads "This preprint's relations have not been entered." for an
  unanswered draft.

Small: one template condition, with no data or API change.

## Evidence

- Script that takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-submits-without-required-relation-status/walk.js)
  of the U75-A8 report, which takes these steps on its way, with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-submits-without-required-relation-status/lib.js),
  run on an install loaded from the default dataset:
  `node bin/probe.js ops shared/playwright/checks/issues/preprint-submits-without-required-relation-status/walk.js`.
  In step 9 it opens the submission by its address
  (`dashboard/editorial?workflowSubmissionId=<id>`). The answered-draft
  check is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-reads-unanswered-relation-as-not-published/neighbour.js),
  run with the fix applied and without it.
- Tips walked: `main`: OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5). `stable-3_5_0`: OPS 38b61882d3 (pkp-lib cf3f984335,
  ui-library d4e01883). pkp/datasets e8dafbc (2026-10-02). PostgreSQL;
  the fault does not depend on the database.
- Stored state after step 8: no `relationStatus` row in
  `publication_settings` for the new publication.
- The "Post the preprint" window: `PublishForm` builds "Related
  Publication" as a note (`FieldHTML`); only the requirement errors
  passed to it block posting, and none concern the relation. The
  assigned Moderator is offered no "Post" (Preprint relations spec,
  Rule 9).
- 3.5 (walked): `review-relation.tpl` has only the "published" branch
  and the `v-else` "not published elsewhere"; `schemas/publication.json`
  has `default: 1` and `in:1,2,3`; `PublishForm` reads `null` with its
  `else` branch as "This preprint has not been published elsewhere.".
- 3.4 (code): OPS `upstream/stable-3_4_0` acd8ae704b has the same
  template, schema and `PublishForm` as 3.5.
- 3.3 (code): OPS `upstream/stable-3_3_0` c5532e2161 asks the question
  only in the workflow's `RelationForm`. The submission form does not ask
  it, and there is no review panel.
- Introduced: `git blame` on the template's line 38 gives 2a51413f6f
  ("pkp/pkp-lib#11327 Submodule update (#1079)", 2025-08-26). For this
  template it only corrected the directive `v-elseif` to `v-else-if`,
  and it also bumps `lib/pkp` and `lib/ui-library`. Before it, the 0
  branch did not work at all. The branch, the schema change and the
  `PublishForm` branch came with 5614d772ef ("pkp/pkp-lib#11719 Add
  unspecified relation status", committed to `main` with no PR, not on
  `stable-3_5_0`). `pkp/pkp-lib#11719` is still open, with two unticked
  to-dos that do not cover this panel.
- Upstream: searched 2026-10-03 on pkp/pkp-lib, pkp/ops and
  pkp/ui-library ("relation status", "relationStatus", "published
  elsewhere", "relations have not been entered", "review-relation").
  No issue or PR names this panel.
