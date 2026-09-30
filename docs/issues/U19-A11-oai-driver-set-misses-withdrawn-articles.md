# DRIVER set never learns of articles withdrawn by deleting their issue or published without one

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS (deleting an issue only; 3.5 cannot publish an article without an issue)
  - 3.4: OJS (code; a different failure: "Delete" on a published issue fails with a server error)
  - 3.3: OJS (code; only on a journal that requires subscriptions, where "Delete" on a published issue fails with a server error)
- **Introduced** `pkp/ojs#3162` for `pkp/pkp-lib#7129` · [88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7) · 2021-07-14 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

With the "DRIVER" plugin enabled, a journal editor deletes a published
issue, or unpublishes an article that was published without an issue.
The articles go offline, and the journal's OAI-PMH list reports them as
deleted, but the `driver` set does not: they drop out of it without a
deleted record. A harvester that follows the set is never told of the
withdrawal and keeps the article as live. An article unpublished while
still in its issue is reported to the set as it should be.

The editor sees the action succeed and is not told. Unpublishing each
article before deleting its issue avoids it; for an article published
without an issue there is no way round.

## Impact

- **Lost.** A correct public record in the `driver` set, the one
  DRIVER/OpenAIRE-style harvesters read. It stays wrong for those
  articles: a later fix does not rewrite the deleted records already
  stored.
- **Who.** Journals that enable "DRIVER" (off on a new journal), each
  time an editor deletes a published issue or unpublishes an article
  published without an issue.
- **Way round.** Unpublish the issue's articles one by one before
  deleting it. None for an article published without an issue, and none
  after the fact.

Medium: in a setup that is off by default, so rarely met, a public
record read by harvesters stays wrong, silently and permanently, with no
way round for an article published without an issue.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (and `stable-3_5_0`). Its
  journal `publicknowledge` is open access; issue "Vol. 1 No. 2 (2014)"
  holds the published articles 1 "Signalling Theory Dividends" and 17
  "Antimicrobial, heavy metal resistance and plasmid profile of coliforms
  isolated from nosocomial infections in a hospital in Isfahan, Iran",
  each with a PDF galley. Submission 5 "Genetic transformation of forest
  trees" is in Production with no galley; step 7 adds one, since the set
  is meant for articles with full text.

Enabling DRIVER:

1. Sign in as `dbarnes`. Settings › Website › "Plugins", tick "DRIVER".
   The notice reads 'The plugin "DRIVER" has been enabled.'
2. Signed out, open
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver`.
   It lists `article/1` and `article/17`, each with the setSpecs
   `publicknowledge:ART` and `driver`.

Unpublishing an article in its issue (works):

3. As `dbarnes`, open submission 17 › "Title & Abstract" › "Unpublish",
   and confirm "Unpublish".
4. Signed out, open the same `set=driver` list: `article/17` is listed,
   "This record has been deleted.", setSpecs `publicknowledge:ART` and
   `driver`.

Deleting the issue:

5. As `dbarnes`, open Issues › "Back Issues", open the arrow of "Vol. 1
   No. 2 (2014)", press "Delete" and answer "OK" to "Are you sure you
   wish to delete this item? This action cannot be undone."
6. Signed out, open the same `set=driver` list, then
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/1`
   (the identifier's middle part is the install's `repository_id`), and
   the journal's whole list,
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.

Unpublishing an article published without an issue (main only):

7. As `dbarnes`, open submission 5 › "Galleys" › "Add galley", label
   "PDF", "Save", and upload a PDF as "Article Text".
8. Submission 5 › "Title & Abstract" › "Schedule For Publication",
   choose "Don't Assign To An Issue", press "Confirm", then "Schedule For
   Publication" in the question ("…This will be published immediately
   without any issue association.…").
9. Signed out, the `set=driver` list shows `article/5` with `driver`.
10. As `dbarnes`, submission 5 › "Unpublish", confirm "Unpublish".
11. Signed out, open the `set=driver` list and GetRecord of `article/5`.

**Expected.** After step 6, `article/1` is listed in the `driver` set as
a deleted record and its header names `driver`, as `article/17`'s does
after step 4. After step 11, the same for `article/5`.

**Observed.** After step 6 the `driver` list holds `article/17` alone;
`article/1` is not in it, live or deleted. Its GetRecord shows:

```
OAI Identifier	oai:ojs2.localhost:article/1 oai_dc formats
Datestamp	2026-09-30T22:44:41Z
setSpec	publicknowledge:ART Identifiers Records

This record has been deleted.
```

The journal's whole list does report `article/1` as deleted, with
`publicknowledge:ART` only. After step 11, the same for `article/5`.
Both actions answered 200 and showed no error; each wrote to the server
log:

