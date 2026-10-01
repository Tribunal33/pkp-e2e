# Harvesters of a journal's DRIVER set in OAI-PMH get repeated records, an error, or (3.5) only 100 records

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS (the set's record list stops after about 100 records)
  - 3.4: OJS (code; as 3.5)
  - 3.3: OJS (code; as 3.5)
- **Introduced** [d29ac627a3](https://github.com/pkp/ojs/commit/d29ac627a337fcc0feb759578da1a37606ac2a2e), the commit that added the DRIVER plugin (no pull request) · 2011-10-13 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a24)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

With the "DRIVER" plugin enabled, a harvester lists a journal's `driver`
set through OAI-PMH. On 3.5, 3.4 and 3.3 the list of records stops after
about 100 and says it is complete: an open access journal with more than
100 articles has the rest left out of the set, and nothing says so.

On main the list reaches the end of the set, but as soon as the journal
holds one record outside the set it says more records follow when none
do. The next request sends records already sent, or answers "No matching
records in this repository". A stretch of 100 records outside the set,
in the order the journal's OAI records are listed, ends the list there,
and the set's records after it are never sent.

A record is outside the set when only subscribers can read the article,
when the journal requires signing in to read content, or when the
article was withdrawn before the plugin was enabled (its deleted record
was never marked for the set).

## Impact

- **Lost**: the journal's open access articles in the harvested `driver`
  set. On 3.5 every record after about the 100th; on main the records
  after a stretch of 100 outside the set, plus duplicates and a wrong
  list size. Nobody is told.
- **Who**: journals that enable DRIVER (off by default), on every
  harvest of the set: on 3.5 any such journal with more than about 100
  open access articles; on main any with one record outside the set.
- **Way round**: none for the journal. A harvester can list all of the
  journal's records instead and keep those whose header names `driver`;
  those marks are right.

High: on the line journals run, the set DRIVER exists to publish
silently leaves out every article after about the first 100, for any
journal of that size that enables it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` for the first two groups and
  `stable-3_5_0` for the third. Its journal `publicknowledge` is open
  access; issue "Vol. 1 No. 2 (2014)" holds its two published articles,
  1 "Signalling Theory Dividends" and 17 "Antimicrobial, heavy metal
  resistance and plasmid profile of coliforms isolated from nosocomial
  infections in a hospital in Isfahan, Iran", each with a galley.
  "DRIVER" is off.
- Each group starts from a freshly loaded dataset. In the first two, the
  first step withdraws one article while DRIVER is off, so its deleted
  record is not marked for the set.
- The third group needs a list longer than one answer, which the dataset
  is not at the default of 100 records an answer: in `config.inc.php`,
  under `[oai]`, set `oai_max_records = 1`.

Repeating a record (main):

1. Sign in as `dbarnes`. Open submission 1, "Publication", choose
   "Version of Record 1.0" (the submission opens on its unpublished
   1.1), "Title & Abstract", press "Unpublish" and confirm "Unpublish".
2. Settings › Website › "Plugins", tick "DRIVER".
3. Signed out, open
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver`.
4. Press "Resume", the browser view's link for the resumption token.

Ending in an error (main):

1. Sign in as `dbarnes`. Open submission 17 › "Title & Abstract", press
   "Unpublish" and confirm "Unpublish".
2. Settings › Website › "Plugins", tick "DRIVER".
3. Signed out, open the same `set=driver` address.
4. Press "Resume".

Stopping early (3.5, with `oai_max_records = 1`):

1. Sign in as `dbarnes`. Settings › Website › "Plugins", tick "DRIVER".
2. Signed out, open the same `set=driver` address.
3. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`
   and press "Resume".

**Expected.** In the first two groups, step 3 lists the set's one record
(`article/17`, then `article/1`) with no resumption token. In the third,
step 2 lists `article/1` with a token whose next answer lists
`article/17`, as step 3 does for the journal's records without a set.

**Observed.** In the first two groups, step 3 lists the one record and
also says "There are more results.", with a token that counts both of
the journal's records:

```xml
<resumptionToken expirationDate="…" completeListSize="2" cursor="0">…</resumptionToken>
```

Step 4 in the first group lists `article/17` again and closes the list
with `<resumptionToken completeListSize="2" cursor="1" />`. Step 4 in
the second group answers:

```xml
<error code="noRecordsMatch">No matching records in this repository</error>
```

In the third group, step 2 lists `article/1` and nothing more: no token,
no "There are more results.". Step 3 lists `article/1`, then
`article/17`, both with the `driver` mark.

`verb=ListIdentifiers` answers as ListRecords in the first two groups.
On main, the third group lists both articles over two answers, and the
first group with `oai_max_records = 1` answers `noRecordsMatch` at
step 3: the one deleted record fills the first answer. The browser view
of a list's closing answer still says "There are more results."; that is
U19 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a4),
a separate fault.

## Cause

`DRIVERDAO::getDRIVERRecordsOrIdentifiers()`
(`plugins/generic/driver/DRIVERDAO.php`, lines 57–66) builds the set by
reading a page of all the journal's OAI records and dropping those not
in the set. It counts all the records for the total (line 58), reads the
rows `offset` to `offset + limit` (line 59), and keeps the records whose
sets include `driver` (line 63).

`OAI::listRecords()` and `OAI::listIdentifiers()` in
`lib/pkp/classes/oai/OAI.php` (lines 566–568 and 418–420) move the
offset on by the number of records returned and hand out a token while
that offset is below the total. So the offset counts the set's records
while the total and the page count all the journal's records:

- Any record outside the set leaves the offset below the total, so a
  complete set gets a token, and "completeListSize" is the count of all
  the journal's records.
- The next page starts at the number of records sent so far, which is
  smaller than the number of rows read once one row was dropped, so it
  reads rows again and re-sends their set records.
- A page whose rows hold no set record returns nothing, and the list
  ends in `noRecordsMatch` (`OAI.php` lines 539 and 399). Since the page
  start trails behind, a run of `limit` rows outside the set (100 for
  ListRecords, the `oai_max_records` default; 500 for ListIdentifiers)
  is always reached as such a page, and the set's records after it are
  never listed. When the journal's first 100 records are all outside the
  set, the set answers `noRecordsMatch` outright.

3.5, 3.4 and 3.3 count the total differently, with code from 2020
(`pkp/pkp-lib#6264`,
[56fd4a3a3f](https://github.com/pkp/ojs/commit/56fd4a3a3f642d6ce0a965a0d6215843e7878022)).
The DAO walks an iterator: the loop that skips to the offset never adds
to the total, because `ArrayIterator::next()` returns nothing, and the
loop that reads the page adds one per row except the first. So a page's
total is the number of rows it read, less one: at most 99. The list ends
at the first answer after which 99 records or more have been sent,
repeats included:

- an open access journal, where every record is in the set, gets its
  first 100 records and no token;
- in any journal, a record further than about 200 rows into the
  journal's OAI records is never listed;
- ListIdentifiers stops the same way at about 500.

On 3.5 a two-record list with one record outside the set comes out
right, which is why the first two groups show nothing there.

The plugin's first version (d29ac627a3) already filtered after paging,
with the total counted over all the journal's records, as on main.
[4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761)
(`pkp/ojs#5674` for `pkp/pkp-lib#12922`, which added per-version OAI
records) moved main's DAO onto the query with an offset and a limit, and
brought that total back.

Reach:

- ListRecords and ListIdentifiers, both through
  `DRIVERPlugin::recordsOrIdentifiers()`.
- The site-wide address with `set=driver` takes the same path, with the
  journal left out of the query (code; the site-wide ListSets has no
  `driver` set).
- No other plugin or app filters an OAI list after paging: the
  `JournalOAI::records` and `::identifiers` hooks have no other user,
  and OMP and OPS have no DRIVER plugin (code).

## Proposed fix

A proposal. Select the `driver` set in the query, so that the total and
the offset count the set's own records, as the section sets do in
`OAIDAO::getRecordsRecordSetQuery()`. `DRIVERDAO` gets
`getDRIVERRecordsQuery()`, which wraps the journal's record query and
keeps the rows that `DRIVERPlugin::isDRIVERRecord()` accepts, written as
`EXISTS` conditions:

- a deleted record whose tombstone has the `driver` setting `1`;
- a live record whose publication has a galley, on a journal where
  neither `restrictSiteAccess` nor `restrictArticleAccess` is set, and
  that is open access (no `publishingMode`, or `0`), or that sells
  subscriptions (`1`) with the article's issue open
  (`access_status` 0 or `ISSUE_ACCESS_OPEN`), or with the article marked
  `ARTICLE_ACCESS_OPEN` and its issue absent or `ISSUE_ACCESS_SUBSCRIPTION`.

`getDRIVERRecordsOrIdentifiers()` then counts and pages that query and
converts every row, with no filtering after the page. The journal
settings are read per row through `r.journal_id`, so the site-wide
address works too.

The rule reads the publication of the row. On a journal with DOI
versioning, main lists one record per published version, and
`OAIDAO::setOAIData()` renders each from its own publication, with that
publication's galleys and issue. So the version's own galleys and access
decide whether its record is in the set. The fix makes
`isDRIVERRecord()`, which sets the header's `driver` mark, read the
row's `publication_id` too, instead of the submission's current
publication. The full diff, tried on `main`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-complete-list-offers-resume/fix.diff).

Tried on OJS `main`, at the default size and with `oai_max_records = 1`.
The first two groups listed their one record with no token, and the set
of both articles came in two answers. A second check, with the fix in
and out, compared the set with the `driver` marks in each state: DRIVER
enabled; article 17 unpublished while DRIVER was on (its marked deleted
record stays in the set); the journal switched to subscriptions with its
issue open; "Users must be registered and log in to view open access
content." ticked (only the deleted record is left). With the fix the set
held exactly the marked records in every state and at both sizes, and
carried a token only when more records followed.

**Alternatives**:

- Read every record on each request and page the set in PHP: no rule in
  SQL, but `isDRIVERRecord()` loads the journal, the submission and the
  issue for every record of the journal on every page, which a journal
  of a few thousand articles cannot afford.
- Let the OAI class move the offset by the rows read rather than the
  records returned: a change to the `JournalOAI::records` hook contract
  and three apps' OAI classes, and a page with no set record would still
  need reading on.

**What goes with it**:

- The rule now lives in two places, the query and `isDRIVERRecord()`.
  With the fix they read the same publication and issue, and differ in
  one test: the query requires a galley, as the plugin means to, while
  `isDRIVERRecord()` tests `!empty()` on a `LazyCollection`, which is
  never empty. That is
  U19 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a23);
  its fix should land with this one, or the set and the header marks
  disagree on an article without a galley. Moving `addSet()` onto the
  same query would leave one rule.
- No stored data changes. Harvesters get the whole set once.
- Backport: 3.5 and 3.4 have the same query builder
  (`_getRecordsRecordSetQuery()`), whose rows carry no `publication_id`,
  so the conditions join through `submissions.current_publication_id`,
  and they have no per-version records. 3.3 builds the list in raw SQL
  and needs the conditions written there.
- Guard: a unit test that pages a `driver` set holding records outside
  it, with a small `oai_max_records`, and checks the records, the total
  and the token of each page.

Medium: one plugin, two files, but the plugin's access rule is written
again in SQL beside its PHP twin, with a backport that needs adapting.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-complete-list-offers-resume/walk.js),
  one group per run on an OJS install freshly loaded from the default
  dataset: `GROUP=A node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-complete-list-offers-resume/walk.js`,
  then reload and `GROUP=B`, then `GROUP=C` (the third group) with the
  test server restarted at `oai_max_records = 1` by
  [serve.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-last-part-offers-resume/serve.js)
  (`PKP_E2E_DATASET=1 node shared/playwright/checks/issues/oai-last-part-offers-resume/serve.js on ojs`, `off` after).
  It reads each answer as the browser shows it and as raw XML.
