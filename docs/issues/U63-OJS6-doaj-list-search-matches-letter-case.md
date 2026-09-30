# On PostgreSQL, the DOAJ Articles list's title and author search is case-sensitive

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code; also the Crossref and DataCite lists)
- **Introduced** [800f075fd7](https://github.com/pkp/ojs/commit/800f075fd722d51f86253f3a0df52873965cecde) for `pkp/pkp-lib#383` · 2016-06-28 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [OJS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs6)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

The filter's "Article Title" and "Authors" search should find an
article whatever the letter case typed; "signalling" finds nothing
where "Signalling" finds "Signalling Theory Dividends", and "mwandenga"
nothing where "Mwandenga" finds it. The list answers "No Items", as if
no published article matched.

The manager still finds the article by typing the words as they are
written, or by choosing its issue. Only journals on a PostgreSQL
database meet it: PKP's default MySQL collation compares text without
regard to case.

## Impact

- **Lost.** No data. A manager who searches in lower case may conclude
  the article is not ready for DOAJ.
- **Who.** Journal managers of a journal on PostgreSQL, in Tools ›
  "DOAJ Export Plugin" › "Articles" (and "Publications" when "DOI
  Versioning" is on), whenever the typed case differs from the stored
  title or name. On `main` and 3.5 no other export tool lists articles
  this way: Crossref and DataCite deposit from the DOIs page and PubMed
  picks from the submissions list, whose searches ignore case. On 3.3
  the Crossref and DataCite export tools list articles through the
  same query.
- **Way round.** Type the words with the case they are written in, or
  page through the list, or choose the article's issue in the issue
  filter.

Low: the search misleads but the export gets done; a journal that
relies on the search to find articles among many pages would raise it
to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`, on PostgreSQL (MySQL not
  walked: PKP's default collation there, `utf8_general_ci`, ignores
  case, so a MySQL install does not show the fault). It has "DOAJ Plugin" enabled
  and the published article "Signalling Theory Dividends" (submission
  1, by Alan Mwandenga, Amina Mansour and Nicolas Riouf). Nothing is
  created. [3.5: DOAJ is an Import/Export plugin there, listed under
  Tools without being enabled.]

Steps:

1. Sign in as `rvaca` (the journal manager).
2. In the side menu, open "Tools", then "DOAJ Export Plugin".
3. Open the "Articles" tab. It lists "Mwandenga et al.; The Signalling
   Theory Dividends" and "Karbasizaed; Antimicrobial, heavy metal
   resistance …".
4. Press "Search" above the list. A list reading "Article Title", a
   text box, "Any Issue", "Any Status" and a "Search" button show.
5. With "Article Title" chosen, type `signalling` and press "Search".
6. Press "Search" above the list again, replace the text with
   `Signalling` and press "Search".
7. Press "Search" above the list, choose "Authors", type `mwandenga`
   and press "Search". [3.5: type the whole name, `alan mwandenga`;
   the Authors search there matches the whole name only.]
8. Press "Search" above the list, replace the text with `Mwandenga`
   and press "Search". [3.5: `Alan Mwandenga`.]

**Expected.** Steps 5 to 8 each list "Mwandenga et al.; The
Signalling Theory Dividends": the search finds the article whatever
the letter case typed.

**Observed.** Steps 5 and 7 list nothing:

```
No Items
```

Steps 6 and 8 list "1 Mwandenga et al.; The Signalling Theory Dividends
Vol. 1 No. 2 (2014) Not Deposited".

## Cause

`APP\submission\DAO::getExportable()` (OJS, `classes/submission/DAO.php`,
lines 83–84 on `main`) filters the list with a plain SQL `LIKE`:

```php
->when($title != null, fn (Builder $q) => $q->where('pst.setting_name', '=', 'title')->where('pst.setting_value', 'LIKE', "%{$title}%"))
->when($author != null, fn (Builder $q) => $q->whereRaw("CONCAT(COALESCE(asgs.setting_value, ''), ' ', COALESCE(asfs.setting_value, '')) LIKE ?", ["%{$author}%"]))
```

On PostgreSQL `LIKE` compares letter case, so the text must match the
stored title or name exactly in case. The DOAJ "Articles" list
(`ExportPublishedSubmissionsListGridHandler::loadData()`) passes the
typed text to it unchanged. pkp-lib's list searches
(`PKP\submission\Collector`, `PKP\user\Collector`,
`PKP\emailTemplate\Collector`) fold case on both sides instead;
`pkp/pkp-lib#3807` (2018) fixed the Submissions and Users lists that
way, and these export queries were not part of that change.

The `LIKE` came with the method: `PublishedArticleDAO::getExportable()`
in [800f075fd7](https://github.com/pkp/ojs/commit/800f075fd722d51f86253f3a0df52873965cecde) (Crossref
export support). The DOAJ list has called this method since
[6002fcfbcc](https://github.com/pkp/ojs/commit/6002fcfbcc3e4693e98e6d298c416070d9541399),
and every later rewrite kept the `LIKE`.

Reach:

- `APP\publication\DAO::getExportable()` (OJS, lines 124–125), a copy
  of the same query for DOAJ's "Publications" list under "DOI
  Versioning" (code).
- `PubIdExportSubmissionsListGridHandler` (OJS and OPS), the pubIds
  articles list, also calls `APP\submission\DAO::getExportable()`; no
  plugin in either tree loads it on `main` (code). The fix covers it.
- `PKP\galley\DAO::buildGetExportableQuery()` (pkp-lib, lines 285–294),
  the same two filters for the pubIds galleys list
  (`PubIdExportRepresentationsListGridHandler`) in OJS and OPS. No
  plugin in either tree loads that list on `main` (code).
- OPS's `APP\submission\DAO::getExportable()` carries the same two
  lines for `ExportPublishedSubmissionsListGridHandler`, which no OPS
  plugin loads (code). It is left out of the diff because no OPS
  screen reaches it; it can take the same change. OMP has no such
  query.

## Proposed fix

A proposal, tried on `main`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-list-search-matches-letter-case/fix.diff),
against the OJS root, pkp-lib included).

Recommended: fold case on both sides of the two filters, as pkp-lib's
Collectors do (`LOWER(col) LIKE LOWER(?)` in `PKP\user\Collector`,
`LOWER(col) LIKE CONCAT('%', LOWER(?), '%')` in
`PKP\emailTemplate\Collector` and `PKP\submission\Collector`), in
OJS's submission and publication DAOs and in pkp-lib's galley DAO:

```diff
-            ->when($title != null, fn (Builder $q) => $q->where('pst.setting_name', '=', 'title')->where('pst.setting_value', 'LIKE', "%{$title}%"))
-            ->when($author != null, fn (Builder $q) => $q->whereRaw("CONCAT(COALESCE(asgs.setting_value, ''), ' ', COALESCE(asfs.setting_value, '')) LIKE ?", ["%{$author}%"]))
+            ->when($title != null, fn (Builder $q) => $q->where('pst.setting_name', '=', 'title')->whereRaw('LOWER(pst.setting_value) LIKE LOWER(?)', ["%{$title}%"]))
+            ->when($author != null, fn (Builder $q) => $q->whereRaw("LOWER(CONCAT(COALESCE(asgs.setting_value, ''), ' ', COALESCE(asfs.setting_value, ''))) LIKE LOWER(?)", ["%{$author}%"]))
```

`LOWER()` behaves the same on PostgreSQL and MySQL, so one query
serves both, and on MySQL, whose default collations already ignore
case, the results do not change.

Tried on `main`: with the fix, steps 5 to 8 each listed "Mwandenga et
al.; The Signalling Theory Dividends", and `SIGNALLING` found it too.
Three control searches that must find nothing did so with and without
the fix: an author's name typed under "Article Title", a title word
typed under "Authors" and a word in no title each listed "No Items".

**Alternatives**

- Laravel's `whereLike($column, $value, caseSensitive: false)`
  (`ILIKE` on PostgreSQL): shorter, but a new pattern in pkp's code,
  and the author filter's `CONCAT()` expression would still need raw
  SQL.
- Lower-casing the typed text in the grid handlers: the stored titles
  and names keep their case, so it would find nothing at all.
- Escaping `%` and `_` in the typed text: the precedents split
  (`PKP\user\Collector` escapes with `addcslashes($word, '%_')`;
  `PKP\submission\Collector` and `PKP\emailTemplate\Collector` do
  not). A typed `%` or `_` acting as a wildcard loses nothing in this
  list, so it is left out of this change; `addcslashes($title, '%_')`
  on the two bound values adds it if the team wants it.

**What goes with it**

- No stored data, API or hook changes; the method signatures stay.
- Backport: on 3.5 and 3.4, add `LOWER()` on both sides and leave the
  author filter's binding as it is (`[$author]`, without wildcards,
  a whole-name match). 3.3 builds the SQL as strings, and takes
  `LOWER()` on both sides in `SubmissionDAO::getExportable()` (lines
  135–136: `pst.setting_value LIKE ?`, `asgs.setting_value LIKE ? OR
  asfs.setting_value LIKE ?`) and in `ArticleGalleyDAO::getExportable()`
  (lines 329–330, the same two filters).
