# Once one journal sets "DOI Versioning" to "Yes", every journal's OAI-PMH requests answer a server error

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none (no "DOI Versioning" choice on a journal, no per-version records)
  - 3.4: none (code; no per-version records)
  - 3.3: none (code; no per-version records)
- **Introduced** `pkp/ojs#5674` for `pkp/pkp-lib#12922` · [4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761) · 2026-07-27 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a22)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Journal Manager sets "DOI Versioning" to "Yes, assign a unique DOI to
every version of an article." on a journal that has DOIs enabled. From
then on these OAI-PMH requests answer a server error with an empty
page: Identify, ListRecords, ListIdentifiers, GetRecord and
ListMetadataFormats for an identifier. ListSets still answers.

The failure is not limited to that journal. Every other journal of the
install and the site-wide OAI-PMH address fail the same way, so no
harvester can read anything from the install until the setting is back
at "No".

It was seen on PostgreSQL. MySQL and MariaDB were not run.

## Impact

- **Lost.** Harvesters and indexes get a server error instead of
  records. The settings form shows "Saved" and nothing tells the
  manager.
- **Who.** Every journal of the install, once one journal has
  "DOI Versioning" at "Yes". A new journal has DOIs enabled and
  "DOI Versioning" at "No", so that one choice is all it takes.
- **Way round.** That journal's manager or the site administrator sets
  "DOI Versioning" back to "No", which gives up a DOI of its own for
  each version. The managers of the other journals cannot.

Medium: the fault needs a setting changed from its default, and
changing it back ends it. It would be high once shown on MySQL or
MariaDB as well, which most installs run.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, on PostgreSQL: the journal
  "Journal of Public Knowledge" (`publicknowledge`) with its two
  published articles (1 and 17). The journal has DOIs enabled, no "DOI
  Prefix", and "DOI Versioning" at "No, all versions of an article
  should have the same DOI.".
- A second journal, to show the reach: signed in as `admin`,
  Administration › "Hosted Journals" › "Create Journal", with "Journal
  title" "Journal u19a22", "Journal initials" "U19A22", the principal
  contact's name "Journal u19a22" and email `u19a22@mailinator.com`,
  "Country" "Canada", "Path" `u19a22`, "English" ticked under
  "Languages" and chosen as the primary language, and "Enable this
  journal to appear publicly on the site" ticked. Its DOI settings stay
  as created.

Steps:

1. Signed out, open each of these and see that it answers.
   `ojs2.localhost` is the dataset's repository identifier; on an
   install with another one, take the identifier as ListRecords shows
   it.
   - `/index.php/publicknowledge/oai?verb=Identify`
   - `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`
   - `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   - `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17`
   - `/index.php/publicknowledge/oai?verb=ListMetadataFormats&identifier=oai:ojs2.localhost:article/17`
   - `/index.php/publicknowledge/oai?verb=ListSets`
   - `/index.php/u19a22/oai?verb=Identify`
   - `/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc`
2. Sign in as `dbarnes` and open Settings › Distribution › "DOIs" ›
   "Setup".
3. Type `10.1234` into "DOI Prefix" (the form refuses a save without
   one), choose "Yes, assign a unique DOI to every version of an
   article." under "DOI Versioning", and press "Save".
4. Open the addresses of step 1 again.
5. Choose "No, all versions of an article should have the same DOI.",
   press "Save", and open the addresses once more.

**Expected.** Step 4 answers as step 1 did: the two lists hold articles
1 and 17 (neither has an earlier published major version, so there is
no extra record), and Identify, GetRecord and ListMetadataFormats
answer.

**Observed.** At step 3 the form shows "Saved". At step 4 every address
but ListSets shows an empty page. An address at `publicknowledge` or
at the site-wide `index` first redirects to the same address with
"/en/" in it (the journal has two languages), and that request answers
status 500 with no body; `u19a22`, with one language, answers 500 at
the address as typed:

```
GET /index.php/publicknowledge/en/oai?verb=ListRecords&metadataPrefix=oai_dc   500
GET /index.php/publicknowledge/en/oai?verb=Identify                            500
GET /index.php/u19a22/oai?verb=Identify                                        500
GET /index.php/index/en/oai?verb=ListRecords&metadataPrefix=oai_dc             500
```

The PHP error log, for each of them:

```
PHP Fatal error: Uncaught PDOException: SQLSTATE[42804]: Datatype mismatch: 7 ERROR: UNION types text and bigint cannot be matched
```

ListSets lists `publicknowledge`, `publicknowledge:ART` and
`publicknowledge:REV` as before. At step 5 every address answers as at
step 1.

## Cause

`APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()`
([`classes/oai/ojs/OAIDAO.php`, lines 252 to 476 on main](https://github.com/pkp/ojs/blob/06fd981b01/classes/oai/ojs/OAIDAO.php#L252-L476))
builds the records as a UNION of up to three branches:

- the **current-version branch** (line 295): each article's current
  publication. It has no tombstone, so it selects a bare
  `NULL AS tombstone_id` (line 300).
- the **per-version branch** (`$versionQuery`, line 352): every
  published major version, for journals that have `enableDois` and
  `doiVersioning` on. It also selects a bare `NULL AS tombstone_id`
  (line 357). It exists only when at least one journal of the install
  has both settings on.
- the **tombstone branch** (line 420): the deleted records, with the
  real `dot.tombstone_id`, a bigint.

Before `pkp/ojs#5674` the query had the current-version and the
tombstone branch only. That change added the per-version branch and
united it between the two (line 417, then line 474):

