# Screen readers hear a raw code, or "Found one item.", when a search finds several items

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; the count was an ordinary text variable)
- **Introduced** `pkp/pkp-lib#7336` for `pkp/pkp-lib#6328` · [773c41603f](https://github.com/pkp/pkp-lib/commit/773c41603ff4582f82f2142a13a28e1f97f19554) · 2021-10-24 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** `pkp/pkp-lib#10691` (open), `pkp/pkp-lib#12642` (open, reported on OJS and OPS 3.5); `pkp/pkp-lib#11294` (open) proposes rewriting this text in plural forms
- **Tracked in** spec U15 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#ojs1), [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#ops1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A reader who searches a journal or a preprint server, and finds more
than one item, hears a status line before the results. It should say
how many items were found ("Found 2 items."). Instead it reads out the
raw code "##search.searchResults.foundPlural##"; on a preprint server
on `main` it says "Found one item." whatever the count.

The results and the visible line under them ("1 - 2 of 2 items") are
right. The status line is hidden from sighted readers, so nobody else
notices it.

The raw code is already reported to pkp (see Upstream). The preprint
server's "Found one item." on `main` is a second fault on the same
line, which a fix for the raw code alone would not cure.

## Impact

- **Lost**: the result count in the announcement a screen reader makes
  when the results arrive.
- **Who**: screen reader users, in every language and on every
  install.
- **Way round**: the visible "{from} - {to} of {total} items" line under
  the results, which a screen reader reaches after the list.

Low: wording on a screen-reader-only line, with the count available
further down the page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS or OPS `main`, freshly loaded.
- A screen reader, or the browser's accessibility inspector, to read the
  status line above the results; it is hidden from view.

1. Signed out, open the journal's (server's) home page:
   `/index.php/publicknowledge`.
2. Press "Search" in the header.
3. Type `however` in the search box and press "Search". [On 3.5, type
   `potential`: 3.5's search drops "however" as a common word and finds
   nothing.]
4. Read the status line announced above the results, then the line under
   them.

