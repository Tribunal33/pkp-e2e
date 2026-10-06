# A press's series pages show no series name, description or ISSN, and ignore the series' book order

Model: claude-opus-5-5.

Regression. OMP at `187f0f40d` (lib/pkp `76a315591b`; also the upstream
`main` tip read on 2026-09-25); introduced by omp `4c2b5d77b`
("pkp/pkp-lib#13003 Port batch loading to OMP", 2026-08-26, pushed without
a PR). stable-3_5_0: does not (by code) at `f77b23709`. Tracked in spec U17
register OMP9. Temporary: delete once acted on.

## Summary

Since late August 2026, a visitor who opens the public page of any series
on a press sees an empty heading, an empty last step in the trail and a
browser tab that names only the press. The series' name, description and
ISSNs are missing. The cover image and the list of the series' books
still show, but the books always come newest first, whatever order the
press chose for the series. The series window's path check goes through
the same broken lookup. There what the screen shows is right, and the
only trace is a warning in the server log.

## Impact

Every reader of every press meets it, on every series page: a series
that has existed for years as much as one created today. A reader reaches
the page from the series name under "Series" on a book's page. The page
no longer says which series it is: no heading, and the browser tab reads
only "| {press name}". The introduction the press wrote for the series and
its ISSNs are gone from the page. The ISSNs still show on each book's page
under "Series". The cover shows, but its text alternative is a single
space, so a screen reader user learns nothing from it either. The books
are listed and open normally, but in publication order, newest first,
whatever "Order of monographs" says, so a press that orders a series by
title or by series position does not get that order. Nothing is lost:
the series window still shows and saves every field, and the book page's
"Series" still carries the full name. A manager has no workaround on
screen. Major: a reader-facing page of every press is blank where the
series should introduce itself, with no warning to the press.

## Steps to reproduce

Preconditions:

- A fresh OMP install with its default languages.
- One press, and a Press Manager account on it.
- Three books whose submissions are ready to publish, titled "Alpha",
  "Mike" and "Zulu".
- A small PNG image for the cover.

1. Sign in as the Press Manager and open Settings › Press › "Series".
2. Press "Add Series". A window headed "Add Series" opens.
3. Fill it in:
   - "Cover Image": upload the PNG.
   - "Prefix": "The". "Title": "Essays". "Subtitle": "Short Pieces".
   - "Description": "Short essays on reading.".
   - "Online ISSN": "0378-5955". "Print ISSN": "2049-3630".
   - "Order of monographs": leave "Title (A-Z)".
   - "Path": "essays".
4. Press "Save". "Your changes have been saved." shows, and the table
   lists "The Essays".
5. For each book, choose "The Essays" under its "Catalog Entry" ›
   "Series" and publish it, with the publication dates "Alpha"
   2025-01-10, "Mike" 2023-01-10 and "Zulu" 2024-01-10.
6. Sign out, then open the series' page,
   `http://{host}/index.php/{press}/catalog/series/essays`.
7. Sign in as the Press Manager again. Open "The Essays" row's "Edit",
   change nothing and press "Save".

**Expected** (the page as `catalogSeries.tpl` builds it): the heading
"The Essays", the trail "Home / The Essays" and the tab title "The Essays
| {press name}". Then "3 Titles", the cover with the text alternative
"The Essays", the description "Short essays on reading.", "Online ISSN
0378-5955" and "Print ISSN 2049-3630". Under "All Books" come the books
in title order: "Alpha", "Mike", "Zulu". Step 7 saves quietly.

**Observed:** the page answers 200 with an empty `h1` (a single space),
the trail "Home /" with an empty last step and the tab title
"| {press name}". The main area reads, in order (each book's author
and date lines left out):

```
Home /
3 Titles
[cover image]
All Books
Alpha
Zulu
Mike
```

The cover shows, with the text alternative `" "`. The description block
is empty, and there is no "Online ISSN" or "Print ISSN" line. The books
come newest first. Saving each of the six "Order of monographs" choices
in turn leaves that same list, although the reopened window shows each
choice as saved. The server logs, once per page load and again on the
step 7 save:

```
PHP Warning:  Undefined property: stdClass::$section_id in …/classes/section/DAO.php on line 71
```

