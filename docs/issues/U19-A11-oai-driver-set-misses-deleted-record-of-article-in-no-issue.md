# An article in no issue, once unpublished, has no deleted record in the journal's `driver` OAI set

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none (an article is published only in an issue)
  - 3.4: none (code; an article is published only in an issue)
  - 3.3: none (code; an article is published only in an issue)
- **Introduced** no PR found, for `pkp/pkp-lib#9295` · [ada320fd81](https://github.com/pkp/ojs/commit/ada320fd81d1f78c9bad0f80c58b502a29498a55), then [d4aa47f268](https://github.com/pkp/ojs/commit/d4aa47f2689e9872dd31de9927a88a3138800f55) · 2025-05-12, 2025-05-29 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

With the "DRIVER" plugin enabled, a Journal Manager unpublishes an
article that was published without an issue ("Don't Assign To An
Issue"). The deleted record this leaves is stored without its place in
the `driver` set, so a harvest of that set shows neither the article
nor a notice that it was deleted. An article unpublished from an issue
leaves a deleted record in the set.

A service that harvests the set keeps the withdrawn article, and
nothing on screen says so. It happens on every journal with the plugin
enabled, each time such an article is unpublished.

## Impact

- **Lost:** the `driver` set's notice that the article was withdrawn.
  The unpublish itself completes; the plugin's part of it fails and is
  written to the server log ("Plugin … DRIVERPlugin failed to handle
  the hook ArticleTombstoneManager::insertArticleTombstone").
  Deleted records already stored this way stay outside the set after a
  fix.
- **Who:** a journal with "DRIVER" enabled (it is off by default) that
  publishes articles outside issues and unpublishes one.
- **Way round:** publish the article again into an issue and unpublish
  it there: the set then lists its deleted record. Nothing on screen
  points to that.

Medium: a public list is silently wrong, in a rarely met state and
with a way round on screen. What keeps it from being higher: it is one
deleted record per such unpublish, in the set of a plugin that is off
by default, and the journal's list without the set carries the deleted
record. It would be high if the plugin were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Its journal `publicknowledge`
  is open access and has two published articles, 1 and 17, each with a
  galley, in "Vol. 1 No. 2 (2014)".

Steps:

1. Sign in as `admin`.
2. Settings › Website › "Plugins" › "Installed Plugins": under "Generic
   Plugins" tick "DRIVER".
3. From the dashboard open submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran". Press "Unpublish" and
   confirm with "Unpublish".
4. Open
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver`.
   It lists `article/1` and the deleted record of `article/17`, with
   the setSpec values `publicknowledge:ART` and `driver`: the control,
   an article unpublished from an issue.
5. In submission 17 press "Schedule For Publication". In "Review
   Publishing Details" choose "Publication Stage" "Version of Record
   (VoR)", "Revision Significance" "Major Revision" and "Don't Assign
   To An Issue"; press "Confirm". The window says "This will be
   published immediately without any issue association."; press
   "Publish".
6. Open the address of step 4: `article/1` and `article/17`, both with
   the setSpec `driver`.
7. In submission 17 press "Unpublish" and confirm.
8. Open the address of step 4, then the same address without
   `&set=driver`.

**Expected.** As in step 4: the set lists `article/1` and the deleted
record of `article/17`, which names `driver`.

**Observed.** The set lists `article/1` alone. The list without the set
holds the deleted record of `article/17` with the setSpec
`publicknowledge:ART` and no `driver`. The unpublish request answers
200, and the server log has

```
Plugin APP\plugins\generic\driver\DRIVERPlugin failed to handle the hook ArticleTombstoneManager::insertArticleTombstone
TypeError: APP\issue\Repository::get(): Argument #1 ($id) must be of type int, null given, called in …/plugins/generic/driver/DRIVERPlugin.php on line 221 and defined in …/classes/issue/Repository.php:70
```

The set's answer in step 8 also says "There are more results.", and
"Resume" answers "No matching records in this repository": the set's
paging, reported separately (U19 A24, linked under Proposed fix).

## Cause

When an article is unpublished, `ArticleTombstoneManager` writes its
deleted record and calls the hook
`ArticleTombstoneManager::insertArticleTombstone`. The plugin's
`insertDRIVERArticleTombstone()` then asks
`DRIVERPlugin::isDRIVERArticle()` whether the article was in the set,
and stores the `driver` setting with the deleted record if so. That
method begins (`plugins/generic/driver/DRIVERPlugin.php`, line 221):

```php
$issue = Repo::issue()->get($publication->getData('issueId'));
```

`APP\issue\Repository::get(int $id, …)` refuses `null`, which is the
issue ID of an article in no issue. `Hook::call()` catches the
`TypeError` and logs it, so the unpublish goes through and only the
setting is not stored.

Until 2025 `APP\publication\Repository::validatePublish()` refused a
publication with no issue.
[ada320fd81](https://github.com/pkp/ojs/commit/ada320fd81d1f78c9bad0f80c58b502a29498a55)
("publishing without issue assignment in editorial workflow") let one
through when the publication carried `continuousPublication`, and
[d4aa47f268](https://github.com/pkp/ojs/commit/d4aa47f2689e9872dd31de9927a88a3138800f55)
dropped the requirement. Neither touched this caller.

The plugin holds the same rule twice. `isDRIVERRecord()`, which decides
the set for a live record, was made to accept an article in no issue
in [4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761)
(`pkp/pkp-lib#12922`, 2026: `$issue = $issueId ? Repo::issue()->get($issueId) : null;`
and `$issue &&` in the tests that follow). `isDRIVERArticle()`, its
copy for the deleted record, was not.

Reach:

- Every deleted record written for an article in no issue while the
  plugin is enabled, through the same hook: "Unpublish" (walked);
  unticking "Enable this journal to appear publicly on the site", which
  writes a deleted record for each published article
  (`ContextService`, lines 128 to 134, `insertTombstonesByContext()`;
  code); removing the journal (`beforeDeleteContext()`; code); and,
  with DOI versioning, the deleted records of an article's versions
  (`insertIdentifierTombstone()`; code).
- Which journals show it: the setting is missing on every journal, but
  a journal other than the installation's first lists none of its own
  deleted records at its address
  ([U19 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A1-oai-own-address-loses-deleted-records.md),
  `jardakotesovec/pkp-e2e#254`), so there the gap is hidden behind
  that fault until it is fixed (code).
- Other callers of `Repo::issue()->get()` with a publication's issue
  ID: eleven test the ID first. One does not,
  `controllers/grid/pubIds/PubIdExportRepresentationsListGridCellProvider.php`
  lines 90 to 92 (the "issue" column of a grid of galleys). Its handler,
  `PubIdExportRepresentationsListGridHandler`, is named by no template,
  page or plugin in OJS or lib/pkp, so no screen was found that reaches
  line 91 (code).

## Proposed fix

Recommended, tried: keep the rule once. `isDRIVERArticle()` takes the
body `isDRIVERRecord()` already has for an article in no issue, and
`isDRIVERRecord()` calls it for a live record
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-misses-deleted-record-of-article-in-no-issue/fix.diff)):

