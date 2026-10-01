# A press's series with no prefix are named with a leading space in OAI-PMH sets and web feeds

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; OAI-PMH sets only, its feeds name no series)
- **Introduced** `pkp/omp#347` for `pkp/pkp-lib#1930` · [965c4ab823](https://github.com/pkp/omp/commit/965c4ab82307cb469f34b8364b99a1acd242c081) · 2016-11-10 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#omp6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester reading a press's ListSets expects each series named by its
title. A series with no "Prefix" is named " Psychology", with a leading
space. A browser showing the answer collapses the space, so it is seen
only in the page source.

The Web Feed plugin, on by default for every press, sends a book's
series with the same space in its Atom, RSS 1.0 and RSS 2.0 feeds.

The sets' addresses and records are right, and a series that has a
"Prefix" reads "Prefix Title" as it should. The only way to avoid the
space is to give every series a prefix.

## Impact

- **Lost**: a clean series name in what the press gives out to
  machines.
- **Who**: every press, for each series whose optional "Prefix" is
  left empty.
- **Way round**: none that keeps the series' title as it is.

Low: the name is right apart from one leading space; it would be medium
if a harvester or feed reader in use matched set or category names
exactly, which was not checked.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (or `stable-3_5_0`): the press
  `publicknowledge`, "Public Knowledge Press". Its five series (Library &
  Information Studies, Political Economy, History, Education,
  Psychology) all have an empty "Prefix"; book 14, "From Bricks to
  Brains: The Embodied Cognitive Science of LEGO Robots", is published
  in "Psychology". Nothing to create.

Without a prefix:

1. Open `/index.php/publicknowledge/oai?verb=ListSets` (no sign-in
   needed).
2. View the page source and find the set `publicknowledge:psy`.
3. Open `/index.php/publicknowledge/gateway/plugin/WebFeedGatewayPlugin/atom`,
   view the source and find book 14's category labelled "Series".
4. Do the same with `…/WebFeedGatewayPlugin/rss2`: its category in the
   `…/omp/category/section` domain.

With a prefix (the control):

5. Sign in as `rvaca` (press manager) and open Settings › Press ›
   "Series".
6. Edit "History", type `u19w22` in "Prefix" and press "Save".
7. Open the address of step 1 again and view the source.

**Expected**: every series named by its title alone, and a series with a
prefix by "Prefix Title":

```xml
<setSpec>publicknowledge:psy</setSpec>
<setName>Psychology</setName>
```

```xml
<category term="Psychology" label="Series" scheme="https://pkp.sfu.ca/omp/category/section"/>
<category domain="https://pkp.sfu.ca/omp/category/section">Psychology</category>
```

**Observed**: each of the five series' set names opens with a space
(step 2), and so does the series name in both feeds (steps 3 and 4):

```xml
<setSpec>publicknowledge:lis</setSpec>
<setName> Library &amp; Information Studies</setName>
…
<setSpec>publicknowledge:psy</setSpec>
<setName> Psychology</setName>
```

```xml
<category term=" Psychology" label="Series" scheme="https://pkp.sfu.ca/omp/category/section"/>
<category domain="https://pkp.sfu.ca/omp/category/section"> Psychology</category>
```

After step 6 the series grid reads "u19w22 History", and step 7 lists
`<setName>u19w22 History</setName>` while the other four keep their
leading space.

## Cause

OMP's `APP\section\Section` (`classes/section/Section.php`), the series
object, overrides `getLocalizedTitle(bool $includePrefix = true)` and
`getTitle(?string $locale, bool $includePrefix = true)` to put the
series' prefix in front of its title. Both join the two with a space
whether or not a prefix is set:

```php
if ($includePrefix) {
    $title = $this->getLocalizedPrefix() . ' ' . $title;
}
```

With an empty or missing prefix the result is `' ' . $title`. The rule
the code base follows elsewhere is to add the prefix and its space only
when there is a prefix: `PKPPublication::getLocalizedTitle()` tests `if
($prefix)` first.

The series' own code did too before
[965c4ab823](https://github.com/pkp/omp/commit/965c4ab82307cb469f34b8364b99a1acd242c081)
("Include monograph and series prefix in title by default"). Until then
`getLocalizedTitle()` was `PKPSection`'s, the title alone, so ListSets
named a series without a space, and only `getLocalizedFullTitle()` added
the prefix, inside `if ($prefix = $this->getLocalizedPrefix())`. The
change moved the prefix into `getLocalizedTitle()` and `getTitle()` so
that every title request carries it, and dropped the test on the way.

`OAIDAO::getSets()` names each series' set with
`$series->getLocalizedTitle()`, and `WebFeedGatewayPlugin::getIdentifiers()`
gives the feeds the series' name the same way, so both send the space.

Reach of the cause:

- OAI-PMH ListSets at the press's address: checked on screen (main,
  3.5). The site-wide address runs the same loop: checked in the code.
- The Atom and RSS 2.0 feeds' series category: checked on screen (main,
  3.5). The RSS 1.0 feed's series subject (`<rdf:value>`) takes the
  same value: checked in the code.
- A withdrawn book's deleted record stores its series' set name
  (`PublicationFormatTombstoneManager` writes
  `$series->getLocalizedTitle()` to `data_object_tombstones.set_name`).
  ListSets shows that stored name only once the series itself is
  deleted: checked in the code.
- The citation plugin already trims the name
  (`trim($series->getLocalizedFullTitle())` for `collection-title`), and
  the ONIX 3.0 export and the series form ask for the title without the
  prefix: checked in the code.