- Guard: an e2e check in U63.

Medium, because it spans two repos (OJS's submission and publication
DAOs and pkp-lib's galley DAO, two lines each), in a pattern the code
already uses.

## Evidence

- Kept script, which takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-list-search-matches-letter-case/walk.js)
  (with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-list-search-matches-letter-case/lib.js)),
  run with `node bin/probe.js ojs shared/playwright/checks/issues/doaj-list-search-matches-letter-case/walk.js`
  on an install loaded from the default dataset; the control searches
  are
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-list-search-matches-letter-case/neighbour.js)
  beside it. The fix was tried with
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-list-search-matches-letter-case/trial.sh)
  (`node bin/try-fix.js apply …/fix.diff ojs`, walk.js and
  neighbour.js, `node bin/try-fix.js revert ojs`, neighbour.js again).
- Walked 2026-09-30 on `main` and `stable-3_5_0`, OJS, on pkp/datasets
  38ab955 (2026-09-30), PostgreSQL. MySQL not walked: its default
  collation is `utf8_general_ci` (`config.TEMPLATE.inc.php`, and
  `PKPContainer` falls back to it), under which `LIKE` ignores case.
  Every search answered 200; no response of 400 or more and no
  console error on either line.
- Tips: `main`: OJS bade233f73 (pkp-lib 2e377d27fc). `stable-3_5_0`:
  OJS 92b9a16b48 (pkp-lib a9c76aed62). `stable-3_4_0`: OJS 9571d8fde7,
  pkp-lib df13621c2d. `stable-3_3_0`: OJS 9fdb9bcf9a, pkp-lib
  d446601ebe.