```diff
         // if the article is alive
         if (!isset($row['tombstone_id'])) {
-            … (the forty lines isDRIVERArticle() repeats)
+            return $this->isDRIVERArticle($row['journal_id'], $row['submission_id']);
         } else {
```

```diff
-        $issue = Repo::issue()->get($publication->getData('issueId'));
+        $issueId = $publication->getData('issueId');
+        $issue = $issueId ? Repo::issue()->get($issueId) : null;
…
-            if ($issue->getAccessStatus() == 0 || $issue->getAccessStatus() == Issue::ISSUE_ACCESS_OPEN) {
+            if ($issue && ($issue->getAccessStatus() == 0 || $issue->getAccessStatus() == Issue::ISSUE_ACCESS_OPEN)) {
                 $status = DRIVER_ACCESS_OPEN;
-            } elseif ($issue->getAccessStatus() == Issue::ISSUE_ACCESS_SUBSCRIPTION) {
+            } elseif (!$issue || $issue->getAccessStatus() == Issue::ISSUE_ACCESS_SUBSCRIPTION) {
```

Tried on `main`: step 8 lists `article/1` and the deleted record of
`article/17` with the setSpec `driver`, the list ends without
"Resume", and the log line is gone. Steps 4 and 6 answer as before,
and the article published into the issue again and unpublished there
leaves a deleted record in the set, as before.

