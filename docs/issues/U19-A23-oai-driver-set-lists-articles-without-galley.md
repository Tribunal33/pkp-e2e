# DRIVER set offers harvesters articles that have no full text

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; the galley check gets an array there, which works)
  - 3.3: none (code; the same)
- **Introduced** `pkp/ojs#4561` for `pkp/pkp-lib#10653` · [00d315a20a](https://github.com/pkp/ojs/commit/00d315a20abad5553ced56867333f2e75f7e18d7) · 2024-12-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a23)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

With the "DRIVER" plugin enabled, a journal publishes an article that has
no galley. The journal's OAI-PMH `driver` set is meant only for
open-access articles with full text, but it lists this article beside the
ones that have a galley, and the article's OAI record header carries the
`driver` set. If the article is later unpublished, its deleted record
keeps the `driver` mark.

Only the missing-galley check is wrong. Subscription-only articles are
still kept out, and any galley counts as full text, a remote-URL one
included. A harvester that follows the set takes a metadata-only record
for a full-text one, and the journal is not told.

## Impact

- **What goes wrong.** The OAI-PMH `driver` set promises full text for
  every member, and DRIVER-style harvesters index its members on that
  promise. A fix does not correct records already harvested, because
  their datestamps do not move, so a harvester that asks only for changed
  records never fetches them again.
- **Who.** Journals that enable "DRIVER", which is off on a new journal,
  and publish an article without a galley, such as an abstract-only item.
- **Way round.** Give the article a galley. Unpublishing it is not a way
  round, because its deleted record keeps the `driver` mark.

Medium: the set silently breaks its one promise, full text, for every
article without a galley, and keeps marking those articles after they are
withdrawn. It stays medium rather than high because only journals that
enable DRIVER and publish galley-less articles meet it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (and `stable-3_5_0`). Its journal
  `publicknowledge` is open access. Issue "Vol. 1 No. 2 (2014)" is
  published and holds articles 1 "Signalling Theory Dividends" and 17
  "Antimicrobial, heavy metal resistance and plasmid profile of coliforms
  isolated from nosocomial infections in a hospital in Isfahan, Iran",
  each with a PDF galley. Submission 5 "Genetic transformation of forest
  trees" is in Production with no galley. Step 3 publishes it without
  adding one.

Steps:

1. Sign in as `dbarnes`. Settings › Website › "Plugins", tick "DRIVER".
2. Signed out, open
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver`.
   It lists `article/1` and `article/17`, each with the setSpecs
   `publicknowledge:ART` and `driver`.
3. As `dbarnes`, open submission 5 › "Title & Abstract" › "Schedule For
   Publication". In "Review Publishing Details" choose "Assign To
   Current/Back Issue" and "Vol. 1 No. 2 (2014)", press "Confirm", then
   "Publish" in the question ("All publication requirements have been
   met. This will be published immediately in Vol. 1 No. 2 (2014).…").
   [3.5: "Schedule For Publication" asks "Select an issue to schedule for
   publication"; choose "Vol. 1 No. 2 (2014)", "Save", then "Publish".]
4. Signed out, open `/index.php/publicknowledge/article/view/5`: the
   title, authors and abstract, and no galley link.
5. Signed out, open the same `set=driver` list, then
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/5`
   (the identifier's middle part is the install's `repository_id`).
6. As `dbarnes`, open submission 5 › "Title & Abstract" › "Unpublish",
   and confirm "Unpublish".
7. Signed out, open the GetRecord address of step 5 again.

**Expected.** After step 5 the `driver` list holds `article/1` and
`article/17` only, and `article/5`'s header names `publicknowledge:ART`
only. After step 7 the deleted record names `publicknowledge:ART` only.

**Observed.** After step 5 the `driver` list holds `article/1`,
`article/5` and `article/17`, each with `publicknowledge:ART` and
`driver`. GetRecord of `article/5` shows:

```
OAI Identifier	oai:ojs2.localhost:article/5 oai_dc formats
Datestamp	2026-09-30T23:52:40Z
setSpec	publicknowledge:ART Identifiers Records
setSpec	driver Identifiers Records
```

After step 7 the same header follows with "This record has been
deleted.". No request failed and the server log stayed empty.

## Cause

`DRIVERPlugin` decides membership twice. `isDRIVERRecord()` judges a live
record in a list or GetRecord answer. `isDRIVERArticle()` judges an
article as it is withdrawn, to store the `driver` mark on its deleted
record. Both end with the same full-text check
(`plugins/generic/driver/DRIVERPlugin.php`, lines 198–199 and 252–253 on
main):

```php
$galleys = $publication->getData('galleys');
if (!empty($galleys)) {
    return $status == DRIVER_ACCESS_OPEN;
}
return false;
```

A publication's `galleys` is a `LazyCollection`, set in
`APP\publication\DAO::fromRow()`. `empty()` on an object is always false,
so the check passes for a publication with no galley, and every open
article is a member. The open-access part (`$status`) is computed before
this check and is right. The galleys the check counts come from the
galley collector filtered by publication only, so a remote-URL galley
counts as full text, before this fault and after a fix.

The check was written for an array. Up to 3.4 it read
`$submission->getGalleys()`, which answers
`Repo::galley()->getCollector()…->getMany()->toArray()`.
[00d315a20a](https://github.com/pkp/ojs/commit/00d315a20abad5553ced56867333f2e75f7e18d7)
replaced that deprecated call with `$publication->getData('galleys')` in
both copies. After that change the `empty()` check no longer looked at
the galleys.

Reach:

- Live records in `ListRecords`, `ListIdentifiers` and `GetRecord`, in
  every metadata format: the header's `driver` setSpec and the set's
  membership (on screen, step 5).
- Deleted records: `insertDRIVERArticleTombstone()` stores the `driver`
  mark for an article without a galley (on screen, step 7).
- Other `empty()` or truthiness checks on a publication's or submission's
  lazy collections still give the right result, each for its own reason
  (code):
  - The JATS template's `ArticleFront`, `ArticleHandler` and
    `Publication\Repository::version()` guard a loop that then does
    nothing.
  - `IssueAction` (line 114) guards an `if`/`elseif` on the submission's
    publications, and a submission always has one.
  - `SubEditorsDAO` (line 193) guards a `whereIn()` on the category ids,
    which matches nothing for an empty list.
  - `PKPPublication::getPrimaryAuthor()` guards a loop that finds no
    author and returns nothing.
- The commit's other two edits (DataCite, `article_summary.tpl`) loop
  over the galleys and are right (code).

## Proposed fix

Count the galleys instead of testing the collection for emptiness, in
both copies
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-lists-articles-without-galley/fix.diff)):

