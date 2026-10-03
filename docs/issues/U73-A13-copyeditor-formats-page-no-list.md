# On a press, the Copyeditor is offered "Publication Formats", and the page shows a refusal instead of the list

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP (books before publication; published books give these roles no "Publication" menu)
  - 3.4: none (code; the tab needs Production access)
  - 3.3: none (code; the tab needs Production access)
- **Introduced** `pkp/ui-library#428` for `pkp/pkp-lib#7495` · [80daa02d4](https://github.com/pkp/ui-library/commit/80daa02d4ce03c9011b386265d664410190d5b51) · 2024-10-16 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press, the side menu lists "Publication Formats" under a book's
version for roles whose work stops before Production: the Copyeditor
and the Marketing and Sales Coordinator on a book in Copyediting, the
Funding Coordinator on a book in Submission or review, and all three on
a published book. Any custom editorial role without Production in its
stages gets the same entry on a book in one of its stages. Choosing it
shows the page's heading and the version's status, then only "You
don't currently have access to that stage of the workflow." where the
list of formats should be.

The refusal itself is intended: formats and their files are production
material, and OMP 3.4 showed the tab only to roles with Production
access. What is wrong is the menu entry. These roles have no work on
formats, so no work is lost; they meet a page that promises a list and
gives a technical refusal.

## Impact

- **Lost.** No work; a menu entry that leads nowhere.
- **Who.** The roles above, on the books where the menu offers them the
  page.
- **Way round.** None needed.

Low: no task and no data are at risk; the fault is a page offered to
people it then refuses. If these roles had work to do on the formats
page, the severity would be higher.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 1, "The ABCs of Human Survival: A Paradigm for Global
  Citizenship", is in Copyediting, and `svogt` (Sarah Vogt) is assigned
  to it as Copyeditor. Book 5, "Bomb Canada and Other Unkind Remarks in
  the American Media", is published, and `svogt` is assigned to it as
  Copyeditor too. Nothing is created.

On a book in Copyediting:

1. Sign in as `svogt`.
2. Open book 1: "Assigned to me", its "View".
3. In the side menu, "Publication" › "Unassigned version (…)". It lists
   "Title & Abstract", "Contributors", "Chapters", "Metadata",
   "Publication Formats", "Media", "References" and "Funding".
4. Choose "Publication Formats".

On a published book:

5. Open book 5 by its address,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`
   ("Assigned to me" does not list it).
6. In the side menu, "Publication" › "Version of Record 1.0". It lists
   the same pages, "Publication Formats" among them.
7. Choose "Publication Formats".

[3.5: the pages sit directly under "Publication", with no version
entry, and step 3 lists "Title & Abstract", "Contributors",
"Chapters", "Metadata", "Publication Formats" and "References". Steps
5 to 7 do not show the fault there: 3.5 has no Done stage, so a
published book stays in Production, and a role with no Production
assignment, a custom one included, gets no "Publication" menu at all
(walked for `svogt` on book 5). The menu code is otherwise the same as
on `main`.]

**Expected:** at steps 3 and 6 the version lists no "Publication
Formats", as it lists no "Catalog Entry" or "Permissions & Disclosure",
since the Copyeditor's role does not reach Production.

**Observed:** the page is offered. At step 4 it shows its heading
"Publication: Publication Formats", "Current Submission Language:
English", "Status: Unscheduled" and then only this line, with no list:

```
You don't currently have access to that stage of the workflow.
```

At step 7 the same line follows "Status: Published" and "Warning: This
version has been published. Editing it may impact the published
content.". The request behind the list answers 200 with the refusal:

```
GET /index.php/publicknowledge/$$$call$$$/grid/catalog-entry/publication-format-grid/fetch-grid?submissionId=1&publicationId=1
{"status":false,"content":"You don't currently have access to that stage of the workflow.", …}
```

Control: `dbarnes`, the Press editor, who is not assigned to book 1,
opens it from the dashboard's "Active submissions" (or by the address
`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`),
and is offered the same page with "Catalog Entry" and "Permissions & Disclosure" beside it, and
gets the list with "Add publication format" and the columns "Name",
"Complete" and "Availability".

## Cause

In ui-library
`src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js`,
`getPublicationItemsEditorial()` pushes the `publicationFormats` item
with no gate. The version's pages are built whenever
`permissions.canAccessPublication` is true, which
`useWorkflowPermissions.js` sets for any editorial role, assistants
included, assigned in the book's current stage. A published book on
`main` is in the Done stage, and the submission's API data
(`submission/maps/Schema.php`) gives that stage every role the user
holds in any stage, so a Copyeditor counts as assigned there. The
production pages beside the item, `catalogEntry` and `license`, are
pushed only inside `if (permissions.canAccessProduction)`. That flag
is set inside the `canAccessPublication` branch and also needs an
editorial role assigned in Production.

The list is drawn by the legacy grid `PublicationFormatGridHandler`,
whose data provider (`PublicationFormatCategoryGridDataProvider`) is
bound to `WORKFLOW_STAGE_ID_PRODUCTION`. `GridHandler::authorize()`
adds the provider's policy for every grid operation: through
`SubmissionFilesCategoryGridDataProvider::getAuthorizationPolicy()`,
which hands off to `SubmissionFilesGridDataProvider`, that is
`WorkflowStageAccessPolicy` on the Production stage. The
Copyeditor and the Marketing and Sales Coordinator have stage 4 only,
the Funding Coordinator stages 1 to 3 (`registry/userGroups.xml`), so
`UserAccessibleWorkflowStagePolicy` denies with
`user.authorization.accessibleWorkflowStage`, and `GridWrapper.vue`
writes the refusal's `content` where the grid would go.

On 3.4 and 3.3 OMP's `templates/workflow/workflow.tpl` puts the
"Publication Formats" tab inside `{if $canAccessProduction}`, with
"Catalog Entry" and "Permissions & Disclosure". The new workflow
page's OMP menu was first written in `pkp/ui-library#428` from the OJS
one. It kept a `galleys` item from OJS inside the
`canAccessProduction` check, but pushed `publicationFormats` outside
it. Later the ui-library commit
[4a065766](https://github.com/pkp/ui-library/commit/4a065766d08868d218e9010f6c337903d1ae959d)
(`pkp/pkp-lib#10769`, "Permission logic improvements to be consistent
with 3.4") put the whole group behind `canAccessPublication` and left
the item as it was. The workflow
redesign's own notes (`pkp/pkp-lib#10761`) list "Publication Formats
(omp)" as "if user can access production stage".

Reach:

- the roles and stages the Summary lists: the Copyeditor walked, the
  Marketing and Sales Coordinator and the Funding Coordinator by code
  (the same menu and the same policy, no Production in their stages);
- any custom editorial group whose stages leave out Production,
  sub-editor groups included (code); the fix covers them, since
  `canAccessProduction` keys on an editorial role in Production;
- the Author is not affected: the author's menu
  (`getPublicationItemsAuthor()`) lists the page and every OMP author
  group has Production in its stages, so the list loads (walked:
  `aclark` on book 1);
- "Media", pushed right after this item, has the same missing gate
  ([U47 OMP2 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U47-OMP2-press-copyeditor-media-download-refused.md)),
  from a later change; no other ungated item of the OMP menu has a
  server rule bound to Production (code);
- OJS and OPS: no publication formats; their galleys item is already
  gated on `canAccessProduction`.

## Proposed fix

Gate the `publicationFormats` item of OMP's editorial menu on
`permissions.canAccessProduction`, as OJS and OPS gate their galleys
and as OMP 3.4 gated the tab
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyeditor-formats-page-no-list/fix.diff)):

```diff
-		items.push(
-			getPublicationItem({
-				publicationId,
-				name: 'publicationFormats',
-				label: t('submission.publicationFormats'),
-			}),
-		);
+		// The formats list is production material: its grid is authorized on the
+		// Production stage, as the galleys' page is on OJS and OPS.
+		if (permissions.canAccessProduction) {
+			items.push(
+				getPublicationItem({
+					publicationId,
+					name: 'publicationFormats',
+					label: t('submission.publicationFormats'),
+				}),
+			);
+		}
```

The item keeps its place, so the editorial roles with Production see
no change, and the author's menu stays as it is.

Tried on OMP `main`: with the fix, steps 3 and 6 list no "Publication
Formats". Typing the page's own address,
`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1&workflowMenuKey=publication_1_publicationFormats`
(book 5: `workflowSubmissionId=5&workflowMenuKey=publication_5_publicationFormats`),
opens the Copyediting stage (book 1) or "Title & Abstract" (book 5)
instead. The Press editor on
book 1, the author `aclark` on book 1 and the Layout Editor `gcox`,
assigned in Production on book 4, are still offered the page and get
the list, with the fix in and out.

**Alternatives:**

- Let these roles load the list read-only: the grid would need a
  second authorization path outside Production, and its file names
  link to downloads that the file policies refuse outside Production
  too; nothing in their tasks asks for it.
- Gate the grid's page in the workflow config instead of the menu: the
  menu would still offer an entry that leads to an empty page.

**What goes with it:**

- The "Media" item right below has the same missing gate, with its own
  report and fix (U47 OMP2). The two diffs touch neighbouring lines;
  the team may want to apply them together as one gated block.
- The guard: an e2e check that a press Copyeditor on a book in
  Copyediting is offered no "Publication Formats", while a Layout
  Editor in Production is (a **Planned** item in spec U73).
- Backport: `stable-3_5_0` needs the same condition, but fix.diff does
  not apply there as it stands. On 3.5,
  `getPublicationItemsEditorial({submission, permissions})` has no
  `publicationId`, and its items are pushed without one (the
  `publicationFormats` push is near line 183). The hand-port wraps that
  push in the same `if (permissions.canAccessProduction)`, without the
  `publicationId` line.

Small: one condition in one ui-library file, the check the menu
already uses for "Catalog Entry" and "Permissions & Disclosure", with
no server change and no stored data to repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyeditor-formats-page-no-list/walk.js)
  (helpers in `lib.js` beside it), on an install loaded from PKP's
  default test dataset (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL),
  reset before each walk:
  `node bin/probe.js omp shared/playwright/checks/issues/copyeditor-formats-page-no-list/walk.js`
  (`WALK=neighbour` runs the Layout Editor, author and editor checks
  alone).
