# DOAJ export list's title and author search finds nothing unless the letter case matches

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code read)
  - 3.3: OJS (code read)
- **Introduced** a direct commit to pkp/ojs, without a pull request, for `pkp/pkp-lib#383` · [800f075fd7](https://github.com/pkp/ojs/commit/800f075fd722d51f86253f3a0df52873965cecde) · 2016-06-28 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** U63 [OJS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal whose database is PostgreSQL, a journal manager who searches
the DOAJ Export Plugin's list of articles by "Article Title" or "Authors"
gets "No Items" unless they type the letter case exactly as it is stored.
"signalling" finds nothing where "Signalling" finds "The Signalling
Theory Dividends", and "mwandenga" nothing where "Mwandenga" finds it.

Nothing is lost: retyping with the stored capitals, or paging through
the list, finds the article. But "No Items" reads as if the article were
not there to export or deposit. The "Publications" list that replaces
"Articles" when "DOI Versioning" is on behaves the same.

Installations on MySQL were not checked, for want of a MySQL install;
MySQL's default collations compare text without case, so they are not
expected to show it. The other export tools' lists (Crossref and
DataCite on the DOIs page, Native XML, PubMed) search through another
query that ignores case.

## Impact

- **Lost**: no data; a manager's time.
- **Who**: journal managers and editors using Tools › "DOAJ Export
  Plugin" to find articles to export, register or mark registered, on a
  PostgreSQL installation.
- **Way round**: type the title or name with its stored capitals, or
  clear the search and page through the list (25 rows a page by default).

Low: a cheap way round gets the task done. It would be medium if
managers took "No Items" to mean an article is missing from the DOAJ
export and acted on that.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`, on PostgreSQL. Its journal has
  "DOAJ Plugin" ticked and "DOI Versioning" off, so the DOAJ tool lists
  "Articles". Two articles are published: 1 "The Signalling Theory
  Dividends" (Alan Mwandenga and others) and 17 "Antimicrobial, heavy
  metal resistance and plasmid profile of coliforms isolated from
  nosocomial infections in a hospital in Isfahan, Iran".

Steps:

1. Sign in as `dbarnes`.
2. Tools › "DOAJ Export Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/DOAJExportPlugin`),
   press "Articles". The list reads "1 Mwandenga et al.; The Signalling
   Theory Dividends" and "17 Karbasizaed; Antimicrobial, …".
3. Above the list, press "Search". The filter opens.
4. Leave "Article Title" chosen, type `signalling`, press "Search".
5. Type `Signalling` instead, press "Search".
6. Choose "Authors", type `mwandenga`, press "Search". [3.5: type
   `alan mwandenga`, since 3.5 matches the "Authors" box against the
   whole name only.]
7. Type `Mwandenga` instead, press "Search". [3.5: `Alan Mwandenga`.]

**Expected**: steps 4 to 7 each list "1 Mwandenga et al.; The Signalling
Theory Dividends".

**Observed**: steps 4 and 6 show "No Items". Steps 5 and 7 list "1
Mwandenga et al.; The Signalling Theory Dividends". The same on 3.5 with
its step 6 and 7 names.

The "Publications" list (Settings › Distribution › "DOIs" › "Setup",
"DOI Versioning" "Yes") gives the same: "Article Title" `signalling`
shows "No Items", `Signalling` lists "1 VoR 1.0 Mwandenga et al.; The
Signalling Theory Dividends", and "Authors" `karbasizaed` shows "No
Items".

## Cause

The list's filter hands the typed text to `getExportable()`, which
matches it with a plain SQL `LIKE`. On PostgreSQL `LIKE` compares letter
case, so the typed text matches only when its capitals are the stored
ones. In ojs `classes/submission/DAO.php`, `DAO::getExportable()`, lines
83 and 84:

```php
->when($title != null, fn (Builder $q) => $q->where('pst.setting_name', '=', 'title')->where('pst.setting_value', 'LIKE', "%{$title}%"))
->when($author != null, fn (Builder $q) => $q->whereRaw("CONCAT(COALESCE(asgs.setting_value, ''), ' ', COALESCE(asfs.setting_value, '')) LIKE ?", ["%{$author}%"]))
```