```diff
             // is there a full text
-            $galleys = $publication->getData('galleys');
-            if (!empty($galleys)) {
+            if (count($publication->getData('galleys')) > 0) {
                 return $status == DRIVER_ACCESS_OPEN;
             }
```

pkp-lib already tests a lazy collection's size this way
(`count($submission->getData('publications')) > 1` in
`PKP\publication\Repository`). `count(null)` would throw on PHP 8, but
`galleys` is never null here: both methods load the publication from the
database, and `fromRow()` always sets it.

Tried on `main`. After step 5 the set lists `article/1` and `article/17`
only, and `article/5`'s header names only `publicknowledge:ART`. After
step 7 its deleted record names only `publicknowledge:ART`, and no
`driver` mark is stored for it. The fix leaves the neighbours alone: with
or without it, `article/1` keeps `driver` in GetRecord, and `article/5`
stays in the journal's unfiltered list.

**Alternatives.**

- `->isNotEmpty()`: the same result, but it works only on a collection,
  while `count()` takes an array or a collection.
- Go back to `Submission::getGalleys()`: it is deprecated, and the
  introducing change removed it on purpose.

**What goes with it.**

- The fix in
  [U19-A11-oai-driver-set-misses-withdrawn-articles.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A11-oai-driver-set-misses-withdrawn-articles.md)
  replaces the live-record part of `isDRIVERRecord()` with a call to
  `isDRIVERArticle()`. That removes this report's first copy of the
  check, so after that fix only the second hunk here, in
  `isDRIVERArticle()`, is needed. The first hunk would then no longer
  apply. Either fix works without the other.
- No data repair: live records are judged on each request. Deleted
  records already marked `driver` for an article without a galley keep
  the mark, and a stored tombstone does not say whether the article had
  a galley, so they cannot be told apart.
- Backport: the diff applies to 3.5 as written. 3.4 and 3.3 do not need
  it.
- The test that would have caught it: an OJS unit test of
  `isDRIVERRecord()` and `isDRIVERArticle()` for an open publication
  without galleys.

Small: one line changed in two places of one file, with no data repair.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-lists-articles-without-galley/walk.js),
  run with
  `node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-lists-articles-without-galley/walk.js`
  on an OJS install freshly loaded from the default dataset. It also runs
  the two neighbour checks. After the walk it reads the deleted record's
  stored `driver` setting (`1` without the fix, absent with it) and the
  number of galleys on submission 5 (0 before and after publishing).
- Fix tried on `main` with that walk; on 3.5 the diff was checked with
  `patch --dry-run` only.
- Walked: `main` and 3.5, OJS, PostgreSQL, datasets pkp/datasets 38ab955
  (2026-09-30). Both walks saw the same answers. The fault does not
  depend on the database.
- Tips: OJS `main`
  [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
  pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
  3.5 [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
  pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
  3.4 [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
  pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
  3.3 [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
  pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- 3.4 and 3.3 "none" rests on these lines:
  - 3.4: `plugins/generic/driver/DRIVERPlugin.php` lines 184–185 and
    236–237 run `!empty($submission->getGalleys())`, and
    `classes/submission/Submission.php` lines 195–210 return
    `->getMany()->toArray()`, an array.
  - 3.3: `plugins/generic/driver/DRIVERPlugin.inc.php` lines 167–168 and
    219–220 do the same, and `classes/submission/Submission.inc.php`
    lines 232–239 return the representation DAO's result `->toArray()`.
  - On both lines an article with no galley gives an empty array, so
    `empty()` keeps it out.
- The OAI datestamp is `GREATEST(a.last_modified, i.last_modified,
  p.last_modified)` (`OAIDAO`). The fix writes nothing, so no datestamp
  moves.
- The search for other instances covered every `empty()` and truthiness
  check on `getData('galleys'|'authors'|'publications'|'categoryIds'|…)`
  in OJS, OMP, OPS and pkp-lib on `main`.
- Introduced: `git blame` on line 252 names 00d315a20a. Its PR is
  `pkp/ojs#4561` ("fix deprecated submission functions", merged
  2024-12-18), which links `pkp/pkp-lib#10653`.
- OMP and OPS have no DRIVER plugin.
- Upstream search (pkp/pkp-lib, pkp/ojs, issues and PRs, open and
  closed): "DRIVER galley", "DRIVER set", "DRIVER plugin", "driver oai",
  "OAI driver full text", `isDRIVERRecord`, `isDRIVERArticle`,
  "LazyCollection empty galleys". `pkp/pkp-lib#10830` (the set returned
  no records; fixed by `pkp/ojs#4615`) is another fault.
