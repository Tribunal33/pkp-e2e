# An author previewing their unpublished article, book or preprint gets "access denied" from "View submission"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS (code; OMP and OPS have no preview)
- **Introduced** `pkp/ojs#2892` for `pkp/pkp-lib#5565` · [af7cb999ab](https://github.com/pkp/ojs/commit/af7cb999ab229cc6a1cbe82469897a6f0ca22e6e) · 2020-10-29 · Vitaliy Bezsheiko (Vitaliy-1); copied to OMP and OPS by `pkp/pkp-lib#5299` (ajnyga, 2022)
- **Upstream** `pkp/pkp-lib#13047` (open, no PR): the same fault, reported on OJS; this report adds OMP and OPS, steps on the default dataset, the cause and a tried fix
- **Tracked in** spec U13 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a5); spec U69 Rule 5a ([U69](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md), the book's Author)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author who opens the page of their own article, book or preprint
before it is published sees it under "This is a preview and has not
been published. View submission". Pressing "View submission" opens a
page reading "The current role does not have access to this
operation." instead of their submission.

The author reaches the submission from "My Submissions" instead.
Editors and managers pressing the same link land on the submission's
workflow.

## Impact

- **Lost.** Nothing. The author meets an access-denied message on a
  link offered to them, and is not told where their submission is.
- **Who.** The submission's author, on the preview page of an
  unpublished article, book or preprint. Their workflow offers no
  "Preview", so they come to the page only by its address, typed or
  shared with them by an editor.
- **Way round.** "My Submissions" on the dashboard opens the same
  submission.

Low: a dead link on a page authors seldom reach, with the submission
one menu away. A screen or email that sent authors to the preview would
raise it.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, freshly loaded.
- Journal (OJS): submission 5, "Genetic transformation of forest
  trees", is in Production and has never been published; its author
  account is `ddiouf`.
- Nothing is created.

1. Sign in as `ddiouf`.
2. Type the article's address,
   `/index.php/publicknowledge/en/article/view/5`. The article's page
   opens under "This is a preview and has not been published. View
   submission".
3. Press "View submission".

Press (OMP): the same as `bbeaty`, at
`/index.php/publicknowledge/en/catalog/book/4` (submission 4, "How
Canadians Communicate: Contexts of Canadian Popular Culture", in
Production). Preprint server (OPS): the same as `ccorino`, at
`/index.php/publicknowledge/en/preprint/view/1` (submission 1, "The
influence of lactation on the quantity and quality of cashmere
production", in Production). The steps are the same on
`stable-3_5_0`.

**Expected:** the submission opens as it does from the author's "My
Submissions", at
`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=5`.

**Observed:** on all three, "View submission" links to
`…/en/dashboard/editorial?workflowSubmissionId=5` (on the press and the
server, the book's and the preprint's numbers, 4 and 1) and lands on
`…/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
which reads, under the site's header and "Home /":

```
The current role does not have access to this operation.
```

No request failed and the browser logged no error. Signed in as
`dbarnes` (the editor, or on OPS a manager), the same steps open the
submission's workflow at `…/en/dashboard/editorial?workflowSubmissionId=5`.

## Cause

The preview notice builds its link in each app's page template, always
to the editorial dashboard:

```smarty
{capture assign="submissionUrl"}{url page="dashboard" op="editorial" workflowSubmissionId=$article->getId()}{/capture}
{translate key="submission.viewingPreview" url=$submissionUrl}
```

OJS [`article_details.tpl`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/objects/article_details.tpl#L78-L83),
OMP [`monograph_full.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/monograph_full.tpl#L78-L84)
and OPS [`preprint_details.tpl`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/templates/frontend/objects/preprint_details.tpl#L71-L79)
carry the same two lines.

That page is open only to the site administrator, managers, section
editors and assistants:
[`PKPDashboardHandler::__construct()`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/pages/dashboard/PKPDashboardHandler.php#L96-L109)
gives authors `mySubmissions` alone.

The preview itself is open to the submission's author on purpose.
[`Repository::canPreview()`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/submission/Repository.php#L580-L603)
grants it to anyone with an author stage assignment, and the page
handlers serve the preview under that check: OJS
`ArticleHandler::initialize()`, OMP `CatalogBookHandler::book()`, OPS
`PreprintHandler::initialize()`. On `main` the check has no stage limit
since `pkp/pkp-lib#12245` (2026), so an author reaches the preview at
any stage once the submission is submitted; on 3.5 and 3.4 only in
copyediting and production. So the notice offers every viewer a link
only the editorial roles can follow.

The link has pointed at the editorial side since the notice was added.
OJS got it with its preview in 2020 (the commit in Introduced), as
`workflow/access/{id}`, a route that admits only the editorial
workflow's roles. Authors could already open their unpublished article
then. OMP and OPS copied the notice in 2022
([2004cab1d5](https://github.com/pkp/omp/commit/2004cab1d5b55cb524c9236359ef7e1646a4b3c5),
[fa646e5cf7](https://github.com/pkp/ops/commit/fa646e5cf78a7c66dd4aa7252e70c3e332e915eb)).
In 2025 the new dashboard (`pkp/pkp-lib#10670`; `pkp/ojs#4583`,
`pkp/omp#1804` and the OPS commit
[5f7424f9e7](https://github.com/pkp/ops/commit/5f7424f9e7bece64fe22c3301592064fb62fb022))
changed the address to `dashboard/editorial`, still editorial-only.

pkp-lib already has the rule the link needs:
[`Repository::getWorkflowUrlByUserRoles()`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/submission/Repository.php#L166-L268)
sends a submission's author to `dashboard/mySubmissions`, a reviewer to
the review page and everyone else to `dashboard/editorial`. The
notifications and the submission schema's `urlWorkflow` use it; the
three templates do not.

The same fault elsewhere, each read in the code:

- A book's chapter pages, opened before the book is published, carry no
  preview notice, so no such link.
- On a journal, a Subscription Manager may open the preview
  (`_roleCanPreview()`), and the editorial dashboard refuses that role
  too. The role-based URL sends them to the editorial dashboard as
  well, so the fix below does not cover them. Not walked: the dataset
  has no Subscription Manager.
- A series editor or assistant not assigned to a book gets the
  Submissions page behind an "Error" window instead. That refusal comes
  from inside the editorial dashboard, where they have no assignment to
  the book. It is not this link's target, and the fix leaves it as it
  is.
- The other `dashboard/editorial` links (the editors' assignment
  notifications, OJS's table of contents grid and its articles report)
  sit on screens only editorial roles reach.

## Proposed fix

First a product question, which the team decides:
`pkp/pkp-lib#13047` asks whether authors should reach the preview at
all. If they should not, the fix is in `canPreview()`, and the link no
longer matters to them. If they should, the link must follow the role.

Recommended: keep the author's access and fix the link. The access is
deliberate and recent: authors have been able to open their
unpublished article since before the preview existed, and
`pkp/pkp-lib#12245` widened it on `main` to every stage. An author
checking how their work will look is the use it serves.

The fix: each app's page handler passes the role-based workflow URL to
the template, and the notice uses it. That is one handler and one
template per app, in three repositories
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-view-submission-access-denied/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-view-submission-access-denied/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-view-submission-access-denied/fix-ops.diff)).
In OJS, `ArticleHandler::view()` adds to its template variables:

```php
// The preview notice's "View submission": the workflow this user's role opens
'submissionWorkflowUrl' => $publication->getData('status') !== PKPPublication::STATUS_PUBLISHED
    ? Repo::submission()->getWorkflowUrlByUserRoles($article)
    : null,
```

and `article_details.tpl` replaces its two lines with:

```smarty
{translate key="submission.viewingPreview" url=$submissionWorkflowUrl|escape}
```

OMP does the same in `CatalogBookHandler::book()` and
`monograph_full.tpl`, OPS in `PreprintHandler::view()` (with
`PKPSubmission::STATUS_PUBLISHED`, which it already imports) and
`preprint_details.tpl`.

Tried on `main` on all three apps: the author's "View submission" now
opens the submission on "My Submissions"
(`…/en/dashboard/mySubmissions?workflowSubmissionId=5`, and 4 and 1 on
the press and the server). A check that the fix reaches no further, run
with the fix in and out: `dbarnes`'s link still opens the editorial
workflow.

The rule (which workflow a user's role opens) already lives in
`getWorkflowUrlByUserRoles()`, and the fix makes the notice its caller
as the notifications are. The URL is worked out only for a preview, so
published pages make no extra queries. A user who is both a manager and
the submission's author is sent to "My Submissions", as their
notifications already do.

**Alternatives:**

- Taking authors' preview access away (`canPreview()`): the team's
  call, above; it removes a view `pkp/pkp-lib#12245` just widened.
- Hiding "View submission" from authors would leave them a notice with
  no way back to their submission.
- Having `dashboard/editorial` forward an author to `mySubmissions`
  would cover any stale link, but it bends a role-scoped page to repair
  one wrong link, and the URL builder already exists.
- A role test inside the templates would repeat in Smarty the rule
  pkp-lib already owns.

**What goes with it:**

- Themes that override these templates keep their own copy of the old
  link until they adopt `$submissionWorkflowUrl`.
- No stored data changes; no API or hook changes.
- A backport: the diffs apply to 3.5 as written. 3.4 and 3.3 need the
  same change against their own link and helper.
- The guard: an e2e scenario where the author's "View submission" opens
  their submission and the editor's still opens the editorial workflow.

Medium: a few lines following an existing helper, but in a handler and
a template in each of three app repositories, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-view-submission-access-denied/walk.js)
  takes the Steps as each app's author, then the same as `dbarnes` (the
  check that the fix reaches no further), on an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-view-submission-access-denied/walk.js`.
  The fix was tried with
  `node bin/try-fix.js apply …/fix-<app>.diff <app>`, the same script,
  then `revert`.
- Walked on `main` and `stable-3_5_0` (OJS, OMP, OPS), PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets fetched
  at 38ab955 (2026-09-30).
- Tips: `main` OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 92b9a16b48,
  OMP 3081c9b00, OPS cf4fce69bd (lib/pkp a9c76aed62); `stable-3_4_0`
  OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b (lib/pkp df13621c2d);
  `stable-3_3_0` OJS 9fdb9bcf9a (lib/pkp d446601ebe).
- Code reads: 3.5, the three templates (the same `dashboard/editorial`
  link), `canPreview()` (copyediting and production only) and
  `getWorkflowUrlByUserRoles()` (author to `mySubmissions`). 3.4, the
  three templates link to `workflow/access/{id}`, which
  `PKPWorkflowHandler::authorize()` guards with
  `UserAccessibleWorkflowStageRequiredPolicy` for the editorial
  workflow, whose roles leave out the author, while `canPreview()` lets
  the author in during copyediting and production;
  `getWorkflowUrlByUserRoles()` sends authors to `authorDashboard`.
  3.3, OJS `article_details.tpl` links to `workflow/access`, guarded the
  same way, and `IssueAction::allowedPrePublicationAccess()` lets the
  author in from copyediting on; the helper is
  `PKPSubmissionService::getWorkflowUrlByUserRoles()`. OMP and OPS on
  3.3: their book and preprint templates have no preview notice.
  `main`: `canPreview()` lost its stage limit in 768b0a3991
  (`pkp/pkp-lib#12245`, "Allow previewing of submissions in earlier
  stages of workflow").
- Introduced: `git blame` on the link line, then the line at the
  blamed commit's parent (the Cause names each step).
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  by "View submission" preview author, preview "does not have access",
  `viewingPreview`: `pkp/pkp-lib#13047` only (milestone 3.6).
- Not driven: 3.4 and 3.3; a Subscription Manager's preview; an
  unassigned series editor's preview of a book.
