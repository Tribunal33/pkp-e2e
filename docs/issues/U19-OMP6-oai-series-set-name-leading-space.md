# A press's OAI-PMH set list names every series that has no prefix with a leading space

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#347` for `pkp/pkp-lib#1930` · [965c4ab823](https://github.com/pkp/omp/commit/965c4ab82307cb469f34b8364b99a1acd242c081) · 2016-11-10 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#omp6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester reading a press's ListSets expects each series named by its
title. A series with no "Prefix" is named " Library & Information
Studies", with a leading space. Opened in a web browser, the same list
shows the name without the space.

In OAI-PMH the space is in the set list only: a record names its set by
identifier, which is right. The default dataset's five series have no
prefix, so all five are named this way.

## Impact

- **Lost.** Nothing: the set's identifier is right and the set lists
  its books.
- **Who.** A service that shows or matches set names exactly as sent.
  None is known; no harvester was checked.
- **Way round.** A harvester can trim the name. A press has none:
  filling in "Prefix" would change the series' name everywhere.

Low: a wrong value nothing is known to rely on. A named service that
matches on set names would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`: the press `publicknowledge`
  with five series ("Library & Information Studies", "Political
  Economy", "History", "Education", "Psychology"), none with a "Prefix".
- Signed out; the OAI-PMH address is public.

Steps:

1. Open `/index.php/publicknowledge/oai?verb=ListSets`.
2. Open the page's source (the XML as sent) and read each `<setName>`.

**Expected.** Each series' set is named by its title:

```xml
<setSpec>publicknowledge:lis</setSpec><setName>Library &amp; Information Studies</setName>
```

**Observed.** The page of step 1 shows the names without a difference.
As sent, each series' name starts with a space (one set per line
here):

```xml
<setSpec>publicknowledge</setSpec><setName>Public Knowledge Press</setName>
<setSpec>publicknowledge:lis</setSpec><setName> Library &amp; Information Studies</setName>
<setSpec>publicknowledge:pe</setSpec><setName> Political Economy</setName>
<setSpec>publicknowledge:his</setSpec><setName> History</setName>
<setSpec>publicknowledge:ed</setSpec><setName> Education</setName>
<setSpec>publicknowledge:psy</setSpec><setName> Psychology</setName>
```

Control: a series added with the Prefix "The" and the Title "Annals
u19a13" is listed as `<setName>The Annals u19a13</setName>`.

## Cause

OMP's `Section::getLocalizedTitle()`
([`classes/section/Section.php`](https://github.com/pkp/omp/blob/3b0ecf794c/classes/section/Section.php#L38-L45))
returns a series' name with its prefix by default, and joins the two
without looking at the prefix:

```php
$title = $this->getLocalizedData('title');
if ($includePrefix) {
    $title = $this->getLocalizedPrefix() . ' ' . $title;
}
```

A series without a prefix therefore gets `' ' . $title`. `getTitle()`
in the same class does the same per language.
`OAIDAO::getSets()` (`classes/oai/omp/OAIDAO.php`) passes
`getLocalizedTitle()` to the set as its name, and `OAI::listSets()`
prints it as it is.

The join came with 965c4ab823 (`pkp/pkp-lib#1930`), which made the
prefix part of a series' and a book's title by default. Before it,
`getLocalizedTitle()` returned the title alone, `OAIDAO::getSets()`
already passed it as the set's name, and only
`getLocalizedFullTitle()` added a prefix, when there was one
(`if ($prefix = $this->getLocalizedPrefix())`). So the set name was
right until that change, and every version since carries the space.

Reach. Each caller that takes the name with the prefix (the default)
gets the space for a series without one. "Seen" below means seen on an
install in this report's walk; the rest is read in the code.

- OAI-PMH: ListSets only, at the press's address in English and French
  (seen) and at the site-wide address. A record's header carries the
  set's identifier, not its name.
- The set name stored with a deleted record:
  `PublicationFormatTombstoneManager` writes `getLocalizedTitle()` into
  the tombstone's `set_name`, which ListSets prints once the series
  itself is deleted. The spec's own probe of 2026-09-26 saw the space
  there on an install; this report's walk did not go there.
- Outside HTML, on a press:
  - The "Series" column of the Monograph Report's CSV
    (`plugins/reports/monographReport/Report.php`).
  - The web feeds, when the Web Feed plugin's option to include
    identifiers is on (it is off in the dataset):
    `WebFeedGatewayPlugin::getIdentifiers()` puts the name in each
    item's summary and `<category term="…">`.
  - The series names handed to the page's scripts as option and filter
    labels (`CatalogEntryForm`, `ForTheEditors`, `CatalogListPanel`,
    the statistics page, the navigation menu item form).
- In HTML, where a browser drops it: the Series table and the book's
  page (seen), the catalogue and series pages, the "Browse" block.
- Not reached on a press: the citation plugin's
  `htmlspecialchars($section->getTitle(…))`
  (`CitationStyleLanguagePlugin.php`, line 466) sits in the branch for
  articles. Its series line for books already trims
  (`trim($series->getLocalizedFullTitle())`, line 781). The ONIX export
  asks for the title without the prefix.

