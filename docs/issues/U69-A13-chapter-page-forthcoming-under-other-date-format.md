# On a press whose short date format is not year-first, a published chapter's page is headed "Forthcoming"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no chapter pages)
- **Introduced** `pkp/omp#1012` for `pkp/pkp-lib#7132` · [bd5eb048df](https://github.com/pkp/omp/commit/bd5eb048df2bca32ea40e7fec7848b653c99afad) · 2021-11-08 · marsilius (nongenti)
- **Upstream** `pkp/pkp-lib#10169` (closed), covering the book's page only: its fix left the chapter page as it was
- **Tracked in** spec U69 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a13)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press that has changed its "Date (Short)" setting, a published
chapter's page can be headed "Forthcoming" above its publication date:
a chapter of a book published on December 31, 2024 reads "Forthcoming
December 31, 2024". The book's own page reads "Published".

The other way round, a chapter of a book scheduled for a later date can
read "Published" in an editor's preview while the book's page reads
"Forthcoming".

Only the heading is wrong, and whether it is wrong changes with the day
the page is read: on part of each month under a day-first format, on
part of each year under the month-first one, depending on the day or
month the book was published.

It needs a chapter with its own page. The year-first format, which a
press has until someone changes the setting, is not affected; the three
other choices the setting offers (day-month-year, month/day/year,
day.month.year) are.

## Impact

- **Lost.** Readers are told that a published chapter is still to come,
  on a page that carries its files.
- **Who.** Readers of a press that gives chapters their own pages and
  shows short dates in another order than year-month-day. Each chapter
  is hit on the days the Cause's rule gives: a book published on the
  31st on almost every day, one published on the 1st on none. The wrong
  "Published" on a scheduled book's chapter is seen only by the editors
  who preview it.
- **Way round.** Choosing the year-first "Date (Short)" again, which
  changes every short date of the press's site.

Low: a wrong heading on a public page, while the date under it, the
files and the book's page are right.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. Submission
  14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", is published; its "Chapter 1: Mind Control—Internal or
  External?" has its own page. "Date (Short)" is the first choice.
- The dataset's book carries the date of the day the dataset was built.
  Steps 2 to 4 give it a fixed date instead, so that the steps come out
  the same on any day.

1. Sign in as `dbarnes` (Press editor).
2. Open submission 14's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`,
   press "Unpublish" and, in the window that asks, "Unpublish".
3. Under "Publication", open "Catalog Entry", type 2024-12-31 in "Date
   Published" and press "Save".
4. Press "Publish", then "Publish" in the window that asks "Are you sure
   you want to make this catalog entry public?".
5. Open Settings › Website › "Setup" › "Date & Time". Under "Date
   (Short)" choose the second choice, today's date as day-month-year
   ("01-10-2026" on 1 October 2026), and press "Save".
6. Signed out, open `/index.php/publicknowledge/catalog/book/14`. The
   side column reads "Published December 31, 2024".
7. In the table of contents press "Chapter 1: Mind Control—Internal or
   External?".

The other way round:

8. As `dbarnes`, in the workflow press "Unpublish" › "Unpublish", type
   next year's 1 January (2027-01-01) in "Catalog Entry" › "Date
   Published" and press "Save".
9. Press "Publish". The button and the window read as in step 4 (the
   window is headed "Schedule For Publication" for either date); press
   "Publish" in it. The workflow now reads "Status: Scheduled" and
   offers "Preview" and "Unschedule".
10. Press "Preview": the book's page opens under the preview notice and
    reads "Forthcoming January 1, 2027". Still as `dbarnes`, in that
    page's table of contents press "Chapter 1: Mind Control—Internal or
    External?".

**Expected:** the chapter's page is headed as the book's page is:
"Published" in step 7, "Forthcoming" in step 10.

**Observed:** step 7 (on every day but 31 December):

```
Forthcoming
December 31, 2024
```

and the same with the third choice ("10/01/2026") and the fourth
("01.10.2026"). Step 10 (on every day but 1 January):

```
Published
January 1, 2027
```

With the first choice (before step 5) the chapter's page reads
"Published December 31, 2024".

## Cause