The rule it breaks is the one every other list search in the apps
follows: a search box matches whatever case the user types.

Reach:

- The "Articles" list of the DOAJ tool
  (`ExportPublishedSubmissionsListGridHandler::loadData()`): on screen.
- The "Publications" list of the DOAJ tool when "DOI Versioning" is on
  (`ExportPublishedPublicationsListGridHandler::loadData()` →
  `APP\publication\DAO::getExportable()`, lines 124 and 125, the same two
  lines): on screen.
- `PubIdExportSubmissionsListGridHandler` calls the same submission
  query; no bundled plugin opens that grid on `main` (code read).
- `PKP\galley\DAO::buildGetExportableQuery()` (lib/pkp
  `classes/galley/DAO.php`, lines 288 and 293) has the same two `LIKE`s.
  It is called by `PKP\galley\DAO::getExportable()` and by ojs's
  override `APP\galley\DAO::getExportable()` (`classes/galley/DAO.php`
  line 27), both marked deprecated since 3.4. The override's only caller
  is `PubIdExportRepresentationsListGridHandler` (line 276), which no
  bundled plugin opens (code read).
- DOAJ is the only bundled plugin with these lists on `main` (code
  read). Crossref and DataCite work from the DOIs page, and the Native
  XML and PubMed tools list articles in the submissions list panel; all
  three search through `PKP\submission\Collector`, which lowers both
  sides.

## Proposed fix

Lower both sides of the comparison in the two OJS `getExportable()`
queries, the pattern pkp-lib's list searches already use
(`PKP\submission\Collector` for the submissions list's title search,
`PKP\user\Collector`, `PKP\institution\Collector`, ojs
`SubscriptionDAO`); `pkp/pkp-lib#3807` reported the same fault on the
submissions and user lists, whose searches now work this way. The same
change goes in
`classes/submission/DAO.php` and `classes/publication/DAO.php`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-search-matches-letter-case/fix.diff)):

```diff
-            ->when($title != null, fn (Builder $q) => $q->where('pst.setting_name', '=', 'title')->where('pst.setting_value', 'LIKE', "%{$title}%"))
-            ->when($author != null, fn (Builder $q) => $q->whereRaw("CONCAT(COALESCE(asgs.setting_value, ''), ' ', COALESCE(asfs.setting_value, '')) LIKE ?", ["%{$author}%"]))
+            ->when($title != null, fn (Builder $q) => $q->where('pst.setting_name', '=', 'title')->whereRaw('LOWER(pst.setting_value) LIKE LOWER(?)', ["%{$title}%"]))
+            ->when($author != null, fn (Builder $q) => $q->whereRaw("LOWER(CONCAT(COALESCE(asgs.setting_value, ''), ' ', COALESCE(asfs.setting_value, ''))) LIKE LOWER(?)", ["%{$author}%"]))
```

It keeps the field split (a title word typed in "Authors" still finds
nothing). Tried on `main`: with
the fix in, steps 4 to 7 each list "The Signalling Theory Dividends", and
the "Publications" list finds it by "signalling" too.

**Alternatives**:

- Laravel's `whereLike()`, case-insensitive by default (`ilike` on
  PostgreSQL), as ojs's DOI search in `APP\submission\Collector` uses it:
  as good on `main` and 3.5, but 3.4 is on Laravel 9, which lacks it, so
  a backport would differ.
- `ILIKE` on PostgreSQL and `LIKE` on MySQL, chosen by database driver
  as `ControlledVocabEntryMatch` does: it needs a check of the driver,
  where `LOWER()` on both sides works on both databases as written.

**What goes with it**:

- The same change in lib/pkp `PKP\galley\DAO::buildGetExportableQuery()`
  if the team wants the deprecated galley query right too; it is left out
  here because no screen on `main` reaches it, and it needs a pkp-lib PR
  of its own.