Control: each book's page names the series under "Series" as "The
Essays: Short Pieces", links to the series page and shows both ISSNs.
The lookup of the series' own fields is what fails, not the series.

The path check also runs the lookup, with a correct result. "Add Series"
again, type "More essays" in "Title" and "essays" in "Path", and press
"Save". The notice "The series path already exists. Please enter a
unique path." shows, as it should, and the server logs the same warning
on that save. A save with a path no series has logs nothing.

## Cause

`classes/section/DAO.php`, `getByPath()`, line 71:

```php
return $row ? $this->fromRow($row, [$row->section_id], (object) []) : null;
```

The press's series live in the `series` table, whose key is `series_id`
(`$primaryKeyColumn`). `section_id` is the OJS and OPS column name (OJS's
own `classes/section/DAO.php` reads `$row->section_id` from its
`sections` table), and the `series` table has no such column.
`$row->section_id` is
undefined (the warning) and gives `null`. `EntityDAO::fromRow()` then
loads the settings with `whereIn('series_id', [null])`. That finds no
row, so every setting stays empty: title, prefix, subtitle, description,
both ISSNs and "Order of monographs" (`sortOption`). The columns of the
`series` table itself (id, path, press, image and others) are still set.
That is why the page finds its books by id and shows the cover, while
showing none of the series' text. `Section::getLocalizedTitle()` joins
the empty prefix and title with a space, which gives the `h1`, the trail
step and the cover's `alt` their single space. With no `sortOption`,
`CatalogHandler::series()` falls back to
`ORDERBY_DATE_PUBLISHED`, descending. Before `4c2b5d77b` the line was `$this->fromRow($row)`,
which loaded the settings by the row's own key. The commit changed
`fromRow()`'s signature for batch loading and passed the ids under the
wrong column name. `CatalogHandler::series()` (the page) and
`SeriesForm`'s unique-path check call `getByPath()` through
`Repo::section()`. The check looks the path up on every save, the
series' own unchanged path included, so any save whose path finds a
series logs the warning. So do the OAI set lookup, the CSV import and the
native XML import. The last three use the id only, so for them the
warning is the only symptom.

## Proposed fix

A proposal; the team decides.

1. Read the key under its real name:
   `$this->fromRow($row, [$row->series_id], (object) [])`. One line, and
   it covers every caller.
2. The same, written against the DAO's own key so that it cannot drift
   from the table again:
   `[$row->{$this->primaryKeyColumn}]`. It costs the same as option 1.
3. Either way, a small test that loads a series by path and checks its
   title and sort option would have caught this. `getByPath()` has no test today.

## Evidence

- Claim check, chunk K6 (`.reports/U17/cc-K6.md`, K6-1 to K6-4 and the
  f-omp9 entry), 2026-09-25, OMP scratch press `u17k6cck6i2siiia`. The
  series "K6 Series" was made on screen with every field set: prefix
  "The", subtitle "K6 Subtitle", a description, a PNG cover, Online ISSN
  0378-5955, Print ISSN 2049-3630 and "Title (A-Z)". It held three
  seeded published books: "Alpha K6 Book" (2025-01-10, position 2), "Mike
  K6 Book" (2023-01-10, 3) and "Zulu K6 Book" (2024-01-10, 1), so all six
  orders differ. Snapshots are in `.reports/U17/ccK6/`:
  - `p-01-visitor-k6series-omp.json` (+ `.png`): `h1` " ", trail
    current step empty, `docTitle` "| U17 K6 press …", "3 Titles", cover
    `img` from `catalog/thumbnail?type=series&id=37` (200, image/png)
    with `alt=" "`, empty `.description`, no `.onlineISSN` or
    `.printISSN`.
  - The same page for a Reader and the Press Manager
    (`p-07-rd-k6series-omp.json`, `p-07-mg-k6series-omp.json`), and in
    three processes (`o-page-*`, `m-03-new-address-omp.json`).
  - The order: `o-save-0..5-omp.json` (each of the six choices saved and
    reopened as saved) and `o-page-0..5-omp.json` (Alpha, Zulu, Mike
    every time).
  - The seeded press, read only: `p-08-pkMono-omp.json` (+ `.png`) and
    `p-08-pkText-omp.json`, `docTitle` "| Public Knowledge Press".
  - The book page: `p-04-book-page-omp.json` (+ `.png`) and
    `b-b{Alpha,Mike,Zulu}-omp.json`. "Series" links "The K6 Series: K6
    Subtitle" to the series page and shows "Online ISSN 0378-5955" and
    "Print ISSN 2049-3630", in two processes.
  - The path check: `u-02-save-taken-path-omp.json` (taken path,
    warning), `u-03-save-new-path-omp.json` and
    `m-01-save-moved-path-omp.json` (new paths, no warning), and
    `u-01-save-unchanged-path-omp.json` and `r-02-resave-own-path-omp.json`
    (own unchanged path, warning; two processes, two series).
  - Kept script:
    `PROBE_FEATURE=U17 PROBE_AGENT=<agent> PHASES=seed,series,books,page,order,uniq node bin/probe.js omp shared/playwright/checks/U17/K6/k6.js`
    (phase order and state file in its header). The fix holds when
    `p-01` has a non-empty `h1`, a description and both ISSN lines, and
    when `o-page-0` lists Alpha, Mike, Zulu.
