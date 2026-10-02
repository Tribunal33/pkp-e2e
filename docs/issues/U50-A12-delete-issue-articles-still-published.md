# After "Delete" on an issue, its offline articles still read "Published" and History records no unpublishing

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS (on screen: History only)
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pkp-lib#12881` for `pkp/pkp-lib#12799` · [d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4) · 2026-06-09 · Erik Hanson (ewhanson), which broke the header; the bypass behind it since `pkp/ojs#3001` for `pkp/pkp-lib#6625` · [021590ec7e](https://github.com/pkp/ojs/commit/021590ec7e519f8cd196b597fc46f6437923e397) · 2021-01-20 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U50 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Journal Manager or editor deletes an issue that holds published
articles. The articles go offline, as they should: their pages answer
"404 Not Found" and their publication reads "Status: Unscheduled". But
each article's workflow still reads "Published" and offers "Return to
Workflow", as if the article were still live. Its History records only
"Submission metadata updated". Unpublishing the issue, or removing the
article from the issue's table of contents with "Remove", records "The
submission was unpublished.".

An editor who opens the article is told it is published when readers can
no longer reach it. Nobody is warned, so an article taken offline this
way can stay offline unnoticed.

## Impact

- **Lost**: a correct status for each article of the deleted issue, and
  the History line that would explain why it went offline. The articles
  themselves are kept.
- **Who**: editors and Journal Managers who open such an article after an
  issue holding published articles was deleted. Deleting a published issue
  is a rare task.
- **Way round**: "Return to Workflow" in the article's header moves it
  back to Production, unpublished, which corrects the status without
  publishing it again. "Schedule For Publication" puts it back online.

Medium: after a rare action, the workflow shows an offline article as
published. On 3.5 and earlier only the missing History line shows on
screen, which alone would be low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`, with the
  differences in brackets). The journal `publicknowledge` has "Vol. 1 No.
  2 (2014)" published and current. It holds two published articles:
  submission 17, "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a hospital
  in Isfahan, Iran", and submission 1, "Signalling Theory Dividends".

Steps:

1. Sign in as `dbarnes`.
2. Open submission 17
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
   The header reads "Published" and offers "View", "Activity Log",
   "Library" and "Return to Workflow" [3.5: no "Return to Workflow"].
   "Publication" › "Version of Record 1.0" › "Title & Abstract" reads
   "Status: Published" [3.5: "Publication" › "Title & Abstract"].
3. Open Issues (`/index.php/publicknowledge/manageIssues`), "Back
   Issues".
4. On "Vol. 1 No. 2 (2014)", press the row's arrow, then "Delete".
5. "Are you sure you wish to delete this item? This action cannot be
   undone." › "OK".
6. Open submission 17 again. Read the header, then the status on "Title &
   Abstract" as at step 2.
7. Press "Activity Log" and read "History".
8. Sign out and open the article's page,
   `/index.php/publicknowledge/en/article/view/17`. A signed-in editor
   sees an unpublished article's page as a preview, so this needs a
   signed-out browser.

**Expected.** At step 6 the header no longer reads "Published" and offers
no "Return to Workflow". The article is back in Production, as after
"Unpublish" on the publication. At step 7 History gains "The submission
was unpublished.". At step 8 the page answers 404.

**Observed.** At step 6 the header still reads "Published" and offers
"Activity Log", "Library" and "Return to Workflow" ("View" has gone). The
workflow page opens on "Workflow: Production", which offers "Schedule For
Publication", and "Title & Abstract" reads "Status: Unscheduled". At step
7 the delete added one line to History, "Submission metadata updated". At
step 8 the page answers "404 Not Found". Submission 1 shows the same: the
header reads "Published", History gained two "Submission metadata
updated" lines, and its page answers 404.

On `stable-3_5_0` the header after the delete reads "Production" and
offers "Preview", "Activity Log" and "Library", which is right. History
gains only "Submission metadata updated", as on `main`.

Control: "Unpublish Issue" on the same issue moves submission 17 out of
"Published": its header then reads "Scheduled".

## Cause

`IssueGridHandler::deleteIssue()` (OJS,
`classes/controllers/grid/issues/IssueGridHandler.php`, line 385) takes each
publication of the issue offline with `Repo::publication()->edit($publication,
['issueId' => null, 'status' => Publication::STATUS_QUEUED])`. It writes the
status column directly instead of calling `Repo::publication()->unpublish()`,
which `unpublishIssue()` and "Remove" (`TocGridHandler::removeArticle()`)
call. `edit()` logs only "Submission metadata updated" and runs only the
`Publication::edit` hook. So everything `unpublish()` does beyond the status
is skipped: the unpublish line in History, marking DOIs stale, the
`Publication::unpublish` hook, and the `PublicationUnpublished` event with
its listeners (the Done stage, the author's notification, the search
index). The handler recomputes the submission's status with
`updateStatus()`, so the status column itself is right.

On `main`, the "Done" stage (`pkp/pkp-lib#12799`) moves a submission in and
out of Done in the `ApplyDoneWorkflowStage` listener, on
`PublicationPublished` and `PublicationUnpublished`. With no event, the
submission stays in stage 6 (Done) with no published version. The
workflow header (`useSubmission.getExtendedStage()`) labels every Done
submission "Published", and `ReturnToWorkflow` stays available. On 3.5
there is no Done stage, and the header follows the submission's status.