```php
    $query->union($versionQuery);
}
…
return $query
    ->union($tombstoneQuery)
    ->orderBy(DB::raw($orderBy . ', publication_id, tombstone_id'));
```

PostgreSQL types the columns of a chain of UNIONs pair by pair, from
the left. The current-version and the per-version branch both give a
bare `NULL` for `tombstone_id`, so the pair makes the column `text`.
The tombstone branch's bigint `tombstone_id` cannot be matched with
`text`, and PostgreSQL refuses the query. With the tombstone branch
second, as it was before the change and still is while no journal has
"DOI Versioning" at "Yes", the bare `NULL` takes the bigint type.

Nothing catches the exception, so the request ends as a server error.
The journals with both settings on are looked up for the whole install,
not for the journal asked, so the per-version branch is united for
every journal's request and for the site-wide one.

Reach, checked in the code unless marked:

- `PKPOAIDAO::getRecords()`, `getIdentifiers()`, `getRecord()`,
  `recordExists()` and `getEarliestDatestamp()` all run this query:
  ListRecords, ListIdentifiers, GetRecord, ListMetadataFormats with an
  identifier and Identify fail (reproduced, step 4). ListSets does not
  run it.
- The "DRIVER" set: `DRIVERDAO::getDRIVERRecordsOrIdentifiers()`
  (`plugins/generic/driver/DRIVERDAO.php`, line 57) runs the same
  query. Not driven.
- OMP's and OPS's queries have two branches and are not touched.
- No stored data is wrong.

## Proposed fix

A proposal, tried on main on PostgreSQL:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-versioning-oai-requests-fail/fix.diff)
applied to OJS. Three checks:

- The Steps show Expected.
- With "DOI Versioning" "Yes" and a second major version of article 17
  published on screen, ListRecords, ListIdentifiers and the site-wide
  list hold three records in this order: `article/1`,
  `article/17/version/VoR/1` and `article/17`. GetRecord answers for
  both identifiers of article 17, and nothing fails.
- With "DOI Versioning" "No", article 17 unpublished on screen is
  listed as a deleted record, the same with the fix in and out. With
  the fix in it is listed the same under "Yes".

Recommended: unite the tombstone branch first and the per-version
branch after it. The tombstone branch is the only one whose
`tombstone_id`, `set_spec` and `oai_identifier` are typed columns, so
the first pair settles the types and the per-version branch's bare
`NULL`s follow them. The statement changes (the branches are united in
another order); the rows and their order should not, since the
`ORDER BY` covers the whole UNION.

```diff
--- a/classes/oai/ojs/OAIDAO.php
+++ b/classes/oai/ojs/OAIDAO.php
@@ -348,6 +348,7 @@
         // minor version of each major, for journals with DOI versioning.
+        $versionQuery = null;
         if (!empty($versioningJournalIds)) {
@@ -414,7 +415,6 @@
                 });
-            $query->union($versionQuery);
         }
@@ -470,8 +470,13 @@
         return $query
             ->union($tombstoneQuery)
+            ->when($versionQuery, fn (Builder $query) => $query->union($versionQuery))
             ->orderBy(DB::raw($orderBy . ', publication_id, tombstone_id'));
```

**Alternatives:**

- Give the bare `NULL`s a type (`CAST(NULL AS BIGINT)`): the cast's
  type name differs between PostgreSQL and MySQL (`SIGNED` there), so
  it needs a branch on the database driver, which this class has none
  of.
- Fold the current-version and the per-version branch into one query
  (join the publications once; for a journal with "DOI Versioning"
  "Yes" take each major's latest minor, otherwise the current
  publication). It removes the order dependency and sixty duplicated
  lines, but it rewrites the query that `pkp/ojs#5674` and its
  follow-up `pkp/ojs#5709` just settled.

**What goes with it:**

- No API, hook or stored-data change.
- No backport: the per-version branch is on `main` only.
- Guard: a PHPUnit database test in OJS's `tests/classes/oai/`, beside
  `JournalOAITest.php` (which checks identifiers only and never runs
  the query): turn `enableDois` and `doiVersioning` on for the test
  journal and run `OAIDAO::getRecords()`. OJS's CI matrix
  (`.github/workflows/main.yml`) includes PostgreSQL, where it would
  have failed. pkp-e2e's OAI-PMH test for the per-version records is written
  once this is fixed; none runs today.