- Chunk K1 (`.reports/U17/cc-K1.md`, K1-13): on a scratch press,
  `.reports/U17/ccK1/s-28-series-page-omp.json` (+ `.png`) and
  `s2-05-series-page-{two,dotted}-omp.json`. On the seeded press, read
  only: `s2-05-series-page-pk-omp.json` ("Monographs", `h1` empty,
  "0 Titles"). The warning lines are in
  `apps/omp/playwright/.server-logs/server-8150-probe.log`: 32 on
  2026-09-25, for example 15:24:31 and 15:36:52–54. This log is
  overwritten by later probe servers.
- Chunk K2 (`cc-K2.md`, K2-3): a second scratch press, before and after a
  rename. `.reports/U17/ccK2/e-before-series-page-omp.json`,
  `i-09-series-page-first-omp.json`, `r-before-series-page-omp.json` and
  `r-after-series-page-omp.json` ("1 Titles" and the book, no heading).
  `r-after-book-page-omp.json` shows the book page's "Series" with the
  new name.
- Chunk K3 (`cc-K3.md`, K3-2): `.reports/U17/ccK3/g-01-before-series-omp.json`
  and `g-05-after-series-omp.json` (`h1` "", "1 Titles", "K3 Series
  Book", description absent). `s-05-monographs-reopened-omp.json` has the
  description stored as `<p>K3 series description</p>`. Merged as M23 in
  `.reports/U17/claimcheck-merge.md`.
- The unique-path check in the suite (`.reports/U17/test-omp-findings.md`,
  T-omp-1): the U17 OMP suite's scenario 7, step "A path in use"
  (`apps/omp/playwright/tests/U17-sections.spec.js`), green in
  `.reports/U17/test-omp-green.log` and in the confirming rerun
  `.reports/U17/tomp/run3.log`.
  `.reports/U17/tomp/run3-series-saves-server-8100.txt` holds six
  `update-series` posts, all 200. The warning comes directly before the
  fifth, the "monographs" duplicate, and before no other. The green run's
  server log showed the same pattern.
- The steps above use product-like names. The drives used the K6 names,
  and their books were seeded as published, not published on screen.
- The introducing line: `git blame` on `checkouts/omp`
  `classes/section/DAO.php` gives line 71 to `4c2b5d77b` (Alec Smecher,
  authored 2026-08-26, committed 2026-08-27). Its diff changes
  `fromRow($row)` to `fromRow($row, [$row->section_id], (object) [])`.
  The upstream `main` file, read through the GitHub API on 2026-09-25,
  still has the line.
- stable-3_5_0, by code only: `checkouts/stable-3_5_0/omp` at
  `f77b23709`, `classes/section/DAO.php` line 71 reads
  `return $row ? $this->fromRow($row) : null;`, and the branch does not
  carry `4c2b5d77b`. Not driven.
- The "before" side was not driven. It rests on the pre-change line.
- Unverified: the warning on the OAI set lookup, the CSV import and the
  native XML import, which were read in the code only.
