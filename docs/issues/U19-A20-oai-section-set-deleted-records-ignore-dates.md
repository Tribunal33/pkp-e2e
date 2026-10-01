# Asked for a section's set, OAI lists return its deleted records whatever "from" and "until" say

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; the query there applies the dates to every deleted record)
- **Introduced** `pkp/ojs#3134` and `pkp/ops#162` for `pkp/pkp-lib#6963` · [1c4b19b9c8](https://github.com/pkp/ojs/commit/1c4b19b9c8780ec2238b42fa78202763ea5f0793) (OJS), [5df1969511](https://github.com/pkp/ops/commit/5df1969511a3003f7a47a1a8979811261a7dc619) (OPS) · 2021-05-21, 2021-06-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester asks ListRecords or ListIdentifiers for one section's set
with `from=2030-01-01` and expects nothing. It gets every deleted
record of the section: the articles unpublished in it, whatever the
date they were unpublished. `until` is ignored the same way.

In an ordinary date window the section's deleted records come beside
the records that belong in the window. A harvester that collects a
section's changes since its last visit receives all the section's
deleted records again on every visit.

Only a section's set does this, and only for deleted records. The
journal's set and a list without a set keep to the dates, and so do the
section's published records.

## Impact

- **Lost:** nothing. Each extra record is a deleted record that a
  correct harvest delivers once anyway; the harvester sees it again.
- **Who:** harvesters that ask a journal or preprint server by section
  and by date, once an article of the section was unpublished. The
  extra records grow with each article unpublished in the section.
- **Way round:** none is needed. A harvester that wants no repeats can
  ask for the journal's set (`set=publicknowledge`), which keeps to the
  dates.

Low: the list is wrong only by repeating deleted records a harvester
can take twice without harm. It would be medium if a record that
should be listed were left out.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OPS `main` for a preprint
  server). Nothing else.

Steps:

1. Sign in as `admin`.
2. Open submission 17, "Antimicrobial, heavy metal resistance and
   plasmid profile of coliforms isolated from nosocomial infections in a
   hospital in Isfahan, Iran", which is in the section "Articles" (OPS:
   submission 19, "Finocchiaro: Arguments About Arguments", in
   "Preprints"). Press "Unpublish" (OPS "Unpost") and confirm.
3. Open
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=publicknowledge:ART&from=2030-01-01`
   (OPS `set=publicknowledge:PRE`). Then open the same at the site-wide
   address: `/index.php/index/oai?…` with the same `verb`, `set` and
   `from`.
4. Open both addresses of step 3 with `until=2020-01-01` in place of
   `from=2030-01-01`. [OPS: skip steps 4 and 5; every list with `until`
   fails there for another reason,
   [pkp-e2e#252](https://github.com/jardakotesovec/pkp-e2e/issues/252).]
5. Open the journal's address of step 3 with `until=` yesterday's date
   in place of `from=2030-01-01`.

**Expected.** Steps 3 and 4: "No matching records in this repository",
since nothing in the journal changed in 2030 or before 2020. Step 5:
the section's other published article, `article/1`, alone.

**Observed.** Steps 3 and 4 list one record at both addresses, for
ListRecords and for ListIdentifiers:

```
OAI Identifier   oai:ojs2.localhost:article/17
Datestamp        2026-10-01T15:45:02Z
setSpec          publicknowledge:ART
This record has been deleted.
```

Step 5 lists `article/1` (datestamp 2026-09-30) and, beside it, that
deleted record of 2026-10-01. On OPS step 3 lists
`oai:ops.localhost:preprint/19`, setSpec `publicknowledge:PRE`, the same
way.

Control: with `set=publicknowledge`, or with no set, steps 3 and 4
answer "No matching records in this repository" and step 5 lists
`article/1` alone.

## Cause

`APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()` builds the deleted
records' half of every list. Its filter for the set is two conditions
joined by OR, added to the query without a group around them:

```php
->when(isset($set), function ($query) use ($set) {
    return $query->where('dot.set_spec', '=', $set)
        ->orWhere('dot.set_spec', 'like', $set . ':%');
})
->when($from, function ($query, $from) {
    return $query->whereDate('dot.date_deleted', '>=', DateTime::createFromFormat('U', $from));
})
```

The journal and the section are filtered by joins, so the set filter is
the first thing in the WHERE. The conditions that follow (`from`,
`until`, the submission) are added with AND, which binds before OR. The
query reads "the set is exactly this one, OR (the set starts with this
one AND the dates match)". A deleted record stores its section's set,
"{journal}:{abbreviation}", so asking for a section's set matches the
first condition and the dates are never looked at. Asking for the
journal's set matches only the second, which is why that set keeps to
the dates.

The lines came with the rewrite of this query on Laravel's query
builder (`pkp/pkp-lib#6963`, "Improve OAI performance",
[1c4b19b9c8](https://github.com/pkp/ojs/commit/1c4b19b9c8780ec2238b42fa78202763ea5f0793)).
The SQL it replaced had the group:
`AND (dot.set_spec = ? OR dot.set_spec LIKE ?)`. The port to OPS
([5df1969511](https://github.com/pkp/ops/commit/5df1969511a3003f7a47a1a8979811261a7dc619))
copied them into `APP\oai\ops\OAIDAO`.

Reach:

- ListRecords and ListIdentifiers with a section's set and `from` or
  `until`, at the journal's address and the site-wide one (walked on
  OJS; on OPS with `from`).
- GetRecord and Identify pass no set, and OJS's `driver` set passes
  none either (`DRIVERDAO::getDRIVERRecordsOrIdentifiers()`), so they
  are not touched (code).
- OMP is not affected: its query filters the set with one condition and
  no OR (code).

## Proposed fix

Recommended, tried: put the two set conditions in one group, as the SQL
had them. In OJS, `classes/oai/ojs/OAIDAO.php`
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/fix-ojs.diff)),
and the same lines in OPS, `classes/oai/ops/OAIDAO.php`
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/fix-ops.diff)):