```
Plugin APP\plugins\generic\driver\DRIVERPlugin failed to handle the hook ArticleTombstoneManager::insertArticleTombstone
TypeError: APP\issue\Repository::get(): Argument #1 ($id) must be of type int, null given, called in …/plugins/generic/driver/DriverPlugin.php on line 221 and defined in …/classes/issue/Repository.php:70
#1 …/plugins/generic/driver/DriverPlugin.php(145): APP\plugins\generic\driver\DRIVERPlugin->isDRIVERArticle(1, 1)
```

On 3.5 the same lines name lines 208 and 133. Step 3 logged nothing.

## Cause

When an article leaves publication, OJS writes a deleted record (a
tombstone) and calls the hook
`ArticleTombstoneManager::insertArticleTombstone`. DRIVER's handler,
`DRIVERPlugin::insertDRIVERArticleTombstone()`, asks
`isDRIVERArticle()` whether the article belongs to the set, and if so
stores the tombstone setting `driver`, which `isDRIVERRecord()` later
reads to add `driver` to the deleted record's header.

`isDRIVERArticle()` (`plugins/generic/driver/DRIVERPlugin.php`, line
221 on main) assumes the current publication has an issue:

```php
$issue = Repo::issue()->get($publication->getData('issueId'));
```

`IssueRepository::get(int $id)` refuses `null` with a TypeError. On main
and 3.5, `Hook::run()` catches a plugin's exception and logs it, so the
withdrawal goes through and only the `driver` setting is never stored.
`isDRIVERArticle()` must handle a publication without an issue, as
`isDRIVERRecord()` does for live records.

Two screens reach it with no issue:

- **Deleting a published issue.** `IssueGridHandler::deleteIssue()`
  saves each of the issue's publications as unpublished with `issueId`
  null in one `edit()`, and only then writes the tombstone: on main it
  calls `ArticleTombstoneManager::reconcileTombstonesOnUnpublish()`
  itself, which reaches the hook through `insertIdentifierTombstone()`;
  on 3.5 the tombstone comes from `Submission\Repository::updateStatus()`
  after the loop. Either way the hook sees no issue.
- **Unpublishing an article published without an issue** (main):
  "Don't Assign To An Issue" came with continuous publication,
  `pkp/ojs#5039` for `pkp/pkp-lib#9295`.

The line was written for `IssueDAO::getById()`, which answered `null`
for a missing id; [88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7)
(the Issue repository refactor) swapped in `Repo::issue()->get()`, whose
`int` parameter throws instead. Its twin, `isDRIVERRecord()`, holds a
copy of the same test; `pkp/ojs#5674` for `pkp/pkp-lib#12922`
([4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761))
taught that copy to handle a publication without an issue and left
`isDRIVERArticle()` as it was.

Reach:

- Only the `driver` set: the journal's own OAI-PMH lists report the
  deleted records (on screen, step 6).
- A journal that requires subscriptions: the same TypeError, before the
  subscription test is reached (code).
- 3.4 (code): `deleteIssue()` saves `issueId` as `''`, which
  `Repo::issue()->get()` refuses with the same TypeError, and
  `Hook::run()` there catches nothing. So "Delete" answers a server
  error after the first article has been unpublished, its deleted
  record written without `driver`, and before the issue is deleted;
  each retry gets one article further.
- 3.3 (code): `IssueDAO::getById()` answers `null`, so an open journal
  marks the records correctly. On a journal that requires
  subscriptions, `isDRIVERArticle()` calls `getAccessStatus()` on
  `null`, `HookRegistry::call()` catches nothing, and "Delete" fails the
  same way.
- Other calls that pass a publication's `issueId` to
  `Repo::issue()->get()` (the article page, JATS, Lens, URN, native
  export, `Submission`) each test it first (code).

## Proposed fix

Two changes, in one repository
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-misses-withdrawn-articles/fix.diff)):

1. In `DRIVERPlugin`, give `isDRIVERArticle()` the no-issue handling
   `isDRIVERRecord()` already has, and let `isDRIVERRecord()` call it for
   live records, so the two copies cannot drift again:

   ```diff
            if (!isset($row['tombstone_id'])) {
   -            … (the membership test, 40 lines)
   +            return $this->isDRIVERArticle((int) $row['journal_id'], (int) $row['submission_id']);
   …
   -        $issue = Repo::issue()->get($publication->getData('issueId'));
   +        $issueId = $publication->getData('issueId');
   +        $issue = $issueId ? Repo::issue()->get($issueId) : null;
   ```

   plus the four `$issue &&` / `!$issue ||` tests of the subscription
   branch, as in `isDRIVERRecord()`. This covers an article published
   without an issue, whose deleted record gets the mark its live record
   had.

