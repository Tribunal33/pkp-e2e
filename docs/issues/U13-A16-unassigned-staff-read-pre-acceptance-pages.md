# Section editors and assistants not assigned to a submission open its article or book landing page before acceptance

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Security** unreleased
- **Affects**
  - main: OJS, OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12247` for `pkp/pkp-lib#12245` · [768b0a3991](https://github.com/pkp/pkp-lib/commit/768b0a3991bf7d8542a492a2adb47501e4993ae4) · 2026-02-18 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U13 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a16), spec U69 [A27](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a27)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal, some staff can read a submission they are not assigned
to on its article landing page. This applies to a Section Editor, a
Subscription Manager and the assistant roles (Copyeditor, Layout
Editor, Proofreader and the like). They type the page's address,
`article/view/<n>` with the submission's ID, and see its title,
abstract, authors and affiliations. This works while the submission is
still in the Submission or Review stage, and after it was declined.

On a press, a Series editor and the assistant roles do the same on the
book landing page, `catalog/book/<n>`. Their dashboard does not list
the submission and its workflow refuses them. The page should answer
"404 Not Found" to them until the submission reaches copyediting.

A staff member who also reviews the submission double-anonymously sees
on that page the authors' names the review screens hide. On a journal,
once an editor ticks "Make available with publication" on the
version's "JATS XML", the page's "JATS XML" link downloads the XML,
author names included, for the same staff. Nothing can be changed
through the page.

The change behind it (`pkp/pkp-lib#12245`, the workflow for versions
published while still under review) lets submissions be previewed
before copyediting. The proposed fix keeps that for managers and for
everyone assigned to the submission. It closes the page before
copyediting only to staff who are not assigned.

## Impact

- **Lost**: no data. Nobody is told when the page is opened.
- **Who**: holders of those roles, on any submission past "Submit".
  The ID is in the address of every workflow and review screen, so no
  searching is needed.
- **Way round**: none on screen. Against the double-anonymous leak, a
  journal or press can only stop inviting staff-role holders as
  reviewers.

Medium: only the context's own staff, and only by typing an address. A
link to the page on any screen these roles see would make it high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  else. In it `minoue` (Section editor) is assigned to submissions 2, 9
  and 19 only, `gcox` (Layout Editor) to 5, 6 and 17 only, and
  `cturner` (Proofreader on 5 and 17) is invited to review submission
  20, whose review is double-anonymous.
- For steps 12 to 15, the dataset for OMP `main`. In it `minoue`
  (Series editor) is assigned to book 6 only, `mfritz` (Copyeditor) to
  4, 7 and 14, and `cturner` (Proofreader) is invited to review book
  18, double-anonymously.

The article page:

1. Sign in as `minoue` (password `minoueminoue`).
2. Open `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=20`,
   the workflow of submission 20, "Transformative Impact of AI Tools on
   Modern Education: Opportunities, Challenges, and Future
   Directions" (Review stage).
3. Open `/index.php/publicknowledge/en/article/view/20`.
4. Open `/index.php/publicknowledge/en/article/view/4`, "Computer
   Skill Requirements for New and Existing Teachers: Implications for
   Policy and Practice" (Submission stage).
5. Open `/index.php/publicknowledge/en/article/view/18`,
   "Self-Organization in Multi-Level Institutions in Networked
   Environments" (declined in the Submission stage).
6. Sign in as `gcox` and open `/index.php/publicknowledge/en/article/view/4`.
7. Sign in as `cturner`. On the dashboard's "My Assigned", open the
   review request for submission 20. It opens on "1. Request", headed
   "Request for Review".
8. Open `/index.php/publicknowledge/en/article/view/20`.

The JATS XML download:

9. Sign in as `dbarnes`, open submission 20, and in the side menu
   choose "JATS XML" under the version.
10. Tick "Make available with publication" and press "Confirm" in
    "Enable JATS XML Download".
11. Sign in as `minoue`, open `/index.php/publicknowledge/en/article/view/20`
    and press "JATS XML".

A press (OMP):

12. Sign in as `minoue` and open
    `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3`.
13. Open `/index.php/publicknowledge/en/catalog/book/3`, "The
    Political Economy of Workplace Injury in Canada" (Submission), then
    `catalog/book/17`, "Open Development: Networked Innovations in
    International Development" (Internal review), then
    `catalog/book/18`, "Transformative Impact of AI Tools on Modern
    Education…" (Review).
14. Sign in as `mfritz` and open `catalog/book/3`.
15. Sign in as `cturner`, open the review request for book 18 from "My
    Assigned" ("1. Request"), then open `catalog/book/18`.

**Expected**: steps 2 and 12 refuse, as they do. The landing pages of
steps 3 to 6, 8, 13, 14 and 15 answer "404 Not Found", since none of
these submissions has reached copyediting. Step 11 then has no page
and no link to press.

