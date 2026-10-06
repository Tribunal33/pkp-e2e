# Statistics downloads: a double quote in the search phrase or a filter's name breaks that line of the file

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no "Download Report")
- **Introduced** `pkp/ui-library#217` for `pkp/pkp-lib#7318` · [b76f139c](https://github.com/pkp/ui-library/commit/b76f139cc81ed76d4c472161d9a7e4754c85fc68) · 2022-10-25 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Articles", an editor searches for a phrase typed with
double quotes, such as "Signalling Theory", presses "Download Report"
and downloads any file of the window that opens. Each file starts with
lines that record the date range, the filters and the search phrase,
and its search phrase line reads
`"Search Phrase",""Signalling Theory""`: the phrase's own quotes are
not doubled, so the line is not valid CSV and a CSV parser reads the
value as `Signalling Theory""`. Expected:
`"Search Phrase","""Signalling Theory"""`.

A filter's line is written the same way, so it is malformed when the
chosen section, issue or series has a double quote in its name. The
rows of figures are not touched, and the window on screen shows the
phrase and the name correctly.

## Impact

- **Lost.** The exact search phrase or filter name in the lines at the
  top of the file. A CSV parser reads the value with its opening quote
  gone and stray quotes at its end, and splits it over two cells when
  it holds a comma as well as the quotes. No message is shown.
- **Who.** Editors and managers who download statistics while a quoted
  phrase is applied, or with a filter on an issue, section or series
  whose name holds double quotes (an issue titled after a quotation).
  Nothing on the page suggests typing a phrase in quotes.
- **Way round.** Searching without the quotes writes a sound line. For
  a filter there is none, short of renaming the issue, section or
  series.

Low: one line that describes the file is malformed. A phrase that ends
in one double quote (`Theory"`) does more: two CSV parsers read the
next line that holds a quote, the column names in "Download Articles"
and "Download Files", into the phrase's cell. The rows of figures under
it still land in their own columns, so low holds there too. How a
spreadsheet program shows either file was not checked.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. The press and the preprint
  server take steps 1 to 4 with their own words: "Monographs",
  "Download Monographs" and the phrase `"Bomb Canada"` on the press;
  "Preprints", "Download Preprints" and the phrase
  `"Signalling Theory"` on the preprint server.
- For the filter's line: one published issue with double quotes in its
  title, made in step 5. The preprint server's dataset has one
  section, so its page has no "Filters".

The search phrase:

1. Sign in as `dbarnes` and open Statistics › "Articles"
   (`/index.php/publicknowledge/en/stats/publications/publications`).
2. In the table's search box type `"Signalling Theory"`, with the
   double quotes, and press Enter.
3. Press "Download Report".
4. Press "Download Articles" and open the file in a text editor. Do the
   same with "Download Files" and "Download Timeline".

A filter's name (OJS):

5. Open Issues › "Future Issues" and press "Create Issue": Volume 3,
   Number 1, Year 2026, Title `u64f "Open" issue`, "Save". On its row
   press the arrow, "Publish Issue", untick "Send notification email to
   all registered users", "OK".
6. Open Statistics › "Articles", press "Filters" and, under "Issues",
   press `Vol. 3 No. 1 (2026): u64f "Open" issue`. Leave the panel
   open: closing it clears the filter.
7. Press "Download Report", then "Download Articles", and open the
   file.

**Expected.** Each line of the file is valid CSV: a double quote
inside a value is doubled.

```
"Search Phrase","""Signalling Theory"""
"Issues","Vol. 3 No. 1 (2026): u64f ""Open"" issue"
```

**Observed.** In step 3 the window lists "Search Phrase" ·
`"Signalling Theory"`. Each of the three files of step 4 starts:

```
"Date Range","2026-09-01 to 2026-10-01"
"Sections","All Sections"
"Issues","All Issues"
"Search Phrase",""Signalling Theory""
```

The file of step 7 starts:

```
"Date Range","2026-09-01 to 2026-10-01"
"Sections","All Sections"
"Issues","Vol. 3 No. 1 (2026): u64f "Open" issue"
```

A CSV parser reads the two cells as `Signalling Theory""` and
`Vol. 3 No. 1 (2026): u64f Open" issue"`.

With the plain phrase `Signalling` the line reads
`"Search Phrase","Signalling"`, which is sound.

## Cause

`StatsPublicationsPage.vue::downloadReport()` (lib/ui-library
`src/components/Container/StatsPublicationsPage.vue`, lines 330 to 361)
writes the file's first lines in the browser, by joining strings:

```js
let searchPhraseRow = this.searchPhrase
	? '"' + this.searchPhraseLabel + '","' + this.searchPhrase + '"\n'
	: '';
```

`dateRangeRow`, each entry of `filtersRow`, `timelineTypeRow` and
`timelineIntervalRow` are built the same way. The value goes between
two double quotes as it is, and CSV needs a double quote inside a
quoted value to be doubled.

The rest of the file comes from the server, which writes it with
`fputcsv()` (`PKPRoutingProvider`, the `withFile` response) and so
escapes its own values. The browser puts its lines in front of that
answer and saves the whole as the file.

The lines came with the "Download" window itself, in `pkp/ui-library#217`
(the two timeline lines in `pkp/ui-library#223`), and first shipped in
3.4.0.

Reach:

- The search phrase, in "Download Articles", "Download Files" and
  "Download Timeline" (walked, three apps; the press's "Download Files"
  on main gave no file, see Evidence).
- "Download Geographic", the window's fourth button while geographical
  statistics are on, calls the same method and gets the same lines
  (code; the dataset has them off, so the window did not offer it).
- A filter's name: an issue's (walked, OJS); a section's on a journal
  or a preprint server and a series' on a press (code:
  `getFilterDescription()` returns the names as stored).