OMP
[`templates/frontend/objects/chapter.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/chapter.tpl#L191)
line 191 decides the heading with

```smarty
{if $publication->getData('datePublished')|date_format:$dateFormatShort > $smarty.now|date_format:$dateFormatShort}
```

Both dates are first written in the press's short date format, and the
two strings are compared. Only a year-first format sorts as text in
date order. The rule the comparison gives, per format:

- day-month-year ("d-m-Y", "d.m.Y"): the day of the month decides, then
  the month, then the year. A chapter reads "Forthcoming" whenever its
  book's day of the month is higher than today's: "31-12-2024" is
  greater than "01-10-2026".
- month/day/year ("m/d/Y"): the month decides, then the day, then the
  year. A chapter reads "Forthcoming" in every month of the year before
  its book's month, and in that month before its day: "12/31/2024" is
  greater than "10/01/2026".

The book's page had the same line.
[9ef7e044b8](https://github.com/pkp/omp/commit/9ef7e044b8842bda5315adeb06e0aaadc7a7e708)
(`pkp/pkp-lib#10169`, 2024-10-16) changed it in
[`monograph_full.tpl`](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/templates/frontend/objects/monograph_full.tpl#L332-L333)
to compare `date_format:"Y-m-d"` strings, on `main` and, backported, on
3.4 and 3.3. The chapter page's template, which came with chapter pages
in bd5eb048df with the line copied from the book's page, was not
touched. That issue describes "the monograph landing page" and asks
nothing of the chapter page, so its fix did what it was asked: the kind
is a defect of the chapter page since it exists, not a gap in that fix.

Reach:

- Every chapter page of a press whose "Date (Short)" for the page's
  language is not "Y-m-d": the three other offered choices (on screen)
  and any custom format that does not start with the year (code).
- The comparison uses the version's date even when the chapter has its
  own date and the line under the heading shows that one (code).
- No other template compares formatted dates: a search of the three
  apps' and pkp-lib's templates for a `date_format` beside a comparison
  finds only these two lines.

## Proposed fix

Recommended: compare the dates as "Y-m-d" in `chapter.tpl`, with the
line `pkp/pkp-lib#10169` gave the book's page
([fix-a13.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/fix-a13.diff)):

```diff
-							{if $publication->getData('datePublished')|date_format:$dateFormatShort > $smarty.now|date_format:$dateFormatShort}
+							{* Use Y-m-d to compare dates instead of customizable date formats (pkp-lib#10169) *}
+							{if $publication->getData('datePublished')|date_format:"Y-m-d" > $smarty.now|date_format:"Y-m-d"}
```

Tried on `main`: with each of the three other "Date (Short)" choices
the chapter's page read "Published December 31, 2024", and the
scheduled book's chapter read "Forthcoming January 1, 2027" in the
preview. With the first choice the page read "Published", with the fix
in and out.

**Alternatives:**

- Comparing timestamps in `CatalogBookHandler::book()` and passing a
  flag to both templates would put the rule in one place, but departs
  from the fix the team chose for the book's page.

**What goes with it:**

- A backport: the diff applies as written to 3.5 and 3.4.
- Left out: whether the heading should follow the chapter's own date.
  A chapter gets one when the book's "Marketing" › "Publication Dates"
  reads "Each chapter may have its own publication date." and the
  chapter's "Date Published" is filled in. `CatalogBookHandler::book()`
  (lines 169–171, 198) already passes that date to `chapter.tpl` as
  `$datePublished`, so following it would be the same one line with
  that variable. It is the team's call.
- The guard: an e2e scenario in U69 that reads a chapter page's heading
  under a day-first "Date (Short)".

Small: one line in one template, copied from the book's page.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/walk.js)
  takes these Steps on OMP on an install freshly loaded from the default
  dataset, beside those of two other reports about the chapter page:
  `PHASES=a13 PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/walk.js`.
- The fix was tried with `node bin/try-fix.js apply …/fix.diff omp`,
  the script without `PHASES`, then `revert`: `fix.diff` holds the three
  reports' diffs, tried together in one walk on `main`, and the
  neighbour checks read the same with the fix in and out.
- Where the walk differed from the Steps: the visitor's pages are read
  in a second browser while `dbarnes` stays signed in, and the script
  reads the book's and the chapter's page under each of the four
  choices.
- Walked on `main` and `stable-3_5_0` (OMP), on 2026-10-01, PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets fetched
  at 92050d9 (2026-10-01). OJS and OPS have no chapters.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  b24879c3d (lib/pkp 1fb843f491); OMP `stable-3_4_0` 0aec65441 (lib/pkp
  df13621c2d); OMP `stable-3_3_0` 8e72fc883.
- Code reads: `chapter.tpl` and `monograph_full.tpl` on each line (3.3
  has no `chapter.tpl`). `PKPDateTimeForm` (lib/pkp
  `classes/components/forms/context`) for the four "Date (Short)"
  choices: "Y-m-d", "d-m-Y", "m/d/Y", "d.m.Y".
  `Context::getDateTimeFormats()` and `config.TEMPLATE.inc.php`
  (`date_format_short = "Y-m-d"`) for what a press has before the
  setting is saved.
- Introduced: `git blame` on `chapter.tpl` line 191 names bd5eb048df
  ("pkp/pkp-lib#7132 Review changes", in every release from 3.4.0),
  merged with `pkp/omp#1012` on 2021-11-17.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/omp: "forthcoming
  chapter", "forthcoming date format", "chapter forthcoming published
  date format", "forthcoming" (pkp/omp). `pkp/pkp-lib#10169` names no
  chapter page; its three pull requests (`pkp/omp#1724`, `#1729`,
  `#1730`) changed `monograph_full.tpl` only.
- Unverified: a custom format (code only); the days on which the
  heading comes out wrong follow from the comparison and were walked on
  one day only.
