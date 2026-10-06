# Rebuilding the search index of one journal, press or server empties Search on all the others; journals stay empty

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; OJS and OPS refuse a path, OMP's tool takes none)
- **Introduced**
  - database search driver: `pkp/ojs#4963`, `pkp/omp#2081`, `pkp/ops#1067` for `pkp/pkp-lib#8920` · [71a7bfccec](https://github.com/pkp/ojs/commit/71a7bfccec891e519f676c8edbdf36f0265923da), [a25dff8b5f](https://github.com/pkp/omp/commit/a25dff8b5f7fc4661450f6232637a52618b91fd9), [43359941c6](https://github.com/pkp/ops/commit/43359941c6c51896b62723dcaf74bbf375bd2082) · 2025-08-01 · Alec Smecher (asmecher)
  - OpenSearch driver: `pkp/ojs#5267`, `pkp/omp#2208`, `pkp/ops#1179` for `pkp/pkp-lib#8920` · [13bd3b2eaa](https://github.com/pkp/ojs/commit/13bd3b2eaa5a942c05f9f0a57b1cdeab4636ce24), [40eb4dcd6d](https://github.com/pkp/omp/commit/40eb4dcd6dcd428d90c56d1e81c55c16abbc7309), [9f920948da](https://github.com/pkp/ops/commit/9f920948da7d3df26012733f7a25d576d51bfdc6) · 2026-01-22 · Alec Smecher (asmecher)
  - OPS on 3.4 and 3.5: `pkp/ops#146` for `pkp/pkp-lib#6091` · [5a4d5f4a61](https://github.com/pkp/ops/commit/5a4d5f4a61ec2b739155872f7e42b295a88b3891) · 2021-04-16 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U15 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#omp1), [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#ops3), [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#ojs4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A system administrator rebuilds the search index for one journal, press
or server with `php tools/rebuildSearchIndex.php <path>`, as the tool's
usage line offers. They expect only that one to be re-indexed.

Instead the tool empties the whole site's index, without a word. On a
journal site only the named journal is indexed again, so Search on every
other journal answers "No Results" for everything until someone rebuilds
the whole site. On a press or a preprint server every press or server is
queued for re-indexing, and Search on the others finds nothing until the
queue reaches their items. With the default settings the queue only moves
as visitors open pages, at most 30 items per page visit, so a site with
3,000 items needs at least 100 page visits before all of them are
searchable again.

It needs a site that hosts more than one journal, press or server.
Released versions have only the preprint-server half.

## Impact

- **Lost**: on a journal site, Search on every other journal, until a
  full rebuild. On a press or server, Search on every other press or
  server, until the queue has re-indexed their items.
- **Who**: the system administrator who rebuilds one of several
  journals, presses or servers by path; then everyone searching the
  others.
- **Way round**: run the tool without a path, which rebuilds the whole
  site and empties its Search only while the queue runs.

Medium: on `main`, a one-journal rebuild leaves every other journal
unsearchable until a full rebuild, silently, but only the
administrator's path option reaches it. The press and server half, the
only one released (OPS 3.4 and 3.5), would alone be low, since Search
returns once the queue is worked off. Per-journal rebuilds as a routine
step would raise it to high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), with its
  context `publicknowledge`, and the dataset's own `config.inc.php`.
  It has the defaults `[search] driver = database` and
  `[queues] job_runner = On`, so each page request works off up to 30
  queued jobs when it ends.
- A second journal (press, server), since the dataset has only one: as
  `admin`, Administration › "Hosted Journals" ("Hosted Presses",
  "Hosted Servers") › "Create Journal" ("Create Press", "Create
  Server"): name "u15i Second", initials "U15I", path `u15i`, English,
  enabled, "Save". It holds no submissions.
- A shell on the server, in the application's directory.

The word searched: OJS "Signalling" (submission 1, "Signalling Theory
Dividends"), OMP "Bomb" (submission 5, "Bomb Canada and Other Unkind
Remarks in the American Media"), OPS "Hansen" (submission 8, "Hansen &
Pinto: Reason Reclaimed").

1. As a visitor, open `publicknowledge`'s Search page
   (`/index.php/publicknowledge/search`), type the word and press Enter.
   The item is listed ("Found one item.", on OMP "One title was found
   which matched your search for "Bomb".").
2. Run `php lib/pkp/tools/jobs.php total`: "We have 0 queued jobs".
3. Run `php tools/rebuildSearchIndex.php u15i`.
4. Run `php lib/pkp/tools/jobs.php total`.
5. As a visitor, search `publicknowledge` for the word again.
6. Run `php lib/pkp/tools/jobs.php work --stop-when-empty`, which works
   off what is left in the queue. With the job runner on, step 5's page
   visits have already done so; with it off, this is where the queued
   items are indexed.
7. As a visitor, search `publicknowledge` for the word again.

**Expected**: the rebuild for `u15i` touches only `u15i`, which holds
nothing. Step 4 says "We have 0 queued jobs", and steps 5 and 7 list the
item as step 1 did.

**Observed**: step 3 prints nothing and exits 0 on the three apps.

- OJS: step 4 says "We have 0 queued jobs". Steps 5 and 7 show "No
  Results".
- OMP: step 4 says "We have 18 queued jobs", OPS "We have 19 queued
  jobs". That is one job per submission of `publicknowledge`, which the
  command did not name. Steps 5 and 7 list the item, because opening the
  Search page in step 5 let the job runner index those items before the
  search ran.

On 3.5, the same steps: OJS rebuilds `u15i` alone ("Indexing "u15i
Second" ... 0 articles scheduled for indexation") and `publicknowledge`
stays searchable. OMP refuses with "This search implementation does not
allow per-press re-indexing.". OPS prints "Indexing "Public Knowledge
Preprint Server" ... 19 articles scheduled for indexation" and queues 19
jobs, as on `main`.

## Cause

Each app's `tools/rebuildSearchIndex.php`, `rebuildSearchIndex::execute()`,
resolves the optional path to a context, refusing an unknown one. It
then always empties the whole index before re-indexing:

```php
$searchEngine->flush(Config::getVar('search_index_name', 'submissions'));
$searchEngine->deleteIndex(Config::getVar('search_index_name', 'submissions'));  // in a try
$searchEngine->createIndex(Config::getVar('search_index_name', 'submissions'));
```

On the database driver, `DatabaseEngine::flush()` truncates
`submissions_fulltext` for the whole site. That line came with the
Scout port of the tool (the first Introduced item). On OpenSearch,
`flush()` only persists the index; the site's one index is dropped by
`deleteIndex()`, which came in January 2026 (the second item).

The re-indexing that follows is filtered by context:

```php
->filterByContextIds([$journal?->getId() ?? Application::SITE_CONTEXT_ID_ALL])
```

In OJS `$journal` is the named journal, so only that journal is indexed
again. The other journals' entries are gone for good. The OMP and OPS
copies put the context in `$press` and `$server` but kept the filter's
`$journal`, which they never set. So the filter always means "all
contexts", and every press or server is queued again.
`DatabaseEngine::update()` queues one `UpdateSubmissionSearchJob` per
submission. The others' items are therefore out of Search until their
jobs run: at the end of page requests (`job_runner`), or in a queue
worker.

Until 3.5 the tool called the app's `rebuildIndex()`.
`ArticleSearchIndex::rebuildIndex()` (OJS) cleared only the named
journal's entries (`SubmissionSearchDAO::clearIndex($contextId)`), so the
journal half is a regression. `MonographSearchIndex::rebuildIndex()`
(OMP) refused a press path. The OPS half is older:
`PreprintSearchIndex::rebuildIndex()` meant to refuse a server path, but
it checks `is_a($server, 'Server')`. That check has never matched since
the class became `APP\server\Server` (the third Introduced item), so
OPS 3.4 and 3.5 clear the whole index and queue every server.

Reach:

- Both search drivers: the database driver (walked) and OpenSearch
  (code).
- The three apps' copies of the tool (walked). The only other caller of
  `flush()`, `Installer::rebuildSearchIndex()`, rebuilds the whole site
  at install and upgrade, as it should (code).

## Proposed fix

In each app's `tools/rebuildSearchIndex.php`, empty and recreate the
index only for a site-wide rebuild, and filter on the context the tool
resolved. A rebuild for one context needs no clearing, because both
engines' `update()` delete each submission's own entries before
indexing it again. With a path, the index is still created when there is
none yet (OpenSearch's first run), and an existing one is kept. The OMP
copy:

```diff
         $searchEngine = app(\Laravel\Scout\EngineManager::class)->engine();
-        $searchEngine->flush(Config::getVar('search_index_name', 'submissions'));
-        try {
-            $searchEngine->deleteIndex(Config::getVar('search_index_name', 'submissions'));
-        } catch (Throwable $t) {
-            // Ignore index deletion problems
+        if (!$press) {
+            // A site-wide rebuild starts from an empty index.
+            $searchEngine->flush(Config::getVar('search_index_name', 'submissions'));
+            try {
+                $searchEngine->deleteIndex(Config::getVar('search_index_name', 'submissions'));
+            } catch (Throwable $t) {
+                // Ignore index deletion problems
+            }
+            $searchEngine->createIndex(Config::getVar('search_index_name', 'submissions'));
+        } else {
+            // One press: keep the other presses' entries. ...
+            try {
+                $searchEngine->createIndex(Config::getVar('search_index_name', 'submissions'));
+            } catch (Throwable $t) {
+                // The index already exists
+            }
         }
-        $searchEngine->createIndex(Config::getVar('search_index_name', 'submissions'));
 ...
-            ->filterByContextIds([$journal?->getId() ?? Application::SITE_CONTEXT_ID_ALL])
+            ->filterByContextIds([$press?->getId() ?? Application::SITE_CONTEXT_ID_ALL])
```

The full diffs, one per app:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/fix-ops.diff).

The tool's usage line still offers the path, and the filter still reads
a context, so the per-context rebuild stays; the fix makes it one in
all three apps. 3.5's OJS deleted every entry of the journal's
submissions and queued them again. The fix replaces the entries of each
submission the journal has now. On the database driver that comes to
the same thing, since a deleted submission's `submissions_fulltext`
rows go with it (foreign key, on delete cascade).

On OpenSearch it does not. No listener removes a deleted submission's
document, and a per-context rebuild leaves such documents in place; only
a full rebuild drops them.

The fix was tried on `main` on the database driver:

- The Steps then queue 0 jobs and list the item at steps 5 and 7 on the
  three apps.
- A rebuild without a path, and one for `publicknowledge` (which holds
  every submission of the site: 20, 18, 19), still queue them all and
  leave the item listed, as without the fix.
- The create-when-missing branch was added after that trial and re-tried
  on OJS with the same results. On OpenSearch it was not tried (no
  OpenSearch server).

**Alternatives**:

- Rename `$press` and `$server` to `$journal` alone: OMP and OPS would
  then lose the other presses' and servers' entries for good, as OJS
  does today.
- Refuse a path in OMP and OPS, as 3.5's OMP did: OJS still clears the
  whole site, and an option the usage line offers is dropped.
- Move the tool into pkp-lib as one shared class: it ends the three
  copies that drifted apart, but is a larger change than the fault
  needs.

**What goes with it**:

- On OpenSearch, a rebuild with a path keeps the existing index's
  mapping, so metadata languages added since the last full rebuild still
  need one. Worth a line in the usage text.
- The tool's `Config::getVar('search_index_name', 'submissions')` reads
  a config section named `search_index_name` and returns null. Both
  engines ignore the name and read `[search] search_index_name`, so
  nothing breaks, but `Config::getVar('search', 'search_index_name',
  'submissions')` is what the lines mean.
- OMP's `search.cli.rebuildIndex.indexingByPressNotSupported` and OPS's
  `indexingByServerNotSupported` are unused on `main` and could go.
- Backport to OPS 3.5 and 3.4: `is_a($server, Server::class)` restores
  the intended refusal. Alternatively, a per-server clear like OJS's
  `clearIndex($contextId)` makes the path work there.
- Guard: a unit test of the tool's context handling in each app, or an
  e2e scenario in the search spec (a rebuild by path keeps another
  context's results).

A proposal; the team decides.

Medium: the same few lines in three app repositories, with no data
repair, tried on the database driver.

## Evidence

- Kept script that takes the Steps on an install loaded from PKP's
  default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/walk.js),
  helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/lib.js):
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/walk.js`
  after `npm run fleet-prep -- --feature issues --dataset 1 --reset`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `nb` as the last
  argument runs the neighbour check, the two rebuilds that must not
  change).
- Installs on PostgreSQL loaded from pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`.
  MySQL not checked; nothing here depends on the database.
- The emptying, measured in the database on OPS 3.5 after the walk
  (the `u15i` server present): `submission_search_objects` held 136
  rows for 17 preprints. Right after `php tools/rebuildSearchIndex.php
  u15i` it held 0, with 19 jobs queued, and 136 again once the queue
  had run.
- main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and OPS
  c8af945bb7 (lib/pkp 3dc90c81a6). Code read: each app's
  `tools/rebuildSearchIndex.php`; `DatabaseEngine` and
  `OpenSearchEngine` (`update()`, `delete()`, `flush()`,
  `createIndex()`, `deleteIndex()`); `UpdateSubmissionSearchJob`;
  `UpdateSubmissionInSearchIndex` (the only listener calling the
  engine); `SubmissionSearchMigration` (the cascade);
  `Installer::rebuildSearchIndex()`; `Config::getVar()`. Also searched:
  other `flush()` callers in the apps and `lib/pkp`, and `$journal` in
  OMP's and OPS's tools.
- 3.5: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and OPS
  38b61882d3 (lib/pkp cf3f984335). Code read: the three tools and the
  three `rebuildIndex()` methods, and
  `SubmissionSearchDAO::clearIndex()`. The walk agrees with each.
- 3.4 and 3.3, code only: `upstream/stable-3_4_0` (OJS d68934d0d1, OMP
  0aec65441, OPS acd8ae704b; lib/pkp 767353f4fe) and
  `upstream/stable-3_3_0` (OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161; lib/pkp ac3fa73402), the same tools and `rebuildIndex()`
  methods. On 3.3, OJS's and OPS's `rebuildIndex()` refuse a context
  with `indexingByJournalNotSupported`, because their unnamespaced
  `Journal` class matches the check.
- Introduced: `git blame` on the flush, delete and filter lines of each
  tool. OJS's site-wide flush with a path came in 71a7bfccec, the
  current filter shape in 6dafc43adde, in the same PR. OPS's `is_a()`
  check came with the rename of Journal to Server (c8046900c3,
  2021-02-14), when the class was still unnamespaced.
- Not driven: the OpenSearch driver; it was read in the code only.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library,
  issues and PRs, by the tool's name and the symptom's words.
  `pkp/pkp-lib#8915` (closed) changed the older tool's clearing, not
  this.