**Expected:** the status line says how many items were found, matching
the line under the results: "Found 2 items." on a journal ("Signalling
Theory Dividends" and "Antimicrobial, heavy metal resistance and plasmid
profile of coliforms …"), "Found 7 items." on a preprint server.

**Observed:** on a journal, under "1 - 2 of 2 items":

```
- status: "##search.searchResults.foundPlural##"
```

On a preprint server, under "1 - 7 of 7 items":

```
- status: Found one item.
```

On `main`, the French pages
(`/index.php/publicknowledge/fr_CA/search/search?query=however`) fail
the same way: a journal reads the raw code and a server "Un seul
résultat a été trouvé.".

On `stable-3_5_0` (word `potential`), a journal and a preprint server
both read "##search.searchResults.foundPlural##" (a journal with "1 - 2
of 2 items", a server with "1 - 3 of 3 items").

Control: a search that finds one item (`dividends` on a journal,
`Antimicrobial` on a server) reads "Found one item.", and one that finds
nothing reads "No Results".

## Cause

Both apps' `templates/frontend/pages/search.tpl` choose between two
texts, `search.searchResults.foundSingle` ("Found one item.") and
`search.searchResults.foundPlural` ("Found {$count} items."), and pass
the number to the second as `count`
([OJS lines 95–102](https://github.com/pkp/ojs/blob/ff004d0973/templates/frontend/pages/search.tpl#L95-L102),
[OPS lines 81–88](https://github.com/pkp/ops/blob/c8af945bb7/templates/frontend/pages/search.tpl#L81-L88)):

```smarty
{translate key="search.searchResults.foundPlural" count=$count}
```

Since 3.4, `count` is a reserved name of the `{translate}` tag.
`PKPTemplateManager::smartyTranslate()`
([lines 1992–2005](https://github.com/pkp/pkp-lib/blob/987776cd04/classes/template/PKPTemplateManager.php#L1992-L2005))
takes it out of the text's variables and asks for the text's plural form
instead (`__p()`, through `Locale::translate()`, reaches
`LocaleBundle::translatePlural()` and `Translator::getPlural()`).
`foundPlural` has no plural forms in any language, so `getPlural()`
finds nothing for a count above one, and `Locale::translate()` prints
the key between `##`. The reserved name
came with gettext plural support in 773c41603f; the template lines were
written in 2020 (`pkp/pkp-lib#5182`, `pkp/pkp-lib#5187`, accessibility
fixes), when `count` was an ordinary variable, and were not changed
with it.

On OPS `main` a second fault hides the first. The Scout search port
(`pkp/ops#1067`, 43359941c6) made `$results` a Laravel paginator, but the
template still reads `$results->count`, a property the paginator does
not have. The value is empty, so the `{if $results->count > 1}` branch
never runs and the line always says "Found one item.". In the same work
OJS's template changed to `$results->count()` (2c94407c41, in
`pkp/ojs#4963`), a real number, so OJS reaches the plural branch and
prints the raw code.

Reach:

- These two lines are the only `{translate … count=…}` and the only
  plural-form lookup in OJS, OMP, OPS, pkp-lib and their bundled
  plugins (code).
- Every language fails the same way: the 47 translations of
  `foundPlural` are all single-form (code; French walked). 8 more
  (bs_Latn, ckb, fa, gd, ro, sr_Cyrl, zh_Hans, zh_Hant) are empty, and
  `LocaleFile::loadArray()` drops empty entries, so those languages
  print the raw code for want of a translation, with or without this
  fault.
- `count()` on the `main` paginator is the number of items on the
  current page, not all the items found. A fix that only passed the
  number differently would announce "Found 2 items." on page 2 of 27
  results (25 per page, the default). 3.5's `$results->count` was the
  total (code; the default dataset has too few items for a second
  page).
- OMP has no such line. Its visible "One title was found…" is chosen by
  `$results->count()` too, so page 2 of 26 results, which holds one
  book, would read as one title (code; a separate symptom, left out of
  this fix).

## Proposed fix

A proposal; the team decides. Pass the number through the tag's `params` array, the escape hatch
`smartyTranslate()`'s own documentation gives for reserved names, and
take it from `$results->total()`, as OMP's search page does for its
visible count:

```diff
--- a/templates/frontend/pages/search.tpl   (OJS)
 	{assign var="count" value=$results->count()}
 	{if $count}
 		<div class="pkp_screen_reader" role="status">
-			{if $count > 1}
-				{translate key="search.searchResults.foundPlural" count=$count}
+			{if $results->total() > 1}
+				{translate key="search.searchResults.foundPlural" params=["count" => $results->total()]}
--- a/templates/frontend/pages/search.tpl   (OPS)
-		{assign var="count" value=$results->count}
 		<div class="pkp_screen_reader" role="status">
-			{if $results->count > 1}
-				{translate key="search.searchResults.foundPlural" count=$results->count}
+			{if $results->total() > 1}
+				{translate key="search.searchResults.foundPlural" params=["count" => $results->total()]}
```

OJS keeps `$count` for its checks on an empty page (`{if $count}`,
`{if $count == 0}`). The diffs:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-result-count-screen-reader/fix-ojs.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-result-count-screen-reader/fix-ops.diff).
Tried on `main`, both apps: the status line then read "Found 2 items."
and "Found 7 items.", and the French pages "2 résultats ont été
trouvés." and "7 résultats ont été trouvés.". One hit still read "Found
one item." and no hit "No Results", with the fix in and out.

Every translated language's text works unchanged, since each one
already says `{$count}`. The fix keeps the intent of the plural support: the
template keeps choosing its own singular text, as it did before 3.4.

**Alternatives**:

- Rewrite the two texts as one gettext plural entry, as
  `pkp/pkp-lib#11294` asks: all 47 translations would need converting at
  once, because a language left single-form keeps printing the raw code.
  `smartyTranslate()` also takes `count` out of the variables, so
  `{$count}` would print literally unless the template passes it in
  `params` as well (code, not tried).
- Make `Translator::getPlural()` fall back to the single form when an
  entry has no plural forms: covers any future `count=` caller, but
  changes a shared contract, and the template would still need `params`
  for `{$count}`.

**What goes with it**:

- The 8 languages whose `foundPlural` is empty keep the raw code until Weblate translates them; PKP has no fallback to
  English.
- Backport: 3.5 and 3.4 have the same line with `$results->count` (a
  `VirtualArrayIterator`, whose `count` is the total), so there only the
  `{translate}` changes, to `params=["count" => $results->count]`, and
  the `{if}` stays.
- A theme that overrides `search.tpl` keeps its own copy.
- Test: an e2e check that a search with two hits reads "Found 2 items."
  in the status line.

Small: the same two-line edit in each app's own template, following
the pattern `smartyTranslate()` documents, with no data repair and no
change to pkp-lib or any API; the two edits do not depend on each
other, so each app's fix stands alone.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-result-count-screen-reader/walk.js)
  takes the Steps on OJS and OPS and records the status line's text and
  its accessibility-tree entry, the line under the results, and the
  server log.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/search-result-count-screen-reader/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5); it needs the
    pkp-e2e harness, and the Steps are the way to see it on another
    install.
  - **Neighbour:** `NB=1` in front searches for one hit, for no hit, and
    for `however` on the French page, to show the fix leaves the single
    and empty cases as they were.
- Walks: OJS and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02).
- The branch tips the walks and code reads used:
  - **`main`:** OJS ff004d0973 (pkp-lib 987776cd04), OPS c8af945bb7
    (pkp-lib 3dc90c81a6).
  - **`stable-3_5_0`:** OJS c1cee76b95 (pkp-lib 771474347e), OPS
    38b61882d3 (pkp-lib cf3f984335).
  - **`stable-3_4_0`** (code): OJS d68934d0d1, OPS acd8ae704b, pkp-lib
    767353f4fe.
  - **`stable-3_3_0`** (code): OJS ac77c9fb35, OPS c5532e2161, pkp-lib
    ac3fa73402.
- Code reads:
  - `main`: the Cause's files, plus pkp-lib's
    `pages/search/SearchHandler.php` (`PKP\pages\search\SearchHandler::search()`,
    `$builder->paginate()`), `LocaleFile::loadArray()` and the 55
    `locale/*/common.po` entries of `foundPlural`; a search for `count=` in `{translate}` tags
    and `|translate` modifiers, and for `__p(`, `trans_choice(` and
    `msgid_plural`, over the three apps, pkp-lib and their plugins.
  - 3.5 and 3.4: the same template lines with `$results->count`;
    `VirtualArrayIterator` (`count` is the total);
    `smartyTranslate()` with `count` reserved (773c41603f is on both
    branches).
  - 3.3: the same template lines; `smartyTranslate()` passes every
    parameter to `__()` as a variable, and `locale/en_US/common.po`
    has "Found {$count} items.", so the line reads the count there.
- The trace: `git log -S` on the OJS and OPS template lines leads to
  89d9ca51eb and 8ea5e919cf (2020-11), which wrote `count=` as a variable; `git blame` on
  `smartyTranslate()` to 773c41603f, which made `count` reserved; its PR
  is `pkp/pkp-lib#7336`, merged 2022-02-18. 2c94407c41 belongs to
  `pkp/ojs#4963` (GitHub's `commits/<sha>/pulls`; the PR lists it rebased
  as 56df0ffbf5, "Search implementation tweaks").
- Upstream (searched 2026-10-03): no PR is linked to any of the three
  issues; `pkp/pkp-lib#10691` names the reserved `count` but proposes no
  fix.
