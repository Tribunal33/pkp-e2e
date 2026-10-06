# A journal's `driver` OAI set lists articles that have no galley

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#4561` for `pkp/pkp-lib#10653` · [00d315a20a](https://github.com/pkp/ojs/commit/00d315a20abad5553ced56867333f2e75f7e18d7) · 2024-12-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a23)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester asking a journal for its `driver` set expects only
open-access articles with full text. With the "DRIVER" plugin enabled,
an open-access article published with no galley is listed in the set
beside the articles that have one. Its record carries the set's name
wherever it is listed: in the journal's list without a set, in the
identifiers list and when asked for alone.

When such an article is unpublished, the deleted record it leaves is
stored as belonging to the set as well.

The open-access half of the set's rule holds: an article that readers
must pay or sign in for stays out, with or without a galley.

## Impact

- **Lost:** no data, and the article's record is right. The set's
  promise of full text is not kept: a service that harvests it receives
  a record with nothing to fetch.
- **Who:** a journal with "DRIVER" enabled (it is off by default) that
  publishes an article with no galley. How many journals do is not
  known.
- **Way round:** adding a galley, which makes the article a rightful
  member, or disabling the plugin. Nothing keeps an article with no
  galley out of the set while the plugin is on.

Low: the record is right and nothing is missing from any list; the one
thing broken is the set's full-text rule, for articles published with
no galley, and nothing was shown to rely on that rule. It would be
medium once a service that harvests the set is shown to reject or flag
records without full text.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Its journal `publicknowledge`
  is open access and has two published articles, 1 and 17, each with a
  galley, in "Vol. 1 No. 2 (2014)". Submission 5, "Genetic
  transformation of forest trees", is in Production with no galley.

Steps:

1. Sign in as `admin`.
2. Settings › Website › "Plugins" › "Installed Plugins": under "Generic
   Plugins" tick "DRIVER". The page says 'The plugin "DRIVER" has been
   enabled.'