```diff
             ->when(isset($set), function ($query) use ($set) {
-                return $query->where('dot.set_spec', '=', $set)
-                    ->orWhere('dot.set_spec', 'like', $set . ':%');
+                return $query->where(function ($query) use ($set) {
+                    $query->where('dot.set_spec', '=', $set)
+                        ->orWhere('dot.set_spec', 'like', $set . ':%');
+                });
             })
```

These two are every instance: they are the only `orWhere` in the three
apps' OAI classes, pkp-lib's and the DRIVER plugin's.

Tried on `main`, OJS and OPS: with the fix steps 3 and 4 answer "No
matching records in this repository" at both addresses, and step 5
lists `article/1` alone. Requests that must stay as they are do: the
section's set with no date, with `from` today and with `until` today
still lists the deleted record.

It was also tried together with the fix of
[pkp-e2e's report on A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md),
which changes the section join of the same query and relies on this
filter: both walks show their Expected with the two in.

**Alternatives**

- Move the set filter after the date filters: the query would become
  "(the dates match AND the set is exactly this one) OR the set starts
  with this one", and the journal's set would ignore the dates instead.

**What goes with it**

- No data repair.
- The A19 report's fix, in one change:
  [fix-ojs-with-a20.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ojs-with-a20.diff)
  and
  [fix-ops-with-a20.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ops-with-a20.diff)
  hold the two together, as tried.
- Backport: not tried on a stable branch. The OPS diff applies as it is
  to `stable-3_5_0` and `stable-3_4_0` (dry run). OJS has the same two
  lines there at a deeper indentation, so the diff does not apply and
  the change is made by hand.
- Guard: neither app has a test that runs this query (OJS's
  `tests/classes/oai/JournalOAITest.php` covers identifiers only). An
  assertion on the built SQL is enough for this fault and needs no
  fixtures: `getRecordsRecordSetQuery()` asked with a set and a `from`,
  and `toSql()` showing the two set conditions inside one group before
  the date. A database test with a tombstone row would also cover the
  A19 report's fix.

Medium: the change is six lines and a small test per app, and it is
medium only because it is made in two repos, OJS and OPS. This is a
proposal.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/walk.js)
  (its helpers are those of
  [oai-deleted-section-set-lists-nothing/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/lib.js)),
  run after `npm run fleet-prep -- --feature issues --dataset 1 --reset` with
  `PROBE_FEATURE=issues PROBE_AGENT=walk ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/walk.js`.
  It reads each OAI address as a harvester does, without a session, and
  records the browser view of steps 3 to 5 and of the control.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/fix-ojs.diff ojs`
  and `… apply …/fix-ops.diff ops`, the datasets reloaded, walk.js on
  both, then `node bin/try-fix.js revert` for each (this walk was taken
  before step 5 was added). Then the same with the two
  `…-with-a20.diff` files, with this walk, step 5 included, and the A19
  report's.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`), no upgrade
  needed. MySQL not checked; AND binds before OR there as well.
  - main: OJS 06fd981b01 (lib/pkp 2e377d27fc), OPS c8af945bb7 (lib/pkp
    3dc90c81a6).
  - stable-3_5_0: OJS 18d097d94e, OPS 3f0919468c (lib/pkp 1fb843f491),
    as on `main`. Code read: `classes/oai/ojs/OAIDAO.php` lines 327-328
    and `classes/oai/ops/OAIDAO.php` lines 289-290, the same two lines.
  - 3.4 (code): OJS `upstream/stable-3_4_0` 9571d8fde7 (lines 330-331),
    OPS acd8ae704b (lines 293-294): the same `where()->orWhere()`
    before the date filters.
  - 3.3 (code): OJS 9fdb9bcf9a, OPS c5532e2161,
    `classes/oai/ojs/OAIDAO.inc.php` in both: one SQL string with
    `AND (dot.set_spec = ? OR dot.set_spec LIKE ?)` before the dates.
- Introduced: `git log -S"orWhere('dot.set_spec'"` on each app's file;
  blame on `main` names a later commit that re-indented the lines
  (`pkp/pkp-lib#12922`).
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ojs and pkp/ops, issues
  and PRs, open and closed: "oai from until deleted records set", "oai
  tombstone set", "oai set deleted section", "ListSets deleted". Read
  and set aside: `pkp/pkp-lib#10155` (a date value the database
  refuses in the same query), `pkp/pkp-lib#7901`, `pkp/pkp-lib#6625`.
- Not driven: a list long enough to continue with a resumption token;
  the SQL assertion named as the guard was not written.