**Observed**: steps 2 and 12 show an "Error" window, "The current role
does not have access to this operation.", and the submission's API
answers `401`:

```
GET /index.php/publicknowledge/api/v1/submissions/20  401
```

Every landing page opens under the notice "This is a preview and has
not been published. View submission". It shows the title, the authors
and their affiliations, the keywords and the abstract ("Synopsis" on a
press). Steps 3 and 8 read "Zayan Zedd, Rajshahi University of
Engineering and Technology" and "Nargis Parvin". Step 7's "Request for
Review" shows the title and the abstract and no author. Step 11
downloads `submission-20-publication-21-jats.xml`, which names both
authors. On OMP, step 15's book page names "Zayan Zedd" and "Nargis
Parvin", while the review request names nobody.

A control: a submission in Copyediting (OJS 3, OMP 1) opens for
`minoue`, as it should, and a user who is only a Reviewer (`amccrae`
on OJS 20, `jjanssen` on OMP 17) gets "404 Not Found".

## Cause

`PKP\submission\Repository::canPreview()` (lib/pkp
`classes/submission/Repository.php:580-603`) decides who may open an
unpublished version's landing page. It returns true through
`_roleCanPreview()` (`:1530-1552`) for any user who holds
`ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT` or
`ROLE_ID_SUBSCRIPTION_MANAGER` anywhere in the context. It reads no
assignment and no stage.

Until 768b0a3991 the method opened with a stage check: "Only grant
access when in copyediting or production stage". That check bounded
the role shortcut, which ignores assignments: by copyediting, a
submission has been accepted. 768b0a3991 ("Allow previewing of
submissions in earlier stages of workflow", part of `pkp/pkp-lib#12247`)
deleted the check for every role. b4ef319c72 (2026-05-14) later added
only the exclusion of submissions their author never finished.

The workflow reaches the same people differently.
`SubmissionAccessPolicy`, through
`UserAccessibleWorkflowStageRequiredPolicy` and
`Repo::user()->getAccessibleWorkflowStages()`, admits section editors
and assistants only to stages they are assigned to. So the landing
page now opens before copyediting to staff whom the workflow refuses.

Reach, every caller of `canPreview()`: nine call sites in five
classes.

- OJS `ArticleHandler::initialize()` (the article page and its
  galleys), `ArticleHandler::userCanViewGalley()` and
  `IssueAction::subscribedUser()` (galley access): walked for the page.
- OMP `CatalogBookHandler::book()` (the book page, its versions and
  chapter pages): walked for the book page.
- OPS `PreprintHandler`: a preprint is always in Production or later
  (`Application::getApplicationStages()`), where the old check already
  admitted every moderator, so nothing changes there. Walked as a
  control.
- `PKPJatsController::publicDownload()`
  (`submissions/{id}/publications/{pid}/jats/download`, new on `main`
  with `pkp/pkp-lib#10405`): walked on OJS. It serves only versions
  whose "Make available with publication" is ticked.

## Proposed fix

Keep the early preview for managers and for everyone assigned to the
submission, and give the role shortcut back its stage limit. The change
goes in `canPreview()` itself, so every caller follows
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unassigned-staff-read-pre-acceptance-pages/fix.diff)).

The block below replaces everything in `canPreview()` after the
`submissionProgress` check: the role shortcut and the author-only
assignment query.

```php
        if (!$user) {
            return false;
        }

        // Anyone assigned to the submission (its editors, assistants and
        // authors) may preview it at every stage.
        if (StageAssignment::withSubmissionIds([$submission->getId()])
            ->withUserId($user->getId())
            ->exists()) {
            return true;
        }

        // Managers may preview any submission at every stage. The other
        // editorial roles of the context may preview a submission they are
        // not assigned to only from copyediting on: the rule of 3.5 and
        // earlier, which pkp/pkp-lib#12245 lifted for every role. (The
        // workflow refuses them at every stage.)
        $pastReview = in_array($submission->getData('stageId'), [WORKFLOW_STAGE_ID_EDITING, WORKFLOW_STAGE_ID_PRODUCTION, WORKFLOW_STAGE_ID_DONE]);
        return $this->_roleCanPreview($user, $submission, $pastReview ? null : [Role::ROLE_ID_MANAGER]);
```

`_roleCanPreview()` gains an optional third parameter, `?array
$roleIds`, defaulting to today's four roles, so a subclass or plugin
that calls it is unchanged.

The assignment test is the author-only query the method already ran,
without its role filter. For section editors, assistants and authors it
gives the same answer as the workflow's
`getAccessibleWorkflowStages()`.

The stage limit restores the 3.5 rule for unassigned staff. It does not
match the workflow rule, which refuses them after review too.
`WORKFLOW_STAGE_ID_DONE` is in the list because on `main` a published
submission moves there. Its next, unpublished version stays open to
the staff who could open it in Production on 3.5.

