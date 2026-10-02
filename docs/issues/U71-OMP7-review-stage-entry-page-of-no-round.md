# Pressing "Review" in the workflow's side menu opens a page with no round: wrong status, no reviewers, "Add Reviewer" refused

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the "Review" tab opens on its latest round)
  - 3.3: none (code; the "Review" tab opens on its latest round)
- **Introduced** `pkp/ui-library#622` for `pkp/pkp-lib#9890` · [bd0d6897](https://github.com/pkp/ui-library/commit/bd0d6897727a4377575fac99ee9b238f9d4a5ae0) · 2025-05-19 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U71 [OMP7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U71-internal-review-stage.md#omp7), spec U24 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Pressing the stage's name in the workflow's side menu opens a review
page with no round selected, and in the author's view the page's
script fails in the browser. The stage's name is the line the review
rounds are listed under: "Review" on a journal, "Internal Review" or
"External Review" on a press.

The editor sees a "Status" box reading "The submission has been
advanced to the next round of review" while Round 1 is the only round
and still active. There are no decision buttons, "Reviewers" reads "No
Items" although reviewers are assigned, and "Add Reviewer" opens a
window reading only "Invalid review round.".

The author sees the heading change to "Workflow: Review" over the
round's page, which stays as it was; after a reload the heading stands
over an empty page.

The page opens only when someone presses the stage's name; the app
never opens it by itself. It does so for every submission with a
review round, and has since 3.5.0, the first release with this menu.

## Impact

- **Lost**: nothing stored is lost. Nothing on the page says that it
  shows no round.
- **Who**: any editor or author who presses the stage's name, which
  looks as pressable as the rounds under it. The workflow's first
  page, the dashboard and the links in emails and tasks never lead
  there.
- **Way round**: press "Review Round 1" (or the round wanted), one line
  below. The address records the stage's line as the selected one, so
  a reload or a copied link opens the same page until a round is
  pressed.

Medium: the page shows a wrong status and an empty reviewer list for
an active round and says nothing, on every install; it stays at medium
because it takes a deliberate press and the round is one line below.
It would be high if the round could not be reached.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  Nothing else is needed.

As the editor:

1. Sign in as `dbarnes` and open submission 12, "Sodium butyrate
   improves growth performance of weaned piglets during the first
   period after weaning", with "View" on the dashboard. The workflow
   opens on "Workflow: Review (Round 1)" with "Round 1 Status" /
   "Awaiting responses from reviewers.", five decision buttons and two
   reviewers.
2. In the side menu press "Review", the line above "Review Round 1".
3. In "Reviewers" press "Add Reviewer".

As the author:

4. Sign in as `lchristopher` and open submission 12 from "My
   Submissions".
5. In the side menu press "Review".
6. Reload the page.

[On a press, OMP `main`: `dbarnes` is the press editor and is assigned
to neither monograph, so he opens them from the dashboard's "Active
submissions" view. Submission 17, "Open Development: Networked
Innovations in International Development", author `msmith`, line
"Internal Review"; or submission 2, "The West and Beyond: New
Perspectives on an Imagined Region", author `afinkel`, line "External
Review". All six steps hold there.]

**Expected**: the line only folds and unfolds its rounds, as the
"Workflow" and "Publication" lines above it do, and the round's page
stays as it is; nothing is logged in the browser's console.

**Observed**: after step 2 the heading reads "Workflow: Review"
("Workflow: Internal Review" / "Workflow: External Review" on a press)
and the address carries `workflowMenuKey=workflow_3` (`workflow_2` for
Internal Review). The page shows "Status" / "The submission has been
advanced to the next round of review", no decision buttons, and
"Reviewers" with "No Items". On a press's "Internal Review" the
right-hand column is empty as well. On OJS `main`, and only there, the
editor's console logs:

```
TypeError: Cannot read properties of null (reading 'authorResponse')
```

After step 3 the window "Add Reviewer" reads only "Invalid review
round."; the request behind it is

```
GET …/$$$call$$$/grid/users/reviewer/reviewer-grid/show-reviewer-form?selectionType=1&submissionId=12&stageId=3&reviewRoundId=undefined  → 200
```

After step 5 the heading reads "Workflow: Review" over the round's own
page, unchanged ("Round 1 Status" / "Awaiting responses from
reviewers." and its panels). After step 6 the heading stands over an
empty page. Both times the console logs (once in step 5, twice in
step 6), on both apps:

```
TypeError: Cannot read properties of null (reading 'id')
    at Object.getPrimaryItems
```

Control: on submission 4, "Computer Skill Requirements for New and
Existing Teachers: Implications for Policy and Practice", which has no
review round, "Review" opens "Status" / "The Review stage has not yet
been initiated." for the editor and the author, with nothing logged.

## Cause

`getWorkflowItem()` in
`lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOJS.js`
(line 30; OMP's menu builder calls the same function) gives every stage
item a `state` of `{primaryMenuItem: 'workflow', stageId, title}`.
`useSideMenu()` gives any item with a `state` a command that selects
it. So a review stage's item is a page of its own even when it holds
rounds, and its state names a stage but no round.

The workflow page then runs with `selectedReviewRound` null
(`workflowStore.js`, line 60), and the review stage's configuration is
written for a round:

- Author view: `workflowConfigAuthorOJS.js` line 165 and
  `workflowConfigAuthorOMP.js` line 75 read `selectedReviewRound.id`,
  so `getPrimaryItems()` throws. Vue keeps a computed's last value
  when its getter throws: the round's panels stay under the new
  heading, and after a reload there is no last value, hence the empty
  page.
- Editorial view, Review and External Review:
  `workflowConfigEditorialOJS.js` passes `reviewRoundId: undefined` to
  the file lists and to `ReviewerManager` (hence "No Items" and
  `reviewRoundId=undefined` in the "Add Reviewer" request), and its
  `getActionItems()` returns `[]` without a round.
- Editorial view, Internal Review: `workflowConfigEditorialOMP.js`
  (from line 202) does the same, and its `getSecondaryItems()` (line
  250) returns `[]` without a round, which is the empty right-hand
  column.
- The `authorResponse` error: the OJS configuration also pushes
  `AuthorResponseRequestManager` with `reviewRound: null`, and
  `useReviewRoundAuthorResponseConfig.js` line 28 reads
  `reviewRound.value.authorResponse`. Only `WorkflowPageOJS.vue`
  registers that component, so a press's editor logs nothing, and it
  is not on 3.5.
- The status: `WorkflowSubmissionStatus.vue` gets
  `selectedReviewRoundId` undefined, which its prop default turns into
  null, and `null < currentReviewRound.id` is true. Line 99 then
  prints the past round's sentence; line 74 does the same for a stage
  the submission has left.

The item was not always selectable. Until the change named above,
`getWorkflowItem()` took an `isDisabled` argument and gave the item no
action when the stage had rounds (`action: isDisabled ? undefined :
'selectMenu'`). That change replaced `action`/`actionArgs` with `state`
across the menu and dropped the condition. OMP's builder still passes
`isDisabled: internalReviewItems.length`, which nothing reads now.

Nothing in the app sends a person to the item. For a submission in
review `getInitialSelectionItemKey()` returns the current round's key.
Every address pkp-lib builds for a workflow carries
`workflowSubmissionId` alone, except the author-response email's
(`ReviewRoundAuthorResponse`), which names the round. The decision
page's return address drops `workflowMenuKey`
(`useWorkflowDecisions.js`), and the only `navigateToMenu()` callers go
to publication pages.

Reach:

- Journal "Review", press "Internal Review" and "External Review",
  editorial and author view (on screen, `main` and 3.5: the Steps).
- A submission that has left the review stage (on screen, `main`: OJS
  submission 3 and OMP submission 1, both in Copyediting, opened at
  `…/dashboard/editorial?workflowSubmissionId=3&workflowMenuKey=workflow_3`,
  then the line pressed): the same page with "The submission advanced
  to the next review round, was accepted, and is currently in the
  Copyediting stage." and "No Items" under "Reviewers".
- A group's key in the address (on screen, OJS `main`:
  `…/dashboard/editorial?workflowSubmissionId=12&workflowMenuKey=publication`):
  a workflow with no heading and no content, because
  `setActiveItemKey()` accepts any key the menu holds.
- A review stage without a round is not affected: its item is the
  "has not yet been initiated" page (on screen: the control).

## Proposed fix

Make a review stage's item a group when it has rounds, and let the
menu refuse to select a group. Development builds had the first half
until the change named above; no release has had it. Proposed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-stage-entry-page-of-no-round/fix.diff)):

```diff
--- a/lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOJS.js
+++ b/lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOJS.js
@@ -28,17 +28,25 @@
 export function getWorkflowItem({stageId, label, isActive, items}) {
-	return {
+	const item = {
 		key: `workflow_${stageId}`,
 		label: label,
 		colorStripe: isActive ? StageColors[stageId] : null,
-		state: {
+		items,
+	};
+
+	// A review stage that has rounds only groups them, as a version node groups
+	// its pages: every page of the stage belongs to a round. Without rounds the
+	// stage entry is the page that says the stage has not started.
+	if (!items?.length) {
+		item.state = {
 			primaryMenuItem: 'workflow',
 			stageId: stageId,
 			title: getWorkflowTitle(label),
-		},
-		items,
-	};
+		};
+	}
+
+	return item;
 }
--- a/lib/ui-library/src/composables/useSideMenu.js
+++ b/lib/ui-library/src/composables/useSideMenu.js
@@ -155,10 +155,16 @@
 	function setActiveItemKey(key = '') {
-		if (!findItemByKey(items.value, key)) {
+		const item = findItemByKey(items.value, key);
+		if (!item) {
 			return false;
 		}
 
+		// An item that only groups other items is not a page of its own
+		if (item.items?.length && !item.state && !item.link && !item.action) {
+			return false;
+		}
+
 		activeItemKey.value = key;
```

The first change belongs in the menu builder, which decides what is a
page; both apps' builders go through `getWorkflowItem()`. It follows
the menu's own pattern: the "Workflow" and "Publication" items and the
version nodes (`publication_{id}`) carry `items` and no `state`, and
only fold.

The second change covers the address. `useWorkflowMenu()` already
falls back to the submission's first page when `navigateToMenu()`
returns false, so an old `workflowMenuKey=workflow_3` link, or a
group's key, opens the page the workflow would open by itself.

Tried on `main`, OJS and OMP (the two files are identical in both
apps' ui-library). With it, pressing the line folds and unfolds the
rounds, and the round's page, heading and address stay; "Add Reviewer"
opens the reviewer search; the author's reload opens "Workflow: Review
(Round 1)"; nothing is logged.

The nearby cases were checked with the fix in and out:

- A stage without a round (OJS submission 4, OMP submission 16's
  "Internal Review"; editor and author) opens its "has not yet been
  initiated" page either way.
- A round's line and a round's address (`workflow_3_{round}`, the form
  the author-response email writes; OJS 12, OMP 17) open the round
  either way.
- With the fix in, the stage's key in the address of a submission in
  Copyediting (OJS 3, OMP 1) opens "Workflow: Copyediting", and
  `workflowMenuKey=publication` (OJS 12) opens the round.

**Alternatives**

- Open the current round when the line is pressed. The stage's line
  would then select the same page as the round's line, so the menu
  would have to highlight both or move the highlight to the round.
- Guard each reader of `selectedReviewRound` (`?.id`, a null check in
  the status box): it stops the script error and leaves a page with no
  round, no buttons and no reviewers. `pkp/pkp-lib#10933` took that
  route for a stage that has not started, where a page without a round
  is the right page.

**What goes with it**

- The `isDisabled` argument OMP's builder still passes can go.
- `useSideMenu.mdx` gets a line saying that an item with `items` and
  no `state`, `link` or `action` cannot be made active. The other
  users of `useSideMenu()` are `SideNav.vue`, whose items all carry a
  `link`, and the stories; none changes (code).
- Backport: the two functions are the same on `stable-3_5_0`, and the
  diff applies there as written (`patch --dry-run`).
- Guard: a `useSideMenu.test.js` case for the group rule, beside the
  composables' other unit tests (there is none for `useSideMenu` yet),
  and an e2e step that presses the stage's line on a submission in
  review, as editor and as author, and expects the round's page and a
  clean console.

Small: a few lines in two ui-library files, and two short tests.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-stage-entry-page-of-no-round/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps on OJS
  (submission 12) and OMP (submissions 17 and 2); `MODE=nb` takes the
  nearby cases alone. It opens each workflow at the address the
  dashboard's "View" opens
  (`…/dashboard/editorial?workflowSubmissionId=12`, `mySubmissions`
  for an author). Run on pkp-e2e's dataset fleet:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/review-stage-entry-page-of-no-round/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front for 3.5).
- Walked on `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6, ui-library 280f98c5).
  Walked on `stable-3_5_0`: OJS 091fb65453 and OMP 9c5e24246 (lib/pkp
  cf3f984335, ui-library d4e01883). Dataset: pkp/datasets e8dafbc
  (2026-10-02), PostgreSQL. No request failed in any walk.
- The errors are logged through Vue's error handler, not thrown as
  uncaught page errors. Apart from the `authorResponse` error,
  Observed is the same on both lines.
- Code reads. 3.5 (`checkouts/stable-3_5_0/{ojs,omp}/lib/ui-library`):
  `getWorkflowItem()`, `setActiveItemKey()` and the two author
  configurations' `selectedReviewRound.id` are as on `main`; the
  introducing change is there as
  [74c46d75](https://github.com/pkp/ui-library/commit/74c46d753f1a671a22649e2cf27db2e8d0789396),
  tagged from 3_5_0-0 on. 3.4 and 3.3 (ui-library `stable-3_4_0`
  ee684b34, `stable-3_3_0` 96959f9e; pkp-lib `stable-3_4_0`): no
  `src/pages/workflow`, no side menu; the workflow's "Review" tab
  (`templates/workflow/review.tpl`) lists one tab per round and
  selects the latest.
- How a person gets there: `getInitialSelectionItemKey()` in both
  apps' menu builders, and every `workflowSubmissionId` and
  `workflowMenuKey` writer in pkp-lib's `classes/`, `pages/` and
  `api/`, the apps' `classes/` and `pages/`, and ui-library's `src/`.
- Introduced: `git blame` on `getWorkflowItem()` names bd0d6897 for
  the signature and the `state:` line. Its parent has
  `action: isDisabled ? undefined : 'selectMenu'`, there since 80daa02d
  (2024-10-16), and the first workflow menu (f77229c3, 2024-09-19) gave
  the review item an action only when it had no rounds. The kind is
  regression against that development code and against 3.4's tab.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library;
  issues and PRs, open and closed): by the menu, stage, round and
  status words, "Invalid review round", `workflowMenuKey`,
  `selectedReviewRound`, `getWorkflowItem`, `getPrimaryItems`,
  `setActiveItemKey`. Read and set aside: `pkp/pkp-lib#10933` (an OMP
  author pressing "External Review" on a stage not yet started; closed
  with a fix in February 2025, before the item with rounds became
  selectable), `pkp/pkp-lib#10771` (the address keys), `pkp/pkp-lib#10643`
  (the status sentences).
- Unverified, none of it driven: whether a file uploaded from the
  no-round page's "Revisions Uploaded" or "Files for Review" is
  accepted, and where it is filed; whether "Files for Review" there
  lists every round's files (its request carries no round). On OJS
  `main` the stage's key in the address of submission 3 also logged
  one `TypeError: Cannot read properties of null (reading
  'publicationId')`, whose line was not traced.