- No stored data is wrong, so no repair.
- Backport: 3.5 and 3.4 have the title line as written. Their author
  line has no `%` wildcards (the Steps' 3.5 bracket); there, wrap both
  sides in `LOWER()` and add no wildcards. 3.3 builds the SQL by hand in
  `SubmissionDAO::getExportable()`: `LOWER(pst.setting_value) LIKE
  LOWER(?)`, and the same for the given and family name.
- Guard: a unit test of `getExportable()` with a lower-case title and
  author on PostgreSQL CI, or an e2e check of the DOAJ list's filter.

Small: two lines in each of two sibling DAOs, and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-search-matches-letter-case/walk.js),
  with its helper
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-search-matches-letter-case/lib.js),
  takes the Steps on an install freshly loaded from PKP's default test
  dataset (pkp/datasets `38ab955`, 2026-09-30), PostgreSQL 15:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/doaj-search-matches-letter-case/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. No request failed
  and no page script failed on either version.
- Control searches, to show the fix reaches no further than it should:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-search-matches-letter-case/neighbour.js),
  same command. On "Articles" it searches "Article Title" for
  `mwandenga`, `zzz` and `ANTIMICROBIAL`, and "Authors" for `SIGNALLING`.
  It then turns "DOI Versioning" on and, on "Publications", searches
  "Article Title" for `signalling` and `Signalling` and "Authors" for
  `karbasizaed`. Without the fix, every search shows "No Items" except
  `Signalling`.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/doaj-search-matches-letter-case/fix.diff ojs`
  ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-search-matches-letter-case/fix.diff)),
  then both scripts on OJS `main`, then `revert` with the same arguments.
  With the fix, walk.js lists article 1 at steps 4 to 7. In the control
  searches, `mwandenga` and `zzz` in "Article Title" and `SIGNALLING` in
  "Authors" still show "No Items", and `ANTIMICROBIAL` lists article 17
  alone. On "Publications", `signalling` and `Signalling` list article
  1 and `karbasizaed` lists article 17.
- Branch tips: OJS `main` bade233f73 with lib/pkp 2e377d27fc;
  `stable-3_5_0` 92b9a16b48 with lib/pkp a9c76aed62; `stable-3_4_0`
  9571d8fde7; `stable-3_3_0` 9fdb9bcf9a.
- Code reads: `main` and 3.5 `classes/submission/DAO.php`
  `getExportable()` (3.5 line 85, the same title `LIKE`; line 86 binds
  `[$author]` without wildcards, so 3.5's "Authors" box matches only the
  whole "Given Family" name, a separate fault `pkp/pkp-lib#11589` fixed
  on `main`);
  `main` `classes/publication/DAO.php` `getExportable()` (no 3.5 twin: 3.5
  has no "Publications" list); 3.4 `classes/submission/DAO.php` lines 90
  and 91 (as 3.5) and the DOAJ template opening
  `ExportPublishedSubmissionsListGridHandler`; 3.3
  `classes/submission/SubmissionDAO.inc.php` lines 135 and 136
  (`pst.setting_value LIKE ?` with `%title%`, `asgs.setting_value LIKE ?
  OR asfs.setting_value LIKE ?` with the bare name) and its DOAJ template,
  the same grid.
- Introduced, traced: `git blame` on `main` gives
  [60867c2d74](https://github.com/pkp/ojs/commit/60867c2d744) (2024,
  `pkp/pkp-lib#8700`, the move to Laravel's query builder, which kept the
  `LIKE`) for the title line and
  [b10a6cb667](https://github.com/pkp/ojs/commit/b10a6cb667f) (2025,
  `pkp/pkp-lib#11589`, which added the wildcards to the author line and
  copied both lines into the publication DAO). `git log -S` on the `LIKE`
  leads back to 800f075fd7, which added `getExportable()` with the
  filter to `PublishedArticleDAO` for the Crossref export; GitHub lists no
  PR for it.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched.
  `pkp/pkp-lib#3807` (closed 2018, the submissions and user lists) and
  `pkp/pkp-lib#8697` (closed, the participant assignment's user search)
  report the same `LIKE` fault on other lists; none covers the export
  lists.
- Unverified: that MySQL's default collations make `LIKE` ignore case,
  taken from MySQL's documentation, not walked.