## Proposed fix

Join the prefix only when there is one, in the two methods
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-series-set-name-leading-space/fix.diff)):

```diff
-        $title = $this->getLocalizedData('title');
-        if ($includePrefix) {
-            $title = $this->getLocalizedPrefix() . ' ' . $title;
+        $title = (string) $this->getLocalizedData('title');
+        if ($includePrefix && ($prefix = $this->getLocalizedPrefix())) {
+            $title = $prefix . ' ' . $title;
         }
```

```diff
-                $title = $this->getPrefix($locale) . ' ' . $title;
+                $prefix = $this->getPrefix($locale);
+                $title = ($prefix ? $prefix . ' ' : '') . $title;
```

Both methods keep returning a string where they do today. For a series
with neither prefix nor title in a language, the join made `' '` out of
two nulls; the diff returns `''` there (the cast in the first method,
the `'' .` in the second), so no caller that expects a string gets
null.

How this was settled:

- **Where the rule lives.** The series class builds the name; fixing it
  there covers every caller above. Trimming in `OAIDAO::getSets()`
  would leave the CSV, the feeds, the labels and new tombstone names.
- **How the code base does it.** `PKPPublication::getLocalizedTitle()`,
  which the same change gave a prefix, joins it inside
  `if ($prefix) { $title = $prefix . ' ' . $title; }`.
- **Every instance.** The two joins in `Section.php` are the only ones
  for a series; the publication's is already conditional.
- **What it touches.** A series with a prefix reads the same. Callers
  get the other names without the space. Set names already stored with
  deleted records keep it.
- **The test.** A unit test of `Section::getLocalizedTitle()` and
  `getTitle()` without a prefix, or the U19 spec's ListSets scenario
  asserting the name as sent (a Planned item).

Tried on OMP `main`. With the diff applied, the five names are sent
without the space, in English and at the French address. The control
series still reads "The Annals u19a13", and the Series table and the
book's "Series" line read the same with the diff in and out. Called
directly, `getTitle()` and `getLocalizedTitle()` of a series without
title or prefix return `''`.

**What goes with it**

- Stored data is left as it is: the `set_name` of tombstones written
  before the fix keeps its space, and shows only in ListSets for a
  series that was deleted. An upgrade step that trims
  `data_object_tombstones.set_name` would clear it; it is not in the
  diff.
- The same lines are on `stable-3_5_0` and `stable-3_4_0`
  (`classes/section/Section.php`) and on `stable-3_3_0`
  (`classes/press/Series.inc.php`).

Small: two joins in one OMP class, tried, with the stored tombstone
names left as they are.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/oai-series-set-name-leading-space/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-series-set-name-leading-space/walk.js)
  takes the Steps on OMP, reads the same list at `…/fr_CA/oai`, then
  signs in as `dbarnes` and adds the control series on Settings › Press
  › "Series" › "Add Series" (Prefix "The", Title "Annals u19a13", Path
  "annals-u19a13"), and reads the list, the Series table and book 14's
  "Series" line. Run it on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/oai-series-set-name-leading-space/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  2c84c3c (2026-10-01); the same names on both.
- Differences from the Steps: the script reads the XML as a plain
  request without a session, where the Steps open the page's source.
  In the page the name's cell holds the space and shows the name
  without it.
- Tips: OMP `main` 3b0ecf794c (`lib/pkp` 3dc90c81a6); `stable-3_5_0`
  b24879c3db (`lib/pkp` 1fb843f491); `stable-3_4_0` 0aec65441f;
  `stable-3_3_0` 8e72fc8836.
- Code reads: on `main`, `Section::getLocalizedTitle()`, `getTitle()`,
  `getLocalizedFullTitle()` and `getLocalizedPrefix()`,
  `OAIDAO::getSets()`, `PublicationFormatTombstoneManager`,
  `PKPPublication::getLocalizedTitle()`, and a search of OMP's classes,
  pages, controllers, plugins and templates for the callers listed
  under Cause (`PKP\section\Repository::getSectionList()` also builds
  the name, and nothing in the checkout calls it). On 3.5, 3.4 and 3.3
  the same two joins and the same call in `OAIDAO::getSets()`. At
  965c4ab823's parent, `Series::getLocalizedFullTitle()` and
  `OAIDAO::getSets()`.
- Upstream: pkp/pkp-lib and pkp/omp searched by "series prefix space",
  "series prefix title", "oai series setName", "getLocalizedPrefix".
  Read: `pkp/pkp-lib#1930` and `pkp/omp#347` (no mention of a series
  without a prefix).
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-series-set-name-leading-space/fix.diff omp`,
  the kept script, then `revert`.
- Not driven: 3.4 and 3.3 (code only); the site-wide address; a deleted
  record's set name; the Monograph Report, the web feeds and the select
  and filter labels (code only); the diff on 3.5.
- Unverified: whether any harvester matches set names as sent.
