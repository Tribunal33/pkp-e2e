# After "Delete" of a published issue, its offline articles still read "Published" in the workflow

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS (History, DOIs and plugins; the header is right)
  - 3.4: OJS (code; History, DOIs and plugins; the header is right)
  - 3.3: OJS (code; History and plugins)
- **Introduced** `pkp/pkp-lib#12881` with `pkp/ojs#5585` for `pkp/pkp-lib#12799` · [d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4) · 2026-06-09 · Erik Hanson (ewhanson), for the header and the dashboard; the missing History line, DOI marks and plugin call are older, and 3.3 ([9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)) already has them
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U50 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor deletes a published issue with "Delete". Its articles go
offline as expected, and their stored status is correctly back to
unpublished. But on OJS `main` each article's workflow header still
reads "Published" and offers "Return to Workflow", and the editorial
dashboard still lists it under "Published" instead of in Production.

In every version, the article's History records only "Submission
metadata updated", where "Unpublish Issue" records that the article
was unpublished. The article's DOIs are not flagged on the DOIs page
as needing a new deposit, and plugins that act when an article is
unpublished, such as the DOAJ plugin on `main`, are never called.

Pressing "Unpublish Issue" before "Delete" avoids all of it. After the
fact, "Return to Workflow" moves each article back to Production on
`main`, but it does not add the History line or flag the DOIs.

## Impact

- **Lost:** a correct editorial record and the signals other systems
  rely on. The workflow and dashboard show offline articles as
  published (`main`). The History has no record that they went offline.
  Registered DOIs stay "Registered" instead of being flagged for a new
  deposit, and on `main` the DOAJ plugin keeps the article's DOAJ
  deposit as current. Nothing on screen says any of this happened.
- **Who:** journal managers and editors, for every article of a
  published issue they delete; DOI and DOAJ deposits only where a
  journal uses them. Deleting a published issue is rare, since
  "Unpublish Issue" is the usual way to take one down.
- **Way round:** "Unpublish Issue" first, then "Delete". Once deleted,
  "Return to Workflow" in each article's header fixes the stage only.

Medium: the DOI and DOAJ deposit records and the History go wrong
silently in every version, which weighs more than the header label, and
the History cannot be put right afterwards. It stays
medium because it takes a rare action, touches only that issue's
articles, and "Unpublish Issue" first avoids it.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`. The journal
`publicknowledge` has "Vol. 1 No. 2 (2014)" (published, current), which
holds submission 17, "Antimicrobial, heavy metal resistance and plasmid
profile of coliforms isolated from nosocomial infections in a hospital
in Isfahan, Iran" (published, one version), and submission 1,
"Signalling Theory Dividends" (version 1 published). Nothing else is
needed.

1. Sign in as `dbarnes`.
2. Open submission 17's workflow
   (`/index.php/publicknowledge/dashboard/editorial?workflowSubmissionId=17`).
   The header reads "Published" with "View", "Activity Log", "Library"
   and "Return to Workflow".
3. Issues › "Back Issues" › the "Vol. 1 No. 2 (2014)" row's arrow ›
   "Delete". The window asks "Are you sure you wish to delete this item?
   This action cannot be undone." Press "OK". The row is gone.
4. Sign out and open the article's page
   (`/index.php/publicknowledge/article/view/17`). Sign in again as
   `dbarnes`.
5. Open submission 17's workflow again, then "Publication Settings".
6. Press "Activity Log" and read "History".
7. Open the editorial dashboard's "Published" view.
8. In submission 17's header press "Return to Workflow", then
   "Confirm". Read the header and "History" again.

**Expected:** step 4: "404 Not Found". Step 5: the header reads
"Production", with no "Return to Workflow". Step 6: the newest rows
read "The submission was unpublished." and "Daniel Barnes returned this
submission to the workflow." (submission 1, which has two versions,
gets "A version was removed from publication."). Step 7: neither
submission 1 nor 17 is listed. Step 8: not offered.

**Observed:** step 4: "404 Not Found". Step 5: the header still reads
"Published", with "Activity Log", "Library" and "Return to Workflow";
the Production stage offers "Schedule For Publication", and
"Publication Settings" reads "Status: Unscheduled". Step 6: the only
new row is "Submission metadata updated". Step 7: "2 Published",
listing submissions 17 and 1. Step 8: the window reads "Return this
submission to the workflow stage it occupied before it was moved to
Done."; after "Confirm" the header reads "Production", and History adds
only "Daniel Barnes returned this submission to the workflow." No
request failed and no page script failed.

On 3.5 the header reads "Production" after step 3 and "Published"
lists nothing; step 6 is the same as on `main`.

Control: "Unpublish Issue" on the same issue in step 3 instead records
"The submission was unpublished." and "Daniel Barnes returned this
submission to the workflow.", the header reads "Scheduled", and
"Published" lists nothing.

## Cause

`IssueGridHandler::deleteIssue()`
(`classes/controllers/grid/issues/IssueGridHandler.php` lines 380–397
on `main`) takes each of the issue's publications offline with a plain
edit:

```php
Repo::publication()->edit(
    $publication,
    ['issueId' => null, 'status' => Publication::STATUS_QUEUED]
);
```

`edit()` saves the status and logs "Submission metadata updated". It
skips what `PKPPublication\Repository::unpublish()` does when a
published or scheduled publication goes offline: the log entry ("The
submission was unpublished.", or "A version was removed from
publication." when the submission has several versions), the
`Publication::unpublish` hook, the DOI stale marks and the
`PublicationUnpublished` event. "Unpublish Issue" (`unpublishIssue()`)
and the table of contents' "Remove" (`TocGridHandler::removeArticle()`)
both call `unpublish()`. `deleteIssue()` then sets the submission's
status itself with `updateStatus()`, so the stored status is right
(unpublished) while everything else is skipped.

This has been so in every version back to 3.3. On `main` it also
leaves the article in the Done stage. `pkp/pkp-lib#12799`
([d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4))
made the workflow stage follow publication: its listener
`ApplyDoneWorkflowStage` moves a submission into Done on
`PublicationPublished` and back to its earlier stage on
`PublicationUnpublished`. `deleteIssue()` fires neither event, so the
article stays in Done, which the workflow header labels "Published" and
the dashboard's "Published" view lists.