3. Open
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver`:
   it lists `article/1` and `article/17`.
4. From the dashboard open submission 5 and, under "Publication",
   "Title & Abstract". Press "Schedule For Publication". In "Review
   Publishing Details" choose "Publication Stage" "Version of Record
   (VoR)", "Revision Significance" "Major Revision", "Assign To
   Current/Back Issue" and the issue "Vol. 1 No. 2 (2014)"; press
   "Confirm", then "Publish". [3.5: under "Publication" open "Issue",
   press "Assign to Issue", choose "Vol. 1 No. 2 (2014)", "Save"; then
   "Schedule For Publication" and "Publish".]
5. Open the address of step 3 again, then the same address without
   `&set=driver`.
6. In submission 5 press "Unpublish" and confirm with "Unpublish". Open
   both addresses of step 5 again.

**Expected.** In step 5 the set lists `article/1` and `article/17`, as
in step 3, and the record of `article/5` in the list without a set has
the setSpec `publicknowledge:ART` alone. In step 6 the set is the same,
and the deleted record of `article/5` has that one setSpec.

**Observed.** In step 5 the set lists three records, each with the
setSpec values `publicknowledge:ART` and `driver`:

```
oai:ojs2.localhost:article/1
oai:ojs2.localhost:article/5
oai:ojs2.localhost:article/17
```

The list without a set names `driver` on `article/5` too. In step 6
both lists hold the deleted record of `article/5` with the setSpec
values `publicknowledge:ART` and `driver`.

## Cause

`DRIVERPlugin::isDRIVERRecord()` decides whether a live record belongs
to the set, and `DRIVERPlugin::isDRIVERArticle()` decides the same when
an article is unpublished, for the deleted record. Both first work out
whether the article is open access (from the journal's, the issue's
and the article's access settings) and then end with the full-text
test (`plugins/generic/driver/DRIVERPlugin.php`, lines 198 and 252 on
`main`):

```php
// is there a full text
$galleys = $publication->getData('galleys');
if (!empty($galleys)) {
    return $status == DRIVER_ACCESS_OPEN;
}
return false;
```

A publication's `galleys` is a `LazyCollection`
(`APP\publication\DAO::fromRow()`), and PHP's `empty()` is false for
any object, so the test passes for a publication with no galley. The
access test before it is untouched, so only open-access articles are
let in. The full-text test asks for any galley, whatever its kind (a
remote one, one with no file), as it did before the fault.

Until [00d315a20a](https://github.com/pkp/ojs/commit/00d315a20abad5553ced56867333f2e75f7e18d7)
("fix deprecated submission functions") the two lines read
`$galleys = $submission->getGalleys();`. That deprecated method
returns an array (`->getMany()->toArray()`), for which `empty()` is
right, and 3.4 and 3.3 still call it.

Reach:

- Every answer that carries a record's sets: ListRecords,
  ListIdentifiers and GetRecord, with and without `set=driver`, since
  the plugin adds the setSpec in `addSet()` (walked: the list with the
  set and without it, ListIdentifiers).
- Deleted records: `insertDRIVERArticleTombstone()` stores a `driver`
  setting with the deleted record of an article with no galley
  (`data_object_tombstone_settings`; walked, step 6).
- The other tests of this kind in OJS are safe. Three only guard a
  `foreach`, where an empty collection does no harm:
  `classes/publication/Repository.php:167`,
  `plugins/generic/jatsTemplate/classes/ArticleFront.php:490` and
  `classes/issue/maps/Schema.php:142` (issue galleys).
  `plugins/generic/crossref/filter/ArticleCrossrefXmlFilter.php:603`,
  `if (empty($galleys))`, is a real decision, but its parameter is
  typed `array` and its one caller passes an array it built. lib/pkp
  has none.

## Proposed fix

Recommended, tried: ask the collection, as the code around it does
(`$funders->isNotEmpty()`, `$citations->isNotEmpty()` in the JATS
template plugin). In both methods
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/fix.diff)):

```diff
-            $galleys = $publication->getData('galleys');
-            if (!empty($galleys)) {
+            if ($publication->getData('galleys')->isNotEmpty()) {
                 return $status == DRIVER_ACCESS_OPEN;
             }
```

Tried on `main`: in step 5 the set lists `article/1` and `article/17`,
and `article/5` has no `driver` setSpec in the list without a set. In
step 6 its deleted record has none either. Articles with a galley
behave as before: 1 and 17 stay in the set, and the deleted record of
17, unpublished after step 6, names `driver`.

**Alternatives**

- Go back to `$submission->getGalleys()`: it works, but the method is
  deprecated, which is why the introducing commit removed it.

**What goes with it**

- Marks already stored: the fix writes no wrong mark from then on and
  leaves the stored ones. No repair is proposed, and none is wanted:
  such an article was listed in the set while it was published, so a
  harvester that took it needs the deleted record in the set to drop
  it.
- The set's paging
  ([U19 A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A24-oai-driver-list-says-more-results.md)):
  the set's list says "There are more results." whenever the journal
  has a record outside the set, and this fix puts articles with no
  galley outside it. With this fix alone, step 5 lists the two members
  and offers "Resume".
- Order: the A24 fix first or together with this one. This diff and
  the one for
  [U19 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A11-oai-driver-set-misses-deleted-record-of-article-in-no-issue.md)
  touch the same lines of `DRIVERPlugin.php` and do not apply together
  as written: A11's makes one method call the other, after which this
  change is one line. One PR for the three is the simplest.
- Backport: the two lines are the same on `stable-3_5_0`.
- Guard: OJS has no test of the plugin. pkp-e2e's OAI-PMH scenario 10
  can cover it end to end (an article with no galley is not in the
  set). A unit test of `isDRIVERRecord()` is more than the fix: the
  method loads the journal through `DAORegistry::getDAO('JournalDAO')`
  and the submission and the issue through `Repo`, so all three must be
  mocked, or the full-text test moved into a method of its own first.

Small: two lines in one file, following a pattern the code already
uses, with no data repair, and the e2e scenario as its guard. A unit
test would need the mocks described above and is not counted.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/lib.js),
  run after `npm run fleet-prep -- --feature issues-a23 --dataset 3 --reset` with
  `PROBE_FEATURE=issues-a23 PROBE_AGENT=a23 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front of both for 3.5). It reads each
  OAI address as a harvester does, without a session. In step 6 it
  unpublishes submission 17 as well before it reads the lists, and it
  also reads ListIdentifiers after step 4.
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/fix.diff ojs`,
  walk.js, then `node bin/try-fix.js revert`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`). MySQL not checked;
  the fault is in PHP.
  - main: OJS 06fd981b01 (lib/pkp 2e377d27fc).
  - stable-3_5_0: OJS 18d097d94e (lib/pkp 1fb843f491), the same result
    with the bracketed step 4. Code read:
    `plugins/generic/driver/DRIVERPlugin.php`, lines 184 and 236, the
    same two tests; `classes/publication/DAO.php` fills `galleys` with
    the collector's `getMany()`.
  - 3.4 (code): OJS `stable-3_4_0` 9571d8fde7. `DRIVERPlugin.php` reads
    `$submission->getGalleys()`, which `classes/submission/Submission.php`
    answers with `->getMany()->toArray()`.
  - 3.3 (code): OJS `stable-3_3_0` 9fdb9bcf9a.
    `DRIVERPlugin.inc.php` reads `$submission->getGalleys()`, an array
    (`Submission.inc.php`, `->toArray()`).
- Introduced: the commit is in every 3.5 release; its PR's branch is
  named for `pkp/pkp-lib#10653`.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/ojs, issues and PRs,
  open and closed: "DRIVER plugin oai", "driver oai galley", "DRIVER
  oai", "DRIVERPlugin", "isDRIVERArticle", "isDRIVERRecord".
  `pkp/pkp-lib#10830` (closed with a fix, 2025) is another fault: the
  set listing no records at all.
- Not driven: a journal that sells subscriptions (the access test, read
  in the code); GetRecord.
- Unverified: whether any service harvests by this set today, and what
  it does with a record that has no full text.