**Alternatives**

- Change only `isDRIVERArticle()` (the second hunk): it fixes the
  symptom and leaves the rule in two places, which is how this one was
  missed.

**What goes with it**

- Deleted records already stored without the setting stay outside the
  set. No repair is proposed: whether an article was in the set when it
  was unpublished is stored nowhere else. The way round above repairs
  one article.
- Order: this diff and the one for
  [U19 A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A23-oai-driver-set-lists-article-without-galley.md)
  touch the same lines of `DRIVERPlugin.php` and do not apply together
  as written. This one first makes A23's change one line (the galley
  condition then exists once). The fix for
  [U19 A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A24-oai-driver-list-says-more-results.md)
  is in another file. One PR for the three is the simplest.
- Guard: OJS has no test of the plugin. pkp-e2e's OAI-PMH scenario 10
  can cover it end to end on the installation's first journal (an
  article in no issue, unpublished, leaves a deleted record in the
  set). A unit test of `isDRIVERArticle()` with a null issue ID needs
  the journal DAO and the submission repository mocked.

Small: one method in one file takes the checks its twin already has,
with no data repair.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-misses-deleted-record-of-article-in-no-issue/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/lib.js),
  run after `npm run fleet-prep -- --feature issues-a23 --dataset 3 --reset` with
  `PROBE_FEATURE=issues-a23 PROBE_AGENT=a11 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-misses-deleted-record-of-article-in-no-issue/walk.js`.
  It reads each OAI address as a harvester does, without a session,
  and reads the install's server log. After the Steps it publishes
  submission 17 into the issue again, unpublishes it and reads both
  lists: the way round, and the check that the fix leaves an article in
  an issue alone.
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-driver-set-misses-deleted-record-of-article-in-no-issue/fix.diff ojs`,
  walk.js, then `node bin/try-fix.js revert`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`). MySQL not checked;
  the fault is in PHP.
  - main: OJS 06fd981b01 (lib/pkp 2e377d27fc).
  - stable-3_5_0: OJS 18d097d94e (lib/pkp 1fb843f491). Steps 1 to 4
    were walked and show the control. Step 5 cannot be taken: the
    "Issue" page of submission 17 offers "Change Issue" and no choice
    without an issue. Code read: `classes/publication/Repository.php`,
    `validatePublish()` refuses a publication with no issue
    (`publication.required.issue`).
  - 3.4 (code): OJS `stable-3_4_0` 9571d8fde7,
    `classes/publication/Repository.php`: the same refusal.
  - 3.3 (code): OJS `stable-3_3_0` 9fdb9bcf9a,
    `classes/services/PublicationService.inc.php`,
    `validatePublishPublication()`: "Every publication must be
    scheduled in an issue".
- The spec's register entry calls this latent, from a walk on journals
  that were not the installation's first. The dataset's journal is the
  first, so the Steps show it on screen.
- Introduced: `git log -S` on `publication.required.issue` in
  `classes/publication/Repository.php`; the GitHub API lists no PR for
  ada320fd81. `git blame` on line 221 names 88aaa6b49f
  (`pkp/pkp-lib#7129`, 2021), which moved the call to `Repo::issue()`.
- The callers of `Repo::issue()->get()` were found with a search of
  OJS and lib/pkp for the call with `getData('issueId')` in it or just
  before it; the grid handler's name with a search of every `.php`,
  `.tpl` and `.js` file.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/ojs, issues and PRs,
  open and closed: "DRIVER plugin oai", "DRIVER oai",
  "oai deleted record without issue", "insertArticleTombstone failed
  to handle the hook", "isDRIVERArticle", "DRIVERPlugin".
- Not driven: unticking "Enable this journal to appear publicly on the
  site"; removing a journal; DOI versioning; a journal that sells
  subscriptions; a journal other than the installation's first.
- Unverified: whether any service harvests by this set today, and what
  it does with a record that stops being listed without a deleted
  record.