Reach of the bypass, per branch:

- The "Published" header and "Return to Workflow": `main`, on screen.
- No unpublish line in History (`publication.event.unpublished` or
  `versionUnpublished`): `main` and 3.5 on screen, 3.4 and 3.3 code.
- The dashboard's "Published" view (`DashboardView::TYPE_PUBLISHED`)
  lists submissions in the Done stage, so it keeps listing the offline
  article: `main`, code.
- DOIs keep their registered status. `unpublish()` would mark the current
  publication's DOIs stale (or the version's, with DOI versioning):
  `main`, 3.5 and 3.4, code.
- The search index keeps the article's entry, which
  `UpdateSubmissionInSearchIndex` would refresh on `PublicationUnpublished`
  (3.3's `unpublish()` updates the index itself). Search results filter out
  unpublished articles when they are shown, so readers see nothing of it:
  all four branches, code.
- The author's "published" notification is not deleted
  (`NotifyAuthorOnPublication`): `main`, code.
- DOAJ's stale handling on the `Publication::unpublish` hook
  (`PubObjectsExportGenericPlugin::handlePublicationUnpublishing()`) does
  not run: `main`, code. On 3.5 and 3.4 no OJS class listens to that hook.

## Proposed fix

In `deleteIssue()`, take each published or scheduled publication offline
through `unpublish()`, and then clear its issue. This is the pattern
"Remove" already uses in `TocGridHandler::removeArticle()`: the same status
filter, `unpublish()`, a fresh `get()`, then `edit()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-issue-articles-still-published/fix.diff)):

```diff
                 if ($publication->getData('issueId') === (int) $issue->getId()) {
-                    $wasCurrentPublication = $publication->getId() == $submission->getData('currentPublicationId');
+                    if (in_array($publication->getData('status'), [Publication::STATUS_PUBLISHED, Publication::STATUS_SCHEDULED])) {
+                        Repo::publication()->unpublish($publication);
+                        $publication = Repo::publication()->get($publication->getId());
+                    }
                     Repo::publication()->edit(
                         $publication,
                         ['issueId' => null, 'status' => Publication::STATUS_QUEUED]
                     );
-                    // edit() bypasses unpublish(), so tombstone the OAI identifier(s)
-                    // this now-offline publication was exposing.
-                    $unpublishedPublication = Repo::publication()->get($publication->getId());
-                    (new ArticleTombstoneManager())->reconcileTombstonesOnUnpublish($unpublishedPublication, $wasCurrentPublication, $submission, $journal);
                 }
```

The REST API's unpublish endpoint accepts the same two statuses. The
status filter keeps the unpublish log off publications that are neither
published nor scheduled, such as submission 1's unpublished 1.1. The
`edit()` still clears the issue, which is what the original change was for
(`pkp/pkp-lib#12033`: no publication may point at a deleted issue). OJS's
`unpublish()` reconciles the OAI tombstones itself, so the explicit
tombstone call (from 4ea46f5f35) goes. A search of OJS, OMP, OPS and pkp-lib
found no other `edit()` that changes a publication's status.

Tried on `main`. With the fix, the walk shows the Expected. The header
reads "Production" with "Preview", "Activity Log" and "Library". History
gains "The submission was unpublished." and "Daniel Barnes returned this
submission to the workflow.". The page answers 404. Submission 1 gains one
"A version was removed from publication.", for its published 1.0 only. A
second walk unpublished the issue first, then deleted it while its
articles were only scheduled. With the fix and without it, the header read
"Production" and the status "Unscheduled". With the fix, the delete also
recorded "The submission was unpublished.", as "Unschedule" does for a
scheduled publication.

**Alternatives**

- Fire `PublicationUnpublished` and write the log line inside
  `deleteIssue()`. This copies part of `unpublish()` and misses the DOI
  and hook steps. It would drift again the next time `unpublish()` grows.
- Move the article cascade into `Repo::issue()->delete()`. No other
  caller needs it: the only other way issues are deleted is with their
  whole journal (`deleteByContextId()`). `unpublishIssue()` and
  `removeArticle()` also keep their cascades in the handler.

**What goes with it**

- No API or hook change. Deleting an issue that holds scheduled articles
  now also logs "The submission was unpublished." for them, as unscheduling
  does.
- Data: on `main`, a submission whose issue was already deleted stays in
  Done until an editor presses "Return to Workflow". `main` is unreleased,
  so no migration is proposed. Missing History lines cannot be restored.
- Backport: the diff does not apply verbatim to 3.5 and 3.4. Their
  `PKPPublication` has no `STATUS_*` constants, so the filter and the
  `edit()` use `PKPSubmission::STATUS_PUBLISHED`, `STATUS_SCHEDULED` and
  `STATUS_QUEUED`, as their `removeArticle()` does. The tombstone lines the
  diff removes do not exist there. 3.3 needs the same change written with
  `Services::get('publication')->unpublish()`.
- Guard: an e2e scenario on Issues, a **Planned** item in spec U50: delete
  a published issue, then the article's workflow is out of "Published"
  and History records the unpublishing.

Small: one loop in one handler, following the pattern `removeArticle()`
already uses, plus an e2e scenario.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-issue-articles-still-published/walk.js),
  with helpers in `lib.js` beside it. Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/delete-issue-articles-still-published/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). The walk with only scheduled articles:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-issue-articles-still-published/neighbour.js),
  walked with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS. No request answered 500 and no
  script error was logged. OMP and OPS have no journal issues.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library 64d67363);
  `stable-3_5_0` OJS c346ee00a5 (pkp-lib 3bb4450bea, ui-library d4e01883);
  `stable-3_4_0` OJS 75cc2d488b (pkp-lib 32b0f4b4af); `stable-3_3_0` OJS
  ac77c9fb35 (pkp-lib f6ab331645).
