# Two search settings in the configuration file still promise an effect but change nothing

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS (OMP and OPS by code)
  - 3.5: none (both settings in force; OMP and OPS by code)
  - 3.4: none (code; both settings in force)
  - 3.3: none (code; both settings in force)
- **Introduced** `pkp/pkp-lib#11578` with `pkp/ojs#4963`, `pkp/omp#2081` and `pkp/ops#1067` for `pkp/pkp-lib#8920` · [b44cf27793](https://github.com/pkp/pkp-lib/commit/b44cf2779332947932c22bc3e3131d2c1ab09f1e) · 2025-08-01 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#11711` (open): the 3.6.0 release-notes checklist, which will tell administrators that both settings are no longer supported; no issue asks for the lines to be taken out of the configuration file
- **Tracked in** spec U15 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The search section of the configuration file still lists "Minimum
indexed word length" (`min_word_length = 3`) and "The maximum number of
search results fetched per keyword" (`results_per_keyword = 500`), each
with a note on what it does. The application no longer reads either
value. An administrator who changes them to tune the site's search
changes nothing, and nothing tells them so.

The search rewrite dropped both settings on purpose. Search now leaves
word length to the database's full-text search (or to OpenSearch), and
it pages all matches with no cap per word. Only the two lines and their
notes are left behind, and Administration › "System Information" lists
them with the rest of the search section, as if they were in force.

## Impact

- **Lost.** An administrator's time, spent changing a setting that has
  no effect. Search results are not affected.
- **Who.** The site administrator who edits `config.inc.php`. Every new
  install starts from a configuration file that carries both settings.
- **Way round.** To control word length, the administrator changes the
  database's own full-text settings, or the OpenSearch index's analyzer
  when that driver is chosen. The number of results needs no setting:
  every match is listed, page by page.

Low: search works without the two lines, and only an administrator who
edits the configuration file meets them. It would be medium if a site
relied on `min_word_length` to keep short words out of its results.

## Steps to reproduce

- The default dataset, OJS `main`. OMP and OPS run the same search code.
- Access to the install's `config.inc.php`.

1. As a visitor, open the journal's Search page
   (`index.php/publicknowledge/search`), type `Antimicrobial` and press
   "Search". The published article "Antimicrobial, heavy metal resistance
   and plasmid profile of coliforms isolated from nosocomial infections
   in a hospital in Isfahan, Iran" is listed.
2. In `config.inc.php`, in the `[search]` section, set
   `min_word_length = 50`.
3. Search for `Antimicrobial` again.

**Expected.** As the file's note says, words shorter than 50 letters
are no longer indexed or searched, so the search shows "No Results".

**Observed.** The article is still listed, exactly as in step 1.

On 3.5 the same steps end with "No Results" after step 3, with no index
rebuild needed: the setting drops the typed word too. Setting
`min_word_length` back to 3 restores the result.

## Cause

`pkp/pkp-lib#11578` (for `pkp/pkp-lib#8920`) replaced the built-in
keyword index with Laravel Scout engines. It deleted the two classes
that read the settings:

- `SubmissionSearchIndex::filterKeywords()` read `min_word_length` and
  dropped shorter words from both the indexed text and the query (3.5
  `lib/pkp/classes/search/SubmissionSearchIndex.php`, line 40).
- `SubmissionSearch::_getMergedArray()` read `results_per_keyword` to
  cap the results fetched for each keyword before they were merged (3.5
  `lib/pkp/classes/search/SubmissionSearch.php`, line 142).

On `main`, `PKP\search\engines\DatabaseEngine::buildQuery()` hands the
whole query to the database's full-text match (`whereFullText()` on
`submissions_fulltext`). There are no keywords to filter by length and
no per-keyword list to cap. Which words match is decided by the
database: PostgreSQL's `to_tsvector('english', …)` parser and stop
words, with no minimum length, or MySQL's and MariaDB's
`innodb_ft_min_token_size` (`ft_min_word_len` for MyISAM). The Search
page calls `paginate()`, which wraps `buildQuery()` and pages every
match. `PKPContainer` reads `driver`, and the two engines read only
`search_index_name` and the `opensearch_*` settings.

The companion app changes (`pkp/ojs#4963`, `pkp/omp#2081`,
`pkp/ops#1067`) added `driver`, `search_index_name` and the
`opensearch_*` lines to the `[search]` section of
`config.TEMPLATE.inc.php`. They kept the two old entries and their
notes, which date from 2005. The configuration section posted in the
`pkp/pkp-lib#8920` discussion (2025-07-10) leaves both out, and
`pkp/pkp-lib#11711` calls them "no longer supported". So the drop was
meant, and the template is what was missed. It counts as a regression
because on 3.5 these lines changed search, and since that change they
do nothing while the file still says they work.

The reach:

- `config.TEMPLATE.inc.php` of OJS, OMP and OPS, the same `[search]`
  section in all three.
- pkp-lib's test configurations, `tests/config/config.TEMPLATE.mysql.inc.php`,
  `config.TEMPLATE.pgsql.inc.php` and `config.mysql.inc.php`, carry both
  keys. `tests/classes/config/ConfigTest.php` loads them but checks only
  `[general]` and `[database]`.