- OJS and OPS sections have no prefix (`PKPSection::getLocalizedTitle()`
  returns the title alone): not affected.

## Proposed fix

Add the prefix only when there is one, in the two methods of
`APP\section\Section`, as `PKPPublication::getLocalizedTitle()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-series-set-name-leading-space/fix.diff)):

```diff
     public function getLocalizedTitle(bool $includePrefix = true): string
     {
-        $title = $this->getLocalizedData('title');
-        if ($includePrefix) {
-            $title = $this->getLocalizedPrefix() . ' ' . $title;
+        $title = $this->getLocalizedData('title') ?? '';
+        if ($includePrefix && ($prefix = $this->getLocalizedPrefix())) {
+            $title = $prefix . ' ' . $title;
         }
         return $title;
     }
@@ getTitle()
             if (is_array($title)) {
                 foreach ($title as $locale => $currentTitle) {
-                    $title[$locale] = $this->getPrefix($locale) . ' ' . $currentTitle;
+                    if ($prefix = $this->getPrefix($locale)) {
+                        $title[$locale] = $prefix . ' ' . $currentTitle;
+                    }
                 }
-            } else {
-                $title = $this->getPrefix($locale) . ' ' . $title;
+            } elseif ($prefix = $this->getPrefix($locale)) {
+                $title = $prefix . ' ' . $title;
             }
```

The `?? ''` is needed on `main` today. There, the public series page
receives a series with no title at all: `DAO::getByPath()` passes
`[$row->section_id]` to `EntityDAO::fromRow()` as the ids whose settings
to load, but the `series` table's key is `series_id`. So the settings
query asks for series `null` and returns nothing, and the series reaches
the page without its title, prefix or description (spec U17
[OMP9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp9),
since omp `4c2b5d77b`, 2026-08-26; not on 3.5).

The current code hides that, since `' ' . null` is still a string. A
first version of the fix without `?? ''` turned
`/index.php/publicknowledge/en/catalog/series/psy` and `…/series/his`
(English, the press's primary locale) into server errors:

```
PHP Warning:  Undefined property: stdClass::$section_id in classes/section/DAO.php on line 71
PHP Fatal error:  Uncaught TypeError: APP\section\Section::getLocalizedTitle(): Return value must be of type string, null returned in classes/section/Section.php:44
#0 cache/t_compile/…catalogSeries.tpl.php(29): APP\section\Section->getLocalizedTitle()
…
#13 pages/catalog/CatalogHandler.php(202): PKP\template\PKPTemplateManager->display('frontend/pages/...')
```

With `?? ''` those pages answer as they do now, with an empty heading.
The guard can be dropped once `getByPath()` passes `$row->series_id`.

Tried on OMP `main`: ListSets and both feeds then name every series by
its title alone, and the control still reads "u19w22 History". The
series grid, book 14's "Series" line, the press's own set and the two
series pages read the same with the fix in and out; the series pages'
empty heading loses only its single space. The diff applies as written
to `stable-3_5_0`.

**Alternatives**:

- Trim at each caller (`OAIDAO::getSets()`, the feed plugin), as the
  citation plugin does: leaves the other callers, and every future one,
  with the space.
- `trim($prefix . ' ' . $title)`: shorter, but strips any space a title
  is entered with and departs from the pattern the publication title
  uses.

**What goes with it**:

- No repair of deleted records already stored with the space, since it
  shows only for a deleted series. One would be
  `UPDATE data_object_tombstones SET set_name = TRIM(LEADING ' ' FROM set_name)`.
- A unit test for `Section::getLocalizedTitle()` and `getTitle()` with
  and without a prefix, and a ListSets check of a series with no prefix
  in the e2e spec.

Small: two methods of one class, with a unit test.

## Evidence

- Kept script, run on an install freshly loaded from the default
  dataset:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-series-set-name-leading-space/walk.js)
  (steps 1–7; with `neighbour` as its argument it reads the screens next
  to the change). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-series-set-name-leading-space/walk.js [neighbour]`.
  It reads the raw answer, since Chromium hands back the page styled by
  the answer's XSL.
- Walked on `main` and `stable-3_5_0`, OMP only, on PostgreSQL, pkp/datasets
  38ab955 (2026-09-30).
- Tips: `main` omp `3b0ecf794`, lib/pkp `3dc90c81a6`; `stable-3_5_0`
  omp `3081c9b00`, lib/pkp `a9c76aed62`; `stable-3_4_0` omp `0aec65441`,
  lib/pkp `df13621c2d`; `stable-3_3_0` omp `8e72fc883`, lib/pkp
  `d446601ebe`.
- Code read on 3.4 and 3.3: `Section.php` (`classes/press/Series.inc.php`
  on 3.3) and `OAIDAO::getSets()`; the Web Feed plugin, the
  `pkp/webFeed` submodule on every branch, at the commit 3.4 pins
  (`d78688547b`), where `getIdentifiers()` and `atom.tpl` match `main`.
  On 3.3 the plugin is in the app and its templates print no category.
- The regression's before-side, read in the code at 965c4ab823's
  parent: `OAIDAO::getSets()` named series sets by
  `$series->getLocalizedTitle()`, and lib/pkp's `PKPSection` returned the
  title alone.
- The code path behind the `?? ''`: `classes/section/DAO.php`
  `getByPath()` line 71 and lib/pkp `EntityDAO::fromRow()`, read on
  `main`; `stable-3_5_0` calls `fromRow($row)`. The server log lines are
  from the walk of the first fix version on `main`.
- Unverified: no harvester or feed reader was checked for how it treats
  the leading space.
- MySQL not checked; the fault is in PHP, not in a query.