Reach, by version:

- `main` only, from the Done stage: the workflow header, its "Return to
  Workflow" button, the dashboard's "Published" view and the stage in
  the submission lists (walked).
- Every version: the missing History line (walked on `main` and 3.5;
  3.4 and 3.3 read in the code).
- `main`, 3.5 and 3.4: no DOI stale marks. `unpublish()` marks the
  submission's DOIs stale, so the DOIs page shows them as needing a new
  deposit (code).
- Every version: plugins on the `Publication::unpublish` hook are not
  called. In OJS's own code the one listener is
  `PubObjectsExportGenericPlugin::handlePublicationUnpublishing()` on
  `main`, used by the DOAJ plugin: it marks the article's DOAJ deposit
  stale, and after "Delete" the deposit stays "registered" (code). On
  3.5 and older no plugin in OJS's own code listens; third-party
  plugins may.
- `main`, 3.5 and 3.4: the `PublicationUnpublished` event is not fired,
  so the search index is not refreshed (`UpdateSubmissionInSearchIndex`).
  The default database search filters out unpublished articles when it
  searches, so its results are right; OpenSearch not checked. On `main`
  the author's "Publication Published" notification is not removed
  either (`NotifyAuthorOnPublication`) (code).
- Not affected: OAI-PMH. `main` writes the deleted records itself in
  `deleteIssue()`, 3.5 through `updateStatus()` (code).
- `deleteIssue()` is the only place in OJS that sets a publication's
  status with `edit()` (search of `ojs`, `lib/pkp` and the plugins).

## Proposed fix

A proposal; the team decides. Take each published or scheduled publication of the deleted issue
offline through `unpublish()`, read it again, then clear its issue with
`edit()`. That is the order `TocGridHandler::removeArticle()` uses
(`unpublish()`, read again, `edit()`), though `removeArticle()` resets
the position and keeps the issue
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-issue-articles-read-published/fix.diff)):

```diff
                 if ($publication->getData('issueId') === (int) $issue->getId()) {
-                    $wasCurrentPublication = $publication->getId() == $submission->getData('currentPublicationId');
-                    Repo::publication()->edit(
-                        $publication,
-                        ['issueId' => null, 'status' => Publication::STATUS_QUEUED]
-                    );
-                    // edit() bypasses unpublish(), so tombstone the OAI identifier(s)
-                    // this now-offline publication was exposing.
-                    $unpublishedPublication = Repo::publication()->get($publication->getId());
-                    (new ArticleTombstoneManager())->reconcileTombstonesOnUnpublish($unpublishedPublication, $wasCurrentPublication, $submission, $journal);
+                    if (in_array($publication->getData('status'), [Publication::STATUS_PUBLISHED, Publication::STATUS_SCHEDULED])) {
+                        Repo::publication()->unpublish($publication);
+                        $publication = Repo::publication()->get($publication->getId());
+                    }
+                    Repo::publication()->edit($publication, ['issueId' => null]);
                 }
             }
-            $newSubmission = Repo::submission()->get($submission->getId());
-            Repo::submission()->updateStatus($newSubmission);
         }
```

The diff also drops the unused `use APP\article\ArticleTombstoneManager;`.

- OJS's `Publication\Repository::unpublish()` already writes the deleted
  OAI records, so the handler's own call goes.
- The publication is read again after `unpublish()`, so that `edit()`
  does not save the old status back.
- The `updateStatus()` after the loop is no longer needed:
  `unpublish()` updates the submission's status whenever a
  publication's status changes, and a publication in the issue that was
  never published only loses its issue, which does not change the
  submission's status.

