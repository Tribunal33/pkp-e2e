# An Author previewing their unpublished article, book or preprint is refused by "View submission"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS (code; OMP and OPS had no preview notice yet)
- **Introduced** `pkp/ojs#2892` for `pkp/pkp-lib#5565` · [af7cb99](https://github.com/pkp/ojs/commit/af7cb999ab229cc6a1cbe82469897a6f0ca22e6e) · 2020-10-29 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#13047` (open, no fix), which reports the symptom on OJS. This report adds OMP and OPS, the cause and a tried fix.
- **Tracked in** U13 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a5); the same refusal on a book's preview, in the [monograph landing page spec](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md) (Rule 5a)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An Author can open the preview of their own unpublished article, book or preprint, but only from its address. The notice on the preview reads "This is a preview and has not been published. View submission". When the Author presses "View submission", they get the access-denied page, "The current role does not have access to this operation.", instead of their submission. The Journal Manager and an assigned editor pressing the same link land on the submission's workflow.

Nothing is lost, and the Author still reaches the submission from "My Submissions". But the message suggests they have lost access to their own work.

No screen offers an Author the preview. They have its address only when an editor shares it with them or they type it themselves, so few Authors meet this.

## Impact

- **Lost**: nothing. The page does not tell the Author where to go instead.
- **Who**: any Author assigned to the submission, co-authors with an account included, who has the preview's address.
- **Way round**: "My Submissions", then "View" on the submission.

Low: the Author gets to their submission in one step another way. It would be medium if a screen offered Authors the preview, since every Author who used it would then meet the refusal.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`), OJS, OMP and OPS. Nothing to create.
- OJS: submission 5, "Genetic transformation of forest trees", in Production and never published. Its Author account is `ddiouf`.
- OMP: submission 4, "How Canadians Communicate: Contexts of Canadian Popular Culture", in Production and never published. Its Author account is `bbeaty`.
- OPS: submission 1, "The influence of lactation on the quantity and quality of cashmere production", in Production and never posted. Its Author account is `ccorino`.

Author (OJS shown; OMP: `bbeaty` and `/index.php/publicknowledge/catalog/book/4`; OPS: `ccorino` and `/index.php/publicknowledge/preprint/view/1`):

1. Sign in as `ddiouf`.
2. On "My Submissions", press "View" on "Genetic transformation of forest trees". The submission's workflow opens, with no "Preview" in its header.
3. Type the article's address, `/index.php/publicknowledge/article/view/5`. It works with or without the language part (`/en/`); the site adds it.
4. The article's page opens under the notice "This is a preview and has not been published. View submission". Press "View submission".

Control (editor):

1. Sign in as `dbarnes`.
2. Type the same address, and press "View submission".

**Expected**: the Author lands on their own view of the submission, the one "View" opened in step 2 (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=5`).

**Observed**: the link points at the editorial workflow for every reader, and the Author lands on the access-denied page:

```
View submission → /index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5
landed on       → /index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied
Home / The current role does not have access to this operation.
```

OMP and OPS behave the same, with `workflowSubmissionId=4` and `=1`. No request failed and no script error was raised.

Control: `dbarnes` follows the same link to the submission's workflow, on all three apps.

## Cause

The three apps' preview notice builds the "View submission" link for every reader as the editorial dashboard's workflow:

```smarty
{capture assign="submissionUrl"}{url page="dashboard" op="editorial" workflowSubmissionId=$article->getId()}{/capture}
{translate key="submission.viewingPreview" url=$submissionUrl}
```

This is in OJS `templates/frontend/objects/article_details.tpl` line 81 (80 on 3.5), OMP `templates/frontend/objects/monograph_full.tpl` line 81 and OPS `templates/frontend/objects/preprint_details.tpl` line 75. `PKPDashboardHandler` (lib/pkp `pages/dashboard/PKPDashboardHandler.php`, lines 96–109) opens `editorial` only to the site administrator, managers, section editors and assistants. The Author role gets `mySubmissions`.

The Author still gets the preview, by design. `Repo::submission()->canPreview()` (lib/pkp `classes/submission/Repository.php`, line 580) admits any user with an Author assignment on the submission. OJS 3.3's `IssueAction::allowedPrePublicationAccess()` already did this when the preview was added.

