# New markets and publication dates on a book's format default to the Hijri calendar

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; [a92b2dd](https://github.com/pkp/omp/commit/a92b2dd348398e50fb003125f517a2123c5dd108) · 2012-01-12 · Jason Nugent (jnugent), for the date window; copied into the market window by [5e0d3c7](https://github.com/pkp/omp/commit/5e0d3c7ff97d3a777956ec3368f72d1694a170b6) (2012-01-29)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a5) · spec U73 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor adds a market or a publication date to a book's format
and types the date, as "20261001". Both windows open with "Date Format"
on "YYYYMMDD (H)", the format for a date in the Islamic (Hijri)
calendar, rather than "YYYYMMDD". Unless the editor changes the list,
the date is saved as a Hijri date.

Nothing says so. The book's public page shows the publication date as
typed, unconverted, with "Hijri Calendar" under it, and the book's ONIX
data, read by booksellers and other recipients, marks both dates as
Hijri.

Dates already saved this way stay as they are after the fix: each one
has to be re-edited by hand, unless the team adds an upgrade step.

## Impact

- **Lost**: a recipient that honours the code reads 2026 as a Hijri
  year, about 2588 CE.
- **Who**: a press manager or editor who adds a market or a publication
  date in a format's "Metadata" tab. Leaving the preselected format is
  the ordinary path, so most such dates are exposed.
- **Way round**: choose "YYYYMMDD" in "Date Format" before each "OK".
  An entry already saved is corrected the same way, one at a time, in
  its "Edit"; the fix does not change it.

Medium: a field of the ONIX record and the public page is wrong for
most dates, silently, and the press can choose the right format. The
severity would be high if a distributor or retailer were found to act on
the code (an availability date, for one).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`.
- Sign in as `dbarnes`.
- A Native XML file carries a format's ONIX data only when the press's
  "Publisher Identity" is set, which the dataset leaves blank. On
  Settings › Press › "Masthead", type "Public Knowledge Press" in
  "Press Publisher Name" and "Vancouver" in "Geographical Location",
  choose "Proprietary (01)" in "Publisher Code Type", type "PKP-01" in
  "Publisher Code", and press "Save".

Steps:

1. Open submission 14, "From Bricks to Brains: The Embodied Cognitive
   Science of LEGO Robots" (published), and choose "Publication
   Formats" in its side menu. On the format "PDF", press the arrow,
   then "Edit", and open the "Metadata" tab.
2. Under "Market Territories", press "Add Market". Read "Date Format".
3. Type 20261001 in "Date", choose "Canada (CA)" under "Countries" in
   "Included", and type 25 in "Price". Leave every list as it opened.
   Press "OK".
4. Under "Publication Dates", press "Add publication date". Read "Date
   Format".
5. Type 20261001 in "Date", choose "Publication date (01)" in "Role",
   leave "Date Format" as it opened, and press "OK".
6. Open the book's page in the catalog
   (`/index.php/publicknowledge/en/catalog/book/14`) and read its
   details.
7. Go to Tools › "Import/Export" › "Native XML Plugin", open "Export",
   tick the book, press "Export Submissions", then "Download Exported
   File". Read the format's ONIX `PublishingDate` and `MarketDate`.

**Expected**: both windows open with "Date Format" on "YYYYMMDD". The
book page shows the date with no calendar note. The file states the
dates in ONIX date format 00, "YYYYMMDD".

**Observed**: both windows open with "Date Format" on "YYYYMMDD (H)".
The book page's details read:

```
Publication date (01)
2026-10-01
Hijri Calendar
```

The file states both dates in date format 20, "YYYYMMDD (H)":

```xml
<onix:PublishingDate><onix:PublishingDateRole>01</onix:PublishingDateRole><onix:Date dateformat="20">20261001</onix:Date></onix:PublishingDate>
<onix:MarketDate><onix:MarketDateRole>01</onix:MarketDateRole><onix:DateFormat>20</onix:DateFormat><onix:Date>20261001</onix:Date></onix:MarketDate>
```

## Cause

Both windows take their preselected "Date Format" from a hard-coded
default for a blank form, and both defaults name the wrong code of ONIX
list 55:

- `PublicationDateForm::fetch()`
  (`controllers/grid/catalogEntry/form/PublicationDateForm.php`, line
  190): `$templateMgr->assign('dateFormat', '20'); // YYYYMMDD Onix code as a default`
- `MarketForm::fetch()`
  (`controllers/grid/catalogEntry/form/MarketForm.php`, line 216):
  `'dateFormat' => '20', // YYYYMMDD Onix code as a default`

In list 55, code `00` is "YYYYMMDD" ("Common Era year, month and day
(default for most dates)") and `20` is "YYYYMMDD (H)" ("Year month day
(Hijri calendar)"). The comment shows plain YYYYMMDD was meant. Code 20
has meant Hijri since at least 2013 (the code list OMP shipped in
be9f710ae).

The forms save whatever the list posts, and every reader takes the
stored code at its word:

- The book page (`templates/frontend/objects/monograph_full.tpl`,
  `PublicationDate::isHijriCalendar()`) shows the typed digits as a
  date ("20261001" as "2026-10-01"), with no conversion, and adds
  "Hijri Calendar" under it, reproduced in the browser. Markets are not
  shown on the book page.
- The ONIX product (`MonographONIX30XmlFilter`, lines 651 and 820)
  writes the stored code as `dateformat` and `DateFormat`, reproduced in
  the Native XML export. The ONIX 3.0 tool builds the same product
  (read in the code only); on a fresh `main` install that tool fails for
  every book anyway
  ([U74 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A1-onix-export-fails-every-book.md)).
- An existing entry's "Edit" and a refused save show the stored or
  posted code, not the default, so only new entries take it (read in
  the code and checked on screen).
- Stored data: dates saved under the default since 2012 hold `20`, the
  same code as a Hijri date chosen on purpose.

## Proposed fix

Preselect code `00` in both blank forms:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-market-date-preselects-hijri/fix.diff).

```diff
-                'dateFormat' => '20', // YYYYMMDD Onix code as a default
+                'dateFormat' => '00', // ONIX list 55: YYYYMMDD (Gregorian) as a default
```

```diff
-            $templateMgr->assign('dateFormat', '20'); // YYYYMMDD Onix code as a default
+            $templateMgr->assign('dateFormat', '00'); // ONIX list 55: YYYYMMDD (Gregorian) as a default
```

This keeps what the lines were for, a YYYYMMDD default. It stays a
hard-coded code, as `MarketForm::fetch()` already sets its other
blank-form defaults (`dateRole` `01`, `currencyCode` `CAD`).

Tried on `main`: both windows opened on "YYYYMMDD", the book page
showed the date with no calendar note, and the file stated both dates
in format 00. Two cases behaved the same with and without the fix. A
market and a date saved on "YYYYMMDD (H)" on purpose reopened on it,
showed "Hijri Calendar" and exported as 20. A date the server refused
came back in the window still on the format the press had chosen
("YYYY").

**Alternatives**:

- A shared constant for the default on `PublicationDate`. Tidier, but
  OMP names no ONIX code by constant today, and two lines do not need
  one.
- No preselection (an empty first choice). That makes the press choose
  every time, and it is a product decision the one-line fix does not
  need.

**What goes with it**:

- Other instances: the other blank-form defaults on these lists were
  read (list 55 nowhere else; `productAvailabilityCode` `20` in
  `PublicationFormatMetadataForm` is list 65, where 20 is "Available",
  as meant). Nothing in pkp-lib or ui-library sets a list-55 code.
- Stored data, an option for the team: an upgrade migration that turns
  `20` into `00` in `markets.market_date_format` and
  `publication_dates.date_format` would repair every accidental entry,
  but would also change the rare date chosen as Hijri on purpose, since
  the two cannot be told apart. Without it, a press finds its affected
  entries with a query and re-edits each one:

  ```sql
  SELECT pf.publication_id, 'publication date' AS kind, d.date
    FROM publication_dates d JOIN publication_formats pf USING (publication_format_id)
   WHERE d.date_format = '20'
  UNION ALL
  SELECT pf.publication_id, 'market', m.market_date
    FROM markets m JOIN publication_formats pf USING (publication_format_id)
   WHERE m.market_date_format = '20';
  ```
- Backport: the lines are identical on 3.5 and 3.4 (same files and line
  numbers) and on 3.3 (`MarketForm.inc.php` line 180,
  `PublicationDateForm.inc.php` line 151).
- Guard: an end-to-end check that "Add Market" and "Add publication
  date" open on "YYYYMMDD" (planned in pkp-e2e's U74 and U73 specs).

Small: one value in each of two forms. The repair of stored dates is
left to the team as a decision, since it would also rewrite deliberate
Hijri dates; adding the migration would make it medium.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-market-date-preselects-hijri/walk.js),
  with its helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-market-date-preselects-hijri/lib.js).
  It takes the Steps on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/new-market-date-preselects-hijri/walk.js`;
  `MODE=neighbour` runs the neighbour check alone. The stored
  `markets.market_date_format` and `publication_dates.date_format` were
  `20` after steps 3 and 5.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02), with no failed request or page script. Tips: OMP
  `main` 3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6. OMP
  `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib cf3f984335.
- Introduced: blame gives only later reformats (01088072a, fa762069f);
  `git log -S` on the value leads to a92b2dd and 5e0d3c7.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp. Read
  on each: both default lines, list 55 code 20 in the shipped code list
  ("Year month day (Hijri calendar)"), the book page's
  `isHijriCalendar()` note and the ONIX filter writing the stored code.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words ("hijri", "YYYYMMDD", "date format" with
  market or ONIX) and the class names. `pkp/pkp-lib#12851` walks the
  same date window and leaves "YYYYMMDD (H)" as the default in its
  steps, but reports a different fault (a refused date's message stays
  hidden).