- No other file in the apps, pkp-lib or the bundled plugins names
  either key. The one screen that shows the whole configuration is
  "System Information" (`AdminHandler::systemInfo()`), which lists every
  key in the file, read or not.
- Existing installs keep both lines in their own `config.inc.php` after
  upgrading. `Config` ignores keys nobody asks for, so the lines do no
  harm, but "System Information" keeps listing them.

## Proposed fix

Delete the two entries and their notes from the `[search]` section of
each app's `config.TEMPLATE.inc.php`, and the two keys from pkp-lib's
test configurations
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-config-settings-do-nothing/fix.diff),
one diff against the app root that applies to all three apps):

```diff
 ;opensearch_debug = Off
 
-; Minimum indexed word length
-min_word_length = 3
-
-; The maximum number of search results fetched per keyword. These results
-; are fetched and merged to provide results for searches with several keywords.
-results_per_keyword = 500
-
 ; Paths to helper programs for indexing non-text files.
```

The template then offers only what the new engines read, as the
section posted in `pkp/pkp-lib#8920` does. The installer writes no
`[search]` value when it creates `config.inc.php`
(`PKPInstall::createConfig()`), so a new install made from the trimmed
template is unaffected. The fix was not tried as a walk: it removes text
from a template, and the Steps edit an install's own file, which the fix
does not touch.

**Alternatives**

- Bring the settings back in `DatabaseEngine`: not recommended. Word
  length now belongs to the database and to OpenSearch's analyzers, and
  `pkp/pkp-lib#11711` records the team's decision to leave it there.
- Keep the lines and mark them unused: administrators would still have
  to read past them, and "System Information" would still list them.

**What goes with it**

- The release-notes line `pkp/pkp-lib#11711` already plans tells
  administrators to delete both lines from their own `config.inc.php`.
  No upgrade step is needed, since leftover lines are ignored.
- No test: no code reads the app templates, and `ConfigTest` does not
  look at `[search]`. The release-notes item is the check.

A proposal; the team decides. Small: a few lines deleted in each of
four configuration files (three apps and pkp-lib), each pull request
independent of the others, with no code change, no data repair and
nothing an API client or plugin relies on.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-config-settings-do-nothing/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-config-settings-do-nothing/lib.js),
  which edits the install's configuration file for step 2 and restores
  it afterwards. It was walked on OJS on `main` and on 3.5, PostgreSQL,
  default dataset. OMP and OPS were not walked: they run the same
  pkp-lib search code on each line (`DatabaseEngine` on `main`,
  `SubmissionSearchIndex` on 3.5).
- Branch tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (lib/pkp cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441,
  OPS acd8ae704b (lib/pkp 767353f4fe); `stable-3_3_0` OJS ac77c9fb35,
  OMP 8e72fc883, OPS c5532e2161 (lib/pkp ac3fa73402).
- Code read, `main`: `git grep` for `min_word_length` and
  `results_per_keyword` across each app (plugins included) and its
  lib/pkp, which finds only `config.TEMPLATE.inc.php` and
  `lib/pkp/tests/config/*`. Also read: every
  `Config::getVar('search', …)` call (`PKPContainer`, `DatabaseEngine`,
  `OpenSearchEngine`, `SearchFileParser`, `SearchHelperParser`);
  `SearchHandler::search()`; `DatabaseEngine::buildQuery()` and
  `paginate()`; Laravel's `PostgresGrammar::whereFullText()`;
  `PKPInstall::createConfig()`.
- Code read, 3.5, 3.4 and 3.3:
  `SubmissionSearchIndex::filterKeywords()` reads `min_word_length`,
  applied to the query's words in `SubmissionSearch::_parseQueryInternal()`
  (line 122 on 3.5), and `SubmissionSearch::_getMergedArray()` reads
  `results_per_keyword` on each line (`.inc.php` files on 3.3). Each
  app's template carries both keys.
- Introduced: `git blame` on the app templates puts the two entries in
  2005 (OJS ce4838fd06 and 37d3447337) and 2008 (OMP 16111b123). The
  `[search]` lines around them came with `pkp/ojs#4963`, `pkp/omp#2081`
  and `pkp/ops#1067`. pkp-lib b44cf27793 (`pkp/pkp-lib#11578`) deleted
  `SubmissionSearch.php` and `SubmissionSearchIndex.php`. All four PRs
  were merged on 2025-08-01.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ops for the
  two keys, "minimum indexed word length", and the configuration and
  Scout wording (2026-10-03). `pkp/pkp-lib#11711` is the only match, an
  unticked item: "The `min_word_length` and `results_per_keyword`
  settings in `config.inc.php` are no longer supported due to the search
  rewrite". `pkp/pkp-lib#13393` quotes `min_word_length` about 3.5's
  index and is a different fault.
- `fix.diff` applies with `patch -p1 --dry-run` to each app's `main`
  checkout. `results_per_keyword` was not walked, because the dataset
  has no word matching enough published items to show a cap; it rests on
  the code read. The MySQL rules for short words were not checked on a
  MySQL install.