- A phrase ending in one double quote, such as `Theory"`: the line
  reads `"Search Phrase","Theory""` (walked), so the quoted value is
  not closed. Python's `csv` and PHP's `fgetcsv()` read on to the next
  double quote: in "Download Articles" and "Download Files" that takes
  the empty line and the start of the column names into the cell, in
  "Download Timeline" the start of the "Timeline Type" line. The rows
  of figures are read in their own columns.
- A comma alone breaks nothing, since every value is quoted. With the
  quotes, `"Theory, Signalling"` is read as two cells.
- Statistics › "Issues" on a journal: its page extends this one and has
  a search box, so its "Search Phrase" line is the same (code).
- "Date Range", "Timeline Type" and "Timeline Interval" hold dates and
  translated words only. A translation with a double quote would break
  its line the same way (code).
- No other file is joined by hand: in lib/ui-library `new Blob` is
  used by this method, by `CounterReportsEditModal.vue`, the JATS
  download and PkpCite, and those three save text they were given.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/statistics-download-quotes-break-parameter-lines/fix.diff),
applied to the three apps. With it the files of the Steps read
`"Search Phrase","""Signalling Theory"""`,
`"Issues","Vol. 3 No. 1 (2026): u64f ""Open"" issue"` and, for the
phrase `Theory"`, `"Search Phrase","Theory"""`.

A control shows that files without a double quote do not change. With
the fix in and out, the files downloaded with no phrase, with the plain phrase
`Signalling`, and with the filter "Vol. 1 No. 2 (2014)" were the same
line for line, the table's request carried the quoted phrase unchanged,
and the window showed it as typed.

Recommended: one method in the component that writes a line, and the
five lines built through it:

```diff
+		getReportRow(values) {
+			return values
+				.map((value) => '"' + String(value).replace(/"/g, '""') + '"')
+				.join(',');
+		},
…
 			let searchPhraseRow = this.searchPhrase
-				? '"' + this.searchPhraseLabel + '","' + this.searchPhrase + '"\n'
+				? this.getReportRow([this.searchPhraseLabel, this.searchPhrase]) + '\n'
 				: '';
```