- 3.5 (walked, and read): `deleteIssue()` (line 382), `unpublish()` in
  `lib/pkp/classes/publication/Repository.php` (log, `markStale()`, the
  hook, the event), the listeners under `classes/observers/listeners`, and
  `useSubmission.getExtendedStage()`.
- 3.4 (code): `deleteIssue()` calls `Repo::publication()->edit($publication,
  ['issueId' => '', 'status' => Submission::STATUS_QUEUED])`.
  `Repository::unpublish()` logs `publication.event.unpublished`, marks
  DOIs stale, runs the hook and fires `PublicationUnpublished`.
- 3.3 (code): `deleteIssue()` calls `Services::get('publication')->edit()`
  with the same values, which logs `submission.event.general.metadataUpdated`.
  `PKPPublicationService::unpublish()` logs the unpublishing and updates the
  search index.
- "Return to Workflow" (Way round) is read in the code, not pressed:
  `ReturnToWorkflow` returns the submission to the stage it held before
  Done (Production when none is recorded), with the status queued.
- Introduced: `git blame` on line 385 leads through cf12d211eb and
  2c86add57e (constant and `null` changes) to 021590ec7e, which replaced
  the submission's status edit with `['issueId' => '', 'status' =>
  STATUS_QUEUED]` on the publication and added `updateStatus()`. Before it,
  88aba9a0cb cleared only the publication's issue and set the submission's
  status. The GitHub API names `pkp/ojs#3001` (NateWr) for 021590ec7e and
  `pkp/pkp-lib#12881` (ewhanson) for d52aa4c84b.
- Upstream: `pkp/pkp-lib#12033` (deleting an issue with published articles
  failed on a foreign key and asks for a stronger warning; closed, fixed by
  clearing the issue) is a different fault. No pkp issue or PR found in
  pkp/pkp-lib or pkp/ojs.
- Read in the code only, not driven: the dashboard's "Published" view, DOI
  staleness, the search index, the author's notification and the DOAJ
  hook. With DOI versioning on, the OAI tombstones after the fix are read
  in the code only.
