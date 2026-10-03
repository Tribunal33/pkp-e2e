# A published book's Production stage says "using the links just above" with no links there, and shows it to the Author

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#412` (the new workflow page, `pkp/pkp-lib#7495`) · [f77229c3](https://github.com/pkp/ui-library/commit/f77229c3bf383292c840fe98c77dba66cac6402b) · 2024-09-19 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

Once a book is published, its Production stage shows a box headed
"Catalog Management": "The monograph has been approved. Please visit
Marketing and Publication to manage its catalog details, using the links
just above." Nothing stands above the box but the "Status" box:
"Marketing" and "Publication" are groups of the side menu on the left.

The book's Author gets the same box on their own Production stage,
although their side menu has no "Marketing" group and no "Catalog Entry"
page, and the Catalog page refuses them. While the book is in
Production and not yet published, the Author gets "Awaiting approval."
in the same way: a box written for editors, which says "click on the
Publication tab", a tab that no longer exists.

## Impact

- **Lost**: an editor's time, looking above the box for links that are
  not there; and the Author is given instructions meant for editors,
  which they cannot follow.
- **Who**: on a default press, everyone who opens the Production stage
  of a published book: the editors who open it from the editorial
  dashboard (Press manager, Press editor, an assigned Series editor or
  Layout Editor) and the book's authors.
- **Way round**: editors find "Marketing" and "Publication" in the side
  menu. Authors can ignore both boxes.

Low: wording that misleads while every task still gets done. It would be
medium if a reader following the box could lose work.

## Steps to reproduce

Preconditions: the default dataset, OMP `main`. Nothing else. Book 14,
"From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots",
is published, with `dbarnes` as its editor and `mdawson` as its author.
Book 4, "How Canadians Communicate: Contexts of Canadian Popular
Culture", is in Production and not published. Its author account is
`bbeaty`.

The editor:

1. Sign in as `dbarnes`.
2. Open book 14's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`).
3. In the side menu, under "Workflow", press "Production".
4. Read the box headed "Catalog Management" and what stands above it.

The author:

5. Sign out.
6. Sign in as `mdawson`.
7. Open book 14 from "My Submissions"
   (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=14`).
8. In the side menu press "Production", and read the boxes.
9. Type the Catalog page's address,
   `/index.php/publicknowledge/en/manageCatalog`.

Before publishing, the author:

10. Sign out.
11. Sign in as `bbeaty`.
12. Open book 4 from "My Submissions"
    (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=4`).
13. In the side menu press "Production", and read the box.

**Expected**: the editor's box tells them to look in the side menu. The
Author's Production stage shows neither "Catalog Management" nor
"Awaiting approval.", since nothing either box asks for can be done by
the Author.

**Observed**: in step 4 the main column reads, from the top, "Current
Submission Language: English", a box headed "Status" ("Submission
published.") and then:

```
Catalog Management
The monograph has been approved. Please visit Marketing and Publication to manage its catalog details, using the links just above.
```

There is no link or button in either box or between them. In step 8
the Author gets the same "Status" and "Catalog Management" boxes, word
for word. Their side menu has no "Marketing" group and no "Catalog
Entry". In step 9 the page says "The current role does not have access
to this operation." In step 13 `bbeaty` gets:

```
Awaiting approval.
The monograph will not be listed in the catalog until it has been published. To add this book to the catalog, click on the Publication tab.
```

## Cause

The two notices were written for the 3.4 workflow page. The new workflow
page carried them over unchanged into a different layout, and into the
Author's view.

In 3.4, OMP's editorial workflow page had three tabs at the top:
"Workflow", "Marketing" and "Publication". Its Production tab requested
`NOTIFICATION_TYPE_VISIT_CATALOG` and
`NOTIFICATION_TYPE_FORMAT_NEEDS_APPROVED_SUBMISSION`
(OMP `WorkflowTabHandler::getProductionNotificationOptions()`), so "the
links just above" were those tabs. The author dashboard never asked for
either notice: `AuthorDashboardTabHandler::_getNotificationRequestOptions()`
lists only decision and revision notices. pkp-lib creates both notices
with no user (`PKPApproveSubmissionNotificationManager::isVisibleToAllUsers()`
is true), so the screen that requests them decides who sees them.