Small: three lines moved in one method of OJS's own class.

## Evidence

- Kept script that takes the Steps on OJS, on an install freshly loaded
  from PKP's default test dataset (pkp/datasets 2c84c3c, 2026-10-01,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/doi-versioning-oai-requests-fail/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-versioning-oai-requests-fail/walk.js),
  run in pkp-e2e with `PROBE_FEATURE=issues-a22 PROBE_AGENT=a22 node bin/probe.js ojs shared/playwright/checks/issues/doi-versioning-oai-requests-fail/walk.js`.
  It opens each address in the browser and reads the raw XML beside
  it, signed out. The second journal is created on screen; nothing is
  built otherwise.
- The fix was applied to the OJS checkout with `node bin/try-fix.js apply …/fix.diff ojs`
  and taken out after each run. Three runs with it in, each on a fresh
  dataset:
  - the Steps (`FIX=1` in front of the command);
  - `versions` as the script's argument: as `dbarnes`, "DOI
    Versioning" "Yes", article 17's workflow › "Create New Version"
    with "Revision Significance" "Major Revision", "Publish" (version
    2.0, current, beside the published 1.0). The lists then held
    `article/1`, `article/17/version/VoR/1` and `article/17`. GetRecord
    of `article/17/version/VoR/1` gave the record dated 2026-09-30
    without a DOI (version 1.0 never had one); GetRecord of
    `article/17` gave the one dated 2026-10-01 with the DOI
    `10.1234/7a67b616` and a "Relation" to
    `…/article/view/17/version/18`, the earlier version's address.
    Identify answered;
  - `neighbour` as the script's argument, also run with the fix out:
    the lists with "DOI Versioning" "No", article 17's workflow ›
    "Unpublish", the lists again (article 1, and article 17 as a
    deleted record, in ListRecords, ListIdentifiers, GetRecord and the
    site-wide list). With the fix in, "DOI Versioning" "Yes" and the
    same reads once more gave the same answers.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc); 3.5 at OJS
  18d097d94e (lib/pkp 1fb843f491), the same script with
  `PKP_E2E_LINE=stable-3_5_0` in front. On 3.5 the walk took steps 1
  and 2: every address answered, and the "Setup" form has no "DOI
  Versioning" group (its groups: "DOIs", "Items with DOIs", "DOI
  Format").
- Code read on main: OJS `classes/oai/ojs/OAIDAO.php`
  (`getRecordsRecordSetQuery()`, `setOAIData()`),
  `plugins/generic/driver/DRIVERDAO.php`, lib/pkp
  `classes/oai/PKPOAIDAO.php` (the five callers), OMP
  `classes/oai/omp/OAIDAO.php` and OPS `classes/oai/ops/OAIDAO.php`
  (one `union` each), and a search of the three apps' and pkp-lib's
  `classes` for `union(` (no other chain of three branches with a bare
  `NULL` against a typed column).
- 3.5, 3.4 and 3.3 by code: OJS `classes/oai/ojs/OAIDAO.php` at the 3.5
  tip above and at `upstream/stable-3_4_0` (9571d8fde7) has one
  `union`, the current-version and the tombstone branch;
  `stable-3_3_0` (9fdb9bcf9a) builds one `UNION` in raw SQL
  (`OAIDAO.inc.php`). 4ea46f5f35 is not an ancestor of `stable-3_5_0`.
- Introduced: `git blame` on lines 352, 417 and 474 gives 4ea46f5f35
  (co-authored by Bozana Bokan), merged as `pkp/ojs#5674` with
  `pkp/pkp-lib#13028`. The current-version branch's bare
  `NULL AS tombstone_id` is older than the query builder (08c3cddc6c,
  2021, only moved it there from raw SQL) and was harmless while the
  tombstone branch came second. The follow-up 90728cb56a
  (`pkp/ojs#5709`) did not touch the unions.
- Upstream search, 2026-10-01: pkp/pkp-lib and pkp/ojs, issues and
  PRs, open and closed, by the symptom's words, the PostgreSQL
  message, the method's name and the feature's issue number.
  `pkp/pkp-lib#12922` (closed) is the feature's own issue; its page
  names no such failure. The open `pkp/ojs#5710` and `pkp/ojs#5712`
  add a test of `ArticleTombstoneManager`, not of this query.
- Unverified:
  - MySQL and MariaDB: not run, with or without the fix (the test
    machine has neither). A guess from how MySQL types a UNION: it
    converts differing column types instead of refusing them, so the
    fault may be PostgreSQL's alone and the reordered statement should
    give the same rows there.
  - A list long enough to continue with a resumption token while an
    article has two records: not driven.
  - The "DRIVER" set's lists: not driven.