How a value is written into a CSV line then lives in one place, and
the Issues and Journal pages inherit the method.

**Alternatives:**

- Escape only `this.searchPhrase` and the filter description. It leaves
  the labels and the date line joined by hand, for the next value to
  break.
- Have the server write these lines with `fputcsv()`. The server does
  not know the filters' names or the labels the window shows, so the
  browser would have to send them: more code in two repos for the same
  result.

**What goes with it:**

- No data repair, and no change to the API.
- Backport: 3.5 has the same lines at the same place. 3.4 has them at
  303 to 334, the same but for one trailing comma, so the hunk needs
  that line adjusted.
- Guard: an e2e scenario in pkp-e2e's usage statistics spec (a quoted
  phrase, then the file's "Search Phrase" line parsed back).

Small: one method and five call sites in one component, plus a test.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/statistics-download-quotes-break-parameter-lines/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/statistics-download-quotes-break-parameter-lines/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all <walk.js>`:
  no argument for the Steps, `neighbour` for the fix's control. It ran
  on installs freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, the `main` and `stable-3_5_0`
  PostgreSQL dumps) and reads the window's rows, each download's
  request and the file's first lines as written.
- How a parser takes the lines was checked with Python's `csv` module
  and PHP's `fgetcsv()` on the lines the walk read, with a row of
  figures added by hand for the phrase `Theory"`. No spreadsheet
  program was opened: unverified there.
- The dataset has no visits in the page's default range, so the table
  read "0 of 0 articles" throughout and the files held the lines at
  the top and the column names, no figures. Whether the quoted phrase
  finds the article was therefore not seen.
- On the press on main, "Download Files" gave no file in step 4: the
  request `stats/publications/files` got an empty response from the
  server (`net::ERR_EMPTY_RESPONSE`), with the fix in and out. On 3.5
  the same button gave its file. A separate fault, not followed here.
- The fix was applied with
  `node bin/try-fix.js apply <fix.diff> ojs omp ops`: the Steps with
  the fix in, and the control with the fix in and out.
- main walked at OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5). 3.5 walked at OJS 091fb65453, OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883): the same lines in every file, the filter's line on OJS
  included.
- Code read on main: lib/ui-library
  `src/components/Container/StatsPublicationsPage.vue`
  (`downloadReport()`, `getFilterDescription()`,
  `getDateRangeDescription()`, `getReportParams()`),
  `StatsIssuesPage.vue` and `StatsContextPage.vue` (both extend it);
  lib/pkp `classes/core/PKPRoutingProvider.php` (the `withFile`
  response); OJS and OMP `pages/stats/StatsHandler.php` (where the
  filters' names come from). 3.5: the same lines of `downloadReport()`.
- 3.4 by code: lib/ui-library `origin/stable-3_4_0` (ee684b34), the
  commit that the 3.4 branches of OJS, OMP and OPS pin
  (`upstream/stable-3_4_0` at c1827e3527, 0aec65441f, acd8ae704b):
  `downloadReport()` joins the same lines at 303 to 334.
- 3.3 by code: lib/ui-library `origin/stable-3_3_0` (96959f9e),
  `StatsPublicationsPage.vue` has no `downloadReport()` and builds no
  file.
- Introduced: `git blame` on lines 330 to 348 (the date range, filter
  and search phrase lines) gives b76f139c, and `git log -S` for
  `searchPhraseRow` and `dateRangeRow` finds no earlier commit; its PR
  is `pkp/ui-library#217`. Lines 350 to 361 (the two timeline lines,
  translated words only) blame to 63517961 of 2022-10-22,
  `pkp/ui-library#223` for `pkp/pkp-lib#8328`, by the same author. Both
  PRs merged on 2022-10-27.
- Upstream search, 2026-10-02, pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, open and closed, by statistics, CSV,
  quotes, escape, "Search Phrase", `downloadReport` and
  `StatsPublicationsPage`. The hits are `pkp/pkp-lib#7318` and its
  PRs, which built the downloads.