- Code reads: `classes/submission/DAO.php` `getExportable()` on 3.5
  (lines 85–86) and 3.4 (lines 90–91) has the title `LIKE` as on
  `main` and the author `LIKE ?` bound to `[$author]` without
  wildcards, which is why the 3.5 Steps type the whole name. 3.3's
  `classes/submission/SubmissionDAO.inc.php` `getExportable()` (lines
  135–136) uses `LIKE` on the title and on the given or family name
  alone. DOAJ's `templates/index.tpl` loads
  `grid.submissions.ExportPublishedSubmissionsListGridHandler` on all
  four lines. pkp-lib's galley DAO has the same `LIKE` on 3.4 (lines
  291–292). On 3.3 `plugins/importexport/crossref` and `datacite`
  load `grid.pubIds.PubIdExportSubmissionsListGridHandler`, which
  calls `SubmissionDAO::getExportable()`; on 3.4, 3.5 and `main` only
  DOAJ loads these grids (Crossref and DataCite are generic plugins
  working from the DOIs page, PubMed uses `SubmissionsListPanel`).
- Introduced: `git blame` of line 83 on `main` gives 60867c2d74 (2024,
  the move to the Laravel query builder for `pkp/pkp-lib#8700`) and of
  line 84 b10a6cb667 (2025, `pkp/pkp-lib#11589`, which added the
  author wildcards on `main` and copied the query into
  `APP\publication\DAO`). `git log -S` on the `LIKE` leads back through
  rewrites that kept it to 800f075fd7, which wrote
  `PublishedArticleDAO::getExportable()` with `sst.setting_value LIKE
  ?`. `commits/800f075fd7/pulls` answers no PR.
- Upstream search 2026-09-30, pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  issues and PRs: "case sensitive search postgresql",
  "case-insensitive search", "getExportable", "DOAJ search case", "DOAJ
  search", "export search case", "export grid search author", "ILIKE",
  "LIKE case insensitive postgres". Read and set aside:
  `pkp/pkp-lib#3807` (Submissions and Users lists, fixed in their
  query builders), `pkp/pkp-lib#8697` (user search when assigning
  participants), `pkp/pkp-lib#5907` (the Crossref list's status
  filter).
- Not driven: DOAJ's "Publications" list (needs "DOI Versioning" on),
  the pubIds galleys list and OPS's export query (no screen loads
  them), 3.4 and 3.3.