The fix was tried. With it, the Steps showed Expected. A neighbour
check gave the same answers with and without it: assigned editors, an
unassigned manager, the author, unassigned staff in Copyediting, and a
new version in "Done".

**Alternatives**:

- Restore the old check at the top of `canPreview()`. That undoes
  `pkp/pkp-lib#12245`: assigned editors, managers and authors lose the
  early preview, and a published submission's new version (in "Done")
  closes to everyone.
- Check the stage at each caller: nine call sites in five classes
  (three page handlers, `IssueAction` and `PKPJatsController`), and the
  next caller would miss it.

**What goes with it**:

- No stored data and no API or hook changes.
- Two questions for the author of `pkp/pkp-lib#12245` before merging,
  since the fix narrows what that change opened:
  - Was it meant to let unassigned staff preview a submission in the
    PMUR workflow (a version published while still under review)
    before copyediting? The fix closes that to them.
  - A published submission returned from "Done" with "Return to
    workflow" goes back to the stage it left, which can be Review in
    that workflow. Under the fix, its unpublished new version closes to
    unassigned staff until copyediting. Is that intended?
- The guard: a unit test of `canPreview()` per role, assigned and not,
  per stage, and the e2e scenario in U13 (a Section Editor not assigned
  gets "404 Not Found" before copyediting).

Small: one method and a unit test, with no data or API change.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unassigned-staff-read-pre-acceptance-pages/walk.js),
  with its helpers in `lib.js` beside it. It runs as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/unassigned-staff-read-pre-acceptance-pages/walk.js`
  on an install freshly loaded from the default dataset.
  `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front runs it on 3.5,
  and `WALK=neighbour` runs the neighbour check, whose users and
  submissions per app are listed at the top of the script.
  - It also takes the controls (OJS 3 and OMP 1 for `minoue`;
    `amccrae`; `jjanssen`) and, on OPS, preprints 4 and 1 for `minoue`.
  - Steps 7 and 15 open the review request at the address its "My
    Assigned" row opens (`reviewer/submission/<n>`).
- Walked on `main` and `stable-3_5_0` (OJS, OMP and OPS) on PKP's
  default dataset (pkp/datasets 58f1d08, 2026-10-05), on PostgreSQL.
  The fault is a role and stage decision and does not depend on the
  database.
- 3.5, walked:
  - Every landing page of steps 3 to 6, 8, 13 to 15 answered "404 Not
    Found". The review requests of steps 7 and 15 opened as on `main`,
    without authors, and so did the controls.
  - Step 9 was not reached there: 3.5's side menu has no version node.
    3.5 also has no public JATS download (`PKPJatsController` has no
    `publicDownload()`).
- Tips:
  - `main`: OJS 1f4cef786f, OMP a989fdc37, OPS caddbb33da (lib/pkp
    a7f5e3081b; lib/ui-library 64d67363 on OJS, 280f98c5 on OMP and
    OPS).
  - `stable-3_5_0`: OJS 4342473090 (lib/pkp 771474347e), OMP 9c5e24246,
    OPS 38b61882d3 (lib/pkp cf3f984335).
  - `stable-3_4_0`: OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    lib/pkp 767353f4fe.
  - `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    lib/pkp ac3fa73402.
- Code reads:
  - `main`: `canPreview()`, `_roleCanPreview()` and the nine call sites;
    `UserAccessibleWorkflowStageRequiredPolicy`; `ReturnToWorkflow::getNewStageId()`;
    OPS `Application::getApplicationStages()` and its `stageId` schema.
    `git log -L` on `canPreview()` leads to 768b0a3991, then b4ef319c72.
  - 3.5 and 3.4: `canPreview()` returns false outside
    `WORKFLOW_STAGE_ID_EDITING` and `WORKFLOW_STAGE_ID_PRODUCTION`
    before the role shortcut, and the three apps' handlers call it.
  - 3.3: OJS `IssueAction::allowedPrePublicationAccess()` refuses
    before `WORKFLOW_STAGE_ID_EDITING`; OMP `CatalogBookHandler` and
    OPS `PreprintHandler` answer 404 to every unpublished item.
- The fix was tried on OJS, OMP and OPS `main` with the walk and the
  neighbour check, and the neighbour check was also run without it.
  Each run reset the install first. No request answered 500 and no page
  script failed. The diff's comment was reworded after the trial; its
  code is unchanged.
- Not driven:
  - a Subscription Manager (the dataset has none)
  - a declined book (none in the OMP dataset)
  - the galley and chapter pages of an early submission (the dataset's
    have none)
  - a submission in the PMUR workflow, and one returned from "Done"
- Related: `pkp/pkp-lib#9610` (open, 2024, "Allow submission preview
  in any stage") asks for preview at every stage "with the same role
  rules". In its discussion the copyediting limit was described as
  intentional (`pkp/pkp-lib#5565`). It is the request the change partly
  answered, not this fault.