2. In `IssueGridHandler::deleteIssue()`, write the tombstone while the
   publication still names its issue, and clear the issue after:

   ```diff
   -                    Repo::publication()->edit(
   -                        $publication,
   -                        ['issueId' => null, 'status' => Publication::STATUS_QUEUED]
   -                    );
   +                    Repo::publication()->edit($publication, ['status' => Publication::STATUS_QUEUED]);
                        …
                        (new ArticleTombstoneManager())->reconcileTombstonesOnUnpublish(…);
   +                    Repo::publication()->edit($unpublishedPublication, ['issueId' => null]);
   ```

   Without it, change 1 alone still loses the mark on a journal that
   requires subscriptions for an article that is open only through its
   issue (an open-access issue, the article itself not marked open):
   once the issue is cleared, the test no longer sees the issue that
   made it open. With it, every tombstone hook judges the article as it
   was published.

Tried on `main` with both changes: steps 6 and 11 list `article/1` and
`article/5` as deleted with `driver`, and the log stays empty. Change 1
alone was also checked on a journal switched to "The journal will
require subscriptions…", with the same answers with the fix in and out:
an article published without an issue that is not open access stays
out of the set, live and withdrawn, and article 17 keeps its mark. The
subscription case change 2 is for (open issue, article not open) was
read in the code, not tried.

**Alternatives.**

- Change 1 without change 2: fixes open journals and articles published
  without an issue, leaves the subscription case above.
- Only guard the one line in `isDRIVERArticle()`: a journal that
  requires subscriptions then fails one line later.

**What goes with it.**

- No data repair. A stored tombstone keeps no trace of the issue or
  access the article had, so the missing `driver` marks cannot be
  restored reliably by a migration; the affected records are few.
- Backport: 3.5 takes change 1 as written (it also lacks the
  `isDRIVERRecord()` handling, which the shared test brings); for change
  2, 3.5's `deleteIssue()` must call `updateStatus()` before clearing
  `issueId`. 3.4 is the same as 3.5. 3.3 needs only the `$issue &&`
  tests on the subscription branch.
- The test that would have caught it: an OJS unit test of
  `isDRIVERArticle()` for a publication without an issue, on an open and
  on a subscription journal; and the e2e scenario, a **Planned** item in
  spec U19.

Medium: two files, and `deleteIssue()` changes the order every
tombstone hook sees; no data repair.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-misses-withdrawn-articles/walk.js),
  run on an OJS install freshly loaded from the default dataset with
  `node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-misses-withdrawn-articles/walk.js`
  (on 3.5 it skips steps 7–11). After the walk it reads the tombstones'
  stored `driver` setting: `article/17` 1, `article/1` and `article/5`
  none.
- The subscription check of change 1:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-misses-withdrawn-articles/neighbour.js),
  on `main`, with change 1 in and out.
- Walked: `main` and 3.5, OJS, PostgreSQL, datasets pkp/datasets
  38ab955 (2026-09-30). On 3.5 the walk before step 7 matched main. The
  fault does not depend on the database.
- Tips: OJS `main`
  [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
  pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
  3.5 [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
  pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
  3.4 [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
  pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
  3.3 [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
  pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads: `DRIVERPlugin::isDRIVERArticle()` and `isDRIVERRecord()`
  on every line; `IssueGridHandler::deleteIssue()` on every line (main
  and 3.5 `classes/controllers/grid/issues/IssueGridHandler.php`, 3.3
  `.inc.php`); `ArticleTombstoneManager::insertIdentifierTombstone()`
  (main) and `insertArticleTombstone()` (3.5, 3.4, 3.3), which call the
  hook after storing the tombstone; `Hook::run()` (main, 3.5: catches a
  plugin's `Throwable` via `PluginFailureHandler`; 3.4: no catch) and
  3.3's `HookRegistry::call()` (no catch); 3.4
  `IssueRepository::get(int $id)`, 3.3 `IssueDAO::getById()`.
- Not walked: 3.4 and 3.3, so their server errors are unverified, and
  whether 3.4's log reads "null given" or "string given". OMP and OPS
  have no DRIVER plugin.
- Upstream search (pkp/pkp-lib, pkp/ojs, issues and PRs, open and
  closed): "DRIVER plugin", "DRIVER tombstone", "DRIVER issue null",
  "delete issue OAI tombstone", `isDRIVERArticle`,
  `insertDRIVERArticleTombstone`, `insertArticleTombstone`.
  `pkp/pkp-lib#10830` (the set returned no records; fixed) is another
  fault.