- Fix check:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-complete-list-offers-resume/neighbour.js),
  on `main`, with the fix in and out, at both sizes.
- Walked: `main` (all three groups, the first and third also at
  `oai_max_records = 1`) and 3.5 (all three), OJS, PostgreSQL, datasets
  pkp/datasets 38ab955 (2026-09-30). On 3.5 the step to pick version 1.0
  of submission 1 is "All Versions" › "Version 1: …".
- Tips: OJS `main`
  [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
  pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
  3.5 [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
  pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
  3.4 [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
  pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
  3.3 [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
  pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads: `DRIVERDAO::getDRIVERRecordsOrIdentifiers()` on every line
  (main and 3.5 `plugins/generic/driver/DRIVERDAO.php`, 3.4 and 3.3
  `DRIVERDAO.inc.php`; 3.4 matches 3.5 line for line, 3.3 has the same
  loops over `_getRecordsRecordSet()`); `OAI::listRecords()` and
  `::listIdentifiers()` on every line (the same `$offset += $num` and
  `$offset < $total`); `OAIConfig` (`maxIdentifiers` 500);
  main `OAIDAO::getRecordsRecordSetQuery()` and `setOAIData()`;
  `DRIVERPlugin::isDRIVERRecord()` and `recordsOrIdentifiers()` on main.
- Introduced: `git log --follow`, `git log -S` and blame of `DRIVERDAO`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library; issues and PRs,
  open and closed): "driver resumptionToken", "DRIVER set OAI",
  "DRIVER", "driver completeListSize", "OAI set duplicate records
  resumption", `DRIVERDAO`, `getDRIVERRecordsOrIdentifiers`.
  `pkp/pkp-lib#10830` (the set returned no records on 3.4; fixed) is
  another fault.
- Unverified: the sizes at the default of 100 (100, about 200, 500), read
  from the code and walked at a size of 1 only; per-version records,
  which no install can serve today since turning DOI versioning on
  fails the journal's OAI requests (U19
  [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a22)),
  so the fix's version handling is read in the code; which services
  harvest the `driver` set today; MySQL, where the fix wraps a
  `UNION … ORDER BY` in a subquery; the site-wide `set=driver` address;
  3.4 and 3.3, not walked.