Tried on `main`: after step 3 the header read "Production" with "Move
To Copyediting" and "Schedule For Publication", and History's newest
rows read "Submission metadata updated", "Daniel Barnes returned this
submission to the workflow." and "The submission was unpublished.".
Submission 1 got "A version was removed from publication.", "Published"
listed nothing, and both articles had their deleted OAI records.
"Unpublish Issue" on the same issue gave the same result with the fix
and without it.

**Alternatives:**

- Fire `PublicationUnpublished`, call the hook and add the log entry in
  `deleteIssue()` by hand: a second copy of `unpublish()` that would
  drift from it, as the OAI call did.
- Make `ApplyDoneWorkflowStage` also react to status changes saved by
  `edit()`: fixes only the stage on `main`, and leaves the History, the
  DOIs and the plugins.

**What goes with it:**

- [U19 A11's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A11-oai-driver-set-misses-withdrawn-articles.md)
  changes the same lines (its change 2). It saves the status first,
  writes the deleted OAI records, and clears the issue last, so that
  the DRIVER plugin still sees the article's issue. This fix keeps that
  order: OJS's `unpublish()` writes the records from the publication as
  it was before the change, and the issue is cleared afterwards. With
  this fix in, change 2 is not needed, and U19 A11 needs only its change
  1 in `DRIVERPlugin`.
- No data repair: the Done stage is not yet released, and its upgrade
  migration moves only published submissions into it. DOIs and History
  already wrong on released versions cannot be told apart from correct
  ones.
- Plugins on the `Publication::unpublish` hook are now called for
  "Delete", as for "Unpublish Issue".
- Backport: 3.5 and 3.4 have the same `edit()` (line 382), without the
  OAI lines and with `Submission::STATUS_*` constants; the same change
  applies there with those constants.
- Regression test: an e2e check that deleting a published issue moves
  its articles out of the "Published" queue and records "The submission
  was unpublished." for a single-version article and "A version was
  removed from publication." for one with several versions.

Small: a few lines in one handler, using the existing `unpublish()`.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-issue-articles-read-published/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/delete-issue-articles-read-published/walk.js [unpublish]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–8; with `unpublish` it presses "Unpublish Issue" in
  step 3 instead (the control).
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/delete-issue-articles-read-published/fix.diff ojs`,
  the script with and without `unpublish`, then
  `node bin/try-fix.js revert ojs`. `unpublish` was also run without the
  fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–8 on `main`; steps 1–7 on 3.5 with step
  4 read signed in (the "This is a preview and has not been published."
  page), before the signed-out step and step 8 were added. Step 8 has
  nothing to press on 3.5, which has no Done stage.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads on the other versions:
  - 3.5: `deleteIssue()` line 382 makes the same `edit()` and calls
    `updateStatus()`; there is no Done stage (`ApplyDoneWorkflowStage`
    is absent; `pkp/ojs#5585` is not on the branch). `unpublish()` logs,
    marks the DOIs stale, calls the hook and fires the event; no plugin
    in OJS's own code listens to the hook.
  - 3.4: `deleteIssue()` line 382 makes the same `edit()`
    (`'issueId' => ''`); `unpublish()` does the same four things as on
    3.5.
  - 3.3: `deleteIssue()` (`IssueGridHandler.inc.php` line 311) calls
    `Services::get('publication')->edit()`;
    `PKPPublicationService::unpublish()` logs the unpublication and
    calls the hook. DOIs belong to the DOI plugins there, and no plugin
    in OJS's own code listens to the hook.
- Introduced: the Done stage's listener and label come from
  d52aa4c84b (pkp-lib, PR `pkp/pkp-lib#12881`, merged 2026-06-29) and
  [a9282937f8](https://github.com/pkp/ojs/commit/a9282937f833de7a6af172ae213cfaef9eb07ff9)
  (OJS, PR `pkp/ojs#5585`). The `edit()` in `deleteIssue()` predates the
  2021 PSR-12 reformat (665ed1f925), which is as far back as the blame
  reaches; its current shape is from `pkp/pkp-lib#9295` (cf12d211eb)
  and `pkp/pkp-lib#12033` (2c86add57e).
- Upstream: searched pkp/pkp-lib and pkp/ojs. Close but different:
  `pkp/pkp-lib#12033` (closed; "Delete" on an issue with published
  articles threw an exception), `pkp/pkp-lib#12922` (closed; added the
  OAI records to `deleteIssue()`), `pkp/pkp-lib#12799` (closed; the Done
  stage, whose discussion does not mention deleting an issue).
- Not driven: the DOIs page and the DOAJ deposit status (the dataset
  has no DOIs, and no DOAJ deposits; read in the code); "Unpublish
  Issue" followed by "Delete" as the way round (read in the code: the
  first does the unpublishing, the second then only clears the issue);
  deleting an unpublished issue that holds a scheduled article (the
  dataset has none); OpenSearch; OJS 3.4 and 3.3.