On the new workflow page, `WorkflowNotificationDisplay.vue` requests
both notices for OMP's Production stage. Two things went wrong:

- **The wording.** The texts in OMP's
  [`locale/en/locale.po`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/locale/en/locale.po#L1315-L1328)
  still point at the old tabs ("using the links just above", "click on
  the Publication tab").
- **The Author's view.** OMP's views are built by merging OMP's
  configuration over OJS's (`useWorkflowConfigOMP.js`:
  `deepMerge(ConfigAuthorOJS, ConfigAuthorOMP)`, and the same for the
  editorial view). The editor's box comes from OJS's editorial
  Production entry, which OMP inherits. OMP's author configuration
  has its own Production entry,
  [`workflowConfigAuthorOMP.js`](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/pages/workflow/composables/useWorkflowConfig/workflowConfigAuthorOMP.js#L157-L173),
  which replaces OJS's and adds `WorkflowNotificationDisplay`.

The display reached authors with the new workflow page's first commit,
f77229c3, when one author configuration served all three apps, so
OJS authors got the journal's Production notices the same way (code).
[14c7d534](https://github.com/pkp/ui-library/commit/14c7d534390d774113f11fc2ed9f4f33643dc377)
(`pkp/ui-library#451`, for `pkp/pkp-lib#10618`, "Redesigned Workflow -
Notifications") removed the display from OJS's author Production entry
but kept it in OMP's own copy. That issue's notes say these two notices
are "fetched only on editorial workflow page", as in 3.4.

Reach:

- OMP, editorial view, Production stage: the wrong wording. Seen on
  screen, `main` and 3.5.
- OMP, Author's view, Production stage: "Catalog Management" on a
  published book, "Awaiting approval." on one not yet published. Seen
  on screen, `main` and 3.5.
- OJS and OPS today: no author Production notices (OJS's author entry
  has no display since 14c7d534, OPS's has none), and no Production
  notices at all on a preprint server (code).
- `notification.type.approveSubmission` ("…in the Catalog Entry tool…")
  also names an old screen, but no screen on `main` requests that
  notice (code).
- The notice staying after "Unpublish" is a different fault, see
  [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a6).

## Proposed fix

A proposal, in two parts.

**Hide both boxes from authors.** This is a visibility change, not a
rewording. Delete OMP's author Production entry, so the Author's view
inherits OJS's, which shows the stage's discussions and no notices.
This finishes what 14c7d534 did for OJS, and takes "Awaiting approval."
off the Author's view along with "Catalog Management". Excerpt from
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-management-notice-links-not-there/fix.diff):

```diff
 // lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigAuthorOMP.js
 	},
-	[pkp.const.WORKFLOW_STAGE_ID_PRODUCTION]: {
-		getPrimaryItems: ({submission, selectedStageId}) => {
-			const items = [];
-			items.push({
-				component: 'WorkflowNotificationDisplay',
-				props: {submission: submission, selectedStageId},
-			});
-			items.push({
-				component: 'DiscussionManager',
-				props: {submission, submissionStageId: selectedStageId},
-			});
-			return items;
-		},
-	},
 };
```

**Reword the two texts for editors**, in OMP's `locale/en/locale.po`.
"Side menu" holds for right-to-left languages, where "on the left" would
not:

```diff
 msgid "notification.type.formatNeedsApprovedSubmission"
-msgstr "The monograph will not be listed in the catalog until it has been published. To add this book to the catalog, click on the Publication tab."
+msgstr "The monograph will not be listed in the catalog until it has been published. To add this book to the catalog, visit Publication in the side menu."
 msgid "notification.type.visitCatalog"
-msgstr "The monograph has been approved. Please visit Marketing and Publication to manage its catalog details, using the links just above."
+msgstr "The monograph has been approved. Please visit Marketing and Publication in the side menu to manage its catalog details."
```

It was tried on OMP `main`. The Author's Production stage then showed
only "Status" and the discussions on book 14, and only the discussions
on book 4. The editor still got both boxes, with the new wording.

**Alternatives**:

- Keep OMP's entry and remove only the display from it: the same
  result, but it leaves a line-for-line copy of OJS's entry to drift.
- Filter the notices by role on the server: they are stored without a
  user, so the notification handler would need a role check it has
  nowhere else, for one screen.
- Make the box link to the pages: `WorkflowNotificationDisplay.vue`
  prints only a title and text. OMP's `getNotificationUrl()` builds a
  `manageCatalog` link that nothing shows, and wiring it in is a larger
  change to the component.
- Drop the "Catalog Management" notice: editors lose the hint that the
  book now belongs on the Catalog page.

**What goes with it**:

- No stored data changes and no API or hook is involved.
- The other locales keep their translations of the old texts until
  translators update them.
- 3.5 has the same entry and texts, so a backport is the same change.
- A test that an OMP author's Production stage shows neither box.

Medium: few lines, but in two repositories, ui-library and the OMP
locale, so two pull requests and a submodule update.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/catalog-management-notice-links-not-there/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-management-notice-links-not-there/walk.js)
  (helper in its `lib.js`). It takes Steps 1 to 13 on OMP loaded from the
  default dataset and records each Production stage's boxes, the links
  and buttons above them, and the side menu. `MODE=neighbour` runs the
  control alone: `dbarnes` on books 14 and 4, with and without the fix.
  Run with
  `PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-management-notice-links-not-there/walk.js`.
- Walked on `main` and `stable-3_5_0`, PostgreSQL, the default datasets
  of pkp/datasets 566bb1f (2026-10-03). The 3.5 side menu lists the
  publication pages under "Publication" without a version node, which
  changes no step. No request failed and no page script failed.
- Code read on `main`: `WorkflowNotificationDisplay.vue`,
  `useWorkflowConfigOMP.js`, `workflowConfigAuthorOMP.js`,
  `workflowConfigAuthorOJS.js`, `workflowConfigAuthorOPS.js`,
  `workflowConfigEditorialOJS.js` (the editor's display, with no role
  condition), `workflowConfigEditorialOMP.js` (no Production entry),
  `useWorkflowNavigationConfigOMP.js` (the "Marketing" group, editorial
  view only), pkp-lib `PKPApproveSubmissionNotificationManager`, OMP
  `ApproveSubmissionNotificationManager` and the English texts. 3.5: the
  same files at the 3.5 tips. 3.4 and 3.3: OMP `templates/workflow/workflow.tpl`
  (the three tabs), `controllers/tab/workflow/WorkflowTabHandler`,
  `pages/authorDashboard/AuthorDashboardHandler` and
  `templates/authorDashboard/authorDashboard.tpl`, and pkp-lib
  `controllers/tab/authorDashboard/AuthorDashboardTabHandler`. The
  Author's request options there never name either notice, and the
  English text is the same.
- The editor roles in Impact's "Who": walked as a Press editor
  (`dbarnes`). The Press manager, an assigned Series editor and an
  assigned Layout Editor were seen with the box in an earlier pass on
  the campaign's own data. The editorial display has no role condition
  (code).
- Introduced: `git blame` on the display lines in
  `workflowConfigAuthorOMP.js` reaches f77229c3 (`pkp/ui-library#412`,
  in `useWorkflowAuthorConfig.js`, then shared by the three apps).
  `pkp/ui-library#412` has no linked issue. Its follow-up commits name
  `pkp/pkp-lib#7495`. That OJS authors got notices at f77229c3 is read
  in the code, not walked.
- Upstream search (pkp-lib, omp, ui-library; the texts, "Catalog
  Management", `VISIT_CATALOG`, `WorkflowNotificationDisplay`,
  `workflowConfigAuthorOMP`): no match. `pkp/pkp-lib#10636` (closed) is
  about "Awaiting approval." not being created on 3.4, which is a
  different fault.
- Branch tips: main OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5). stable-3_5_0 OMP 9c5e24246c (lib/pkp cf3f984335, lib/ui-library
  d4e01883). stable-3_4_0 OMP 0aec65441 (lib/pkp 767353f4fe).
  stable-3_3_0 OMP 8e72fc883 (lib/pkp ac3fa73402).
- Not checked: the fix on 3.5. Whether every editorial role that sees
  the box can act on it (a Layout Editor, for one); the fix leaves the
  editorial view as it is.