The code base already has the rule for "which workflow page this user opens for this submission": `Repo::submission()->getWorkflowUrlByUserRoles()` (same file, line 167). It sends a user with an Author assignment on the submission to `mySubmissions`, a reviewer to their review, and everyone else to `editorial`. The notifications and the submission's `urlWorkflow` in the REST API use it. The notice's link does not.

The link has refused Authors since the preview was added. [af7cb99](https://github.com/pkp/ojs/commit/af7cb999ab229cc6a1cbe82469897a6f0ca22e6e) (`pkp/pkp-lib#5565`, OJS 2020) pointed it at `workflow/access/{id}`. That handler checks `UserAccessibleWorkflowStageRequiredPolicy` with the editorial workflow type, which refuses an Author with "You don't currently have access to that stage of the workflow.". OMP and OPS took the same link in 2022 (`pkp/pkp-lib#5299`). The new dashboard (`pkp/pkp-lib#10670`, 2025) moved the link to `dashboard/editorial` and kept its editorial-only target.

Reach:

- The preview notice of the article, book and preprint pages: walked, on all three apps on `main` and 3.5.
- Discussion emails (code; not walked). The same mistake has a second home in other code. `SubmissionEmailVariable::getSubmissionUrl()` builds the `{$submissionUrl}` email variable as `dashboard/editorial?workflowSubmissionId=…` for every recipient. When someone adds a discussion, `EditorialTaskController::notifyParticipants()` mails each participant, and that participant can be the Author. The mail's footer, `emails.footer.unsubscribe.discussion`, reads `Reply to this comment at <a href="{$submissionUrl}">#{$submissionId} {$authorsShort}</a>`, so its link is that variable. So an Author who follows the footer's link is refused the same way. This fix does not cover it. `pkp/pkp-lib#12732` tracks it (open), with a fix for 3.5 in PR `pkp/pkp-lib#12740` (open).
- The other builders of `dashboard/editorial?workflowSubmissionId=…` are addressed to editorial roles (code):
  - the assignment notifications (editor, copyeditor, layout and indexing: `PKPNotificationManager`), the "approve submission" notification (`PKPApproveSubmissionNotificationManager`) and the copyediting and production status notifications (`PKPEditingProductionStatusNotificationManager`)
  - the Articles report
  - the old `workflow/access` address
- OMP's chapter pages have no preview notice (code: `chapter.tpl`).
- Some readers can open the preview but are refused this submission's workflow: a section editor or assistant not assigned to it, and an OJS Subscription Manager (`_roleCanPreview()`). The link sends them to `editorial` today, and so does `getWorkflowUrlByUserRoles()`. On a press, the link shows an unassigned series editor the Submissions list with an "Error" window over it. Whether these readers should see the link at all is outside this report, and the fix does not change what they get (code; not walked here).

## Proposed fix

Build the link with `getWorkflowUrlByUserRoles()` in each app's page handler, and print it in the template. The diffs are [fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-preview-view-submission-refused/fix-ojs.diff), [fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-preview-view-submission-refused/fix-omp.diff) and [fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-preview-view-submission-refused/fix-ops.diff). OJS shown:

```diff
--- a/pages/article/ArticleHandler.php   (ArticleHandler::view())
+++ b/pages/article/ArticleHandler.php
             'metricsByType' => $metricsByType,
+            // The preview notice's "View submission" link: the workflow page this user may open
+            'submissionWorkflowUrl' => $publication->getData('status') !== PKPPublication::STATUS_PUBLISHED
+                ? Repo::submission()->getWorkflowUrlByUserRoles($article)
+                : null,
         ]);
--- a/templates/frontend/objects/article_details.tpl
+++ b/templates/frontend/objects/article_details.tpl
-		{capture assign="submissionUrl"}{url page="dashboard" op="editorial" workflowSubmissionId=$article->getId()}{/capture}
-		{translate key="submission.viewingPreview" url=$submissionUrl}
+		{translate key="submission.viewingPreview" url=$submissionWorkflowUrl|escape}
```

OMP makes the same change in `CatalogBookHandler::book()` and `monograph_full.tpl`, and OPS in `PreprintHandler::view()` and `preprint_details.tpl`. The URL is computed only for an unpublished version.

The fix also moves a user who is both an Author on the submission and an editor or manager. Today the link sends them to `editorial`; with the fix they go to `mySubmissions`. This is how `getWorkflowUrlByUserRoles()` checks an Author assignment before any other role, the same rule the notifications already apply to that user.

The fix was tried on `main`, on all three apps. With the fix, the Author's "View submission" opened their submission on "My Submissions" (`dashboard/mySubmissions?workflowSubmissionId=5`, with the workflow open). `dbarnes` still landed on the editorial workflow, with the fix in and out.

**Alternatives**:

- Call `Repo::submission()->getWorkflowUrlByUserRoles()` inside the templates. That is one file per app, but it puts a repository lookup in a theme template, where the handlers otherwise assign the data.
- Let `dashboard/editorial?workflowSubmissionId=` redirect a user without an editorial role to `mySubmissions`. This would also cover themes that copy the old link, and the discussion emails' link. But it changes the access rules of a page that every editorial link points at. It could complement the fix, not replace it.
- Always link to `mySubmissions`: editors would then land on the wrong page.

**What goes with it**:

- No stored data to repair.
- A theme that overrides these templates keeps its own copy of the old link until it prints `submissionWorkflowUrl`. pkp's other themes were not read.
- Backport to 3.5: the diffs apply as written (`getWorkflowUrlByUserRoles()` there has no `$params`, which the fix does not pass).
- Backport to 3.4 and 3.3: the diffs do not apply as written, because the templates there link `{url page="workflow" op="access" path=…}` and the handlers differ. On 3.4 the call is the same, `Repo::submission()->getWorkflowUrlByUserRoles()`. On 3.3 it is `Services::get('submission')->getWorkflowUrlByUserRoles($article)`, in `pages/article/ArticleHandler.inc.php`.
- Guard: an end-to-end check in which the submission's Author presses "View submission" on the preview and lands on their submission.

Medium: each app needs only a few lines, but the change spans three app repositories, each with one handler and one template, and theme authors need a note.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-preview-view-submission-refused/walk.js), on an install freshly loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-preview-view-submission-refused/walk.js`. It types the address without `/en/`; `NOLOC=0` in front types it with `/en/`. Both forms were walked on `main`.
- Fix tried: `node bin/try-fix.js apply shared/playwright/checks/issues/author-preview-view-submission-refused/fix-<app>.diff <app>` for each app, then the walk.
- Tips walked or read:
  - `main`: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73) (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc)), OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794c) and OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7) (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)).
  - 3.5: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00d), OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd) (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62)).
  - 3.4: OJS [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7), OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441f), OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b) (pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d)).
  - 3.3: OJS [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a), OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc8836), OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161) (pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)).
  - Dataset: pkp/datasets 38ab955 (2026-09-30), PostgreSQL. The fault does not depend on the database.
- 3.4 (code): all three apps' page handlers call `Repository::canPreview()`, which admits the Author in Copyediting and Production. All three templates link `workflow/access`.
- 3.3 (code): `IssueAction::allowedPrePublicationAccess()` admits the Author from Copyediting on, and OJS's template links `workflow/access` (`PKPWorkflowHandler.inc.php`, the same policy). OMP's `monograph_full.tpl` and OPS's `preprint_details.tpl` have no preview notice there, since the preview reached those apps in 2022.
- Introduced:
  - `git blame` on the three template lines gives the 2025 retargets for `pkp/pkp-lib#10670`, by Jarda Kotěšovec (jardakotesovec): OJS [b065b61](https://github.com/pkp/ojs/commit/b065b61a94fad1aea0c52bcef06f750a785de19b) (`pkp/ojs#4583`), OMP [57b0965](https://github.com/pkp/omp/commit/57b0965dc35f7d4fec16f04b59ef6b09f7aaf21a) (`pkp/omp#1804`) and OPS [5f7424f](https://github.com/pkp/ops/commit/5f7424f9e7bece64fe22c3301592064fb62fb022).
  - `git log -S submission.viewingPreview` gives the line's origin: OJS af7cb99 (`pkp/ojs#2892`, merged 2020-11-03); OMP [2004cab](https://github.com/pkp/omp/commit/2004cab1d5b55cb524c9236359ef7e1646a4b3c5) and OPS [fa646e5](https://github.com/pkp/ops/commit/fa646e5cf78a7c66dd4aa7252e70c3e332e915eb) (ajnyga, 2022-11-24/25, `pkp/pkp-lib#5299`; no PR found for those commits).
- Upstream: `pkp/pkp-lib#13047` was raised while testing `pkp/pkp-lib#12987`.
- Not walked: 3.4 and 3.3; the discussion email; the unassigned section editor, assistant and Subscription Manager.