- Fix trial: `node bin/try-fix.js apply …/fix.diff omp`, the walk and
  the neighbour check, then `revert` and the neighbour check again.
- Tips walked and read: OMP `main` `3b0ecf794c`, lib/pkp `3dc90c81a6`,
  ui-library `280f98c5`; OMP `stable-3_5_0` `9c5e24246c`, lib/pkp
  `cf3f984335`, ui-library `d4e01883` (walked: the Copyediting case
  shows; on book 5 `svogt` gets no "Publication" group, and its typed
  address opens no page).
- 3.4 and 3.3 (code): app `stable-3_4_0` `0aec65441` / `stable-3_3_0`
  `8e72fc883`, `templates/workflow/workflow.tpl` (the tab inside
  `{if $canAccessProduction}`); lib/pkp `767353f4fe` / `ac3fa73402`,
  `PKPWorkflowHandler` (`canAccessProduction` from an editorial role in
  the Production stage).
- Introduced: `git blame` of the `publicationFormats` push in
  `useWorkflowNavigationConfigOMP.js` gives 80daa02d4 (one line later
  reformatted by 68972cca8), the commit that created the file; the
  GitHub API names its PR. 80daa02d4 is on `stable-3_5_0`.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library issues and PRs
  searched by "publication formats" with copyeditor, assistant, menu
  and the refusal's text, and by `canAccessProduction` and
  `useWorkflowNavigationConfigOMP`; `pkp/pkp-lib#10761` is the
  redesign's closed tracking issue, not a report of this fault.
- Unverified: the Marketing and Sales Coordinator and the Funding
  Coordinator were not walked (the dataset has no user in those roles).
  MySQL not checked; nothing here depends on the database.
