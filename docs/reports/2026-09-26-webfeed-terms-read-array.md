# Every keyword, subject and discipline reads "Array" in a journal's, press's or preprint server's web feeds

Model: claude-opus-5-5.

Regression. OJS at `d9b567efec`, OMP at `187f0f40d`, OPS at `61cd158ce3`
(lib/pkp `76a315591b`; the Web Feed plugin at `7436935`); introduced by
pkp/pkp-lib#10833 (`90918476a2`, 2025-02-13), which the Web Feed plugin
was not adapted to. stable-3_5_0: shows it too (by code) at ojs
`a3dc3b54ff`, omp `f77b23709`, ops `225e25475e` (lib/pkp `479b38a09c`, the
plugin at `cd16aa3`). Tracked in spec U18 register A7. Temporary: delete
once acted on.

## Summary

Since February 2025, the Atom, RSS 2.0 and RSS 1.0 feeds print the word
"Array" for every keyword, subject and discipline of every article, book
or preprint, in place of the term itself. With "Include identifiers
(ISBN, keywords, categories, etc.) in the feed summary?" ticked, each
item's summary also reads "Keywords: Array, Array", "Subjects: Array",
"Disciplines: Array". The item's own page shows the terms correctly.

## Impact

Every reader of every feed meets it, on every item that has keywords,
subjects or disciplines, in every interface language: the terms are the
feed's subject categories, which feed readers show and filter by. A reader
who filters a feed by topic finds every term to be "Array". A journal that
ticks "Include identifiers…" to show the terms in the summary gets
"Keywords: Array, Array" at the top of every item instead. Nothing is lost:
the terms are stored and shown on the item's page. There is no workaround
on screen: unticking "Include identifiers…" removes the summary lines, but
the "Array" categories stay. Major: the feed's topic information is wrong
for every item of every journal that records terms, silently, since
February 2025.

## Steps to reproduce

Preconditions:

- A fresh OJS, OMP or OPS install with its default languages.
- A journal (press, preprint server) "Tide Notes" with "Keywords",
  "Subjects" and "Disciplines" turned on (Settings › Workflow ›
  "Submission" › "Metadata"), and a Journal Manager on it.
- One article "Tidal Patterns", published, with the abstract "Tides
  follow the moon.", the keywords "tides" and "moon", the subject
  "Oceanography" and the discipline "Marine science", typed on its
  "Metadata" page.

1. Signed out, open the article's page (on a press, from "Catalog").
   It reads "Keywords: moon, tides".
2. Open the Atom feed,
   `http://{host}/index.php/{journal}/gateway/plugin/WebFeedGatewayPlugin/atom`.
3. Sign in as the Journal Manager and open Settings › Website ›
   "Plugins". Expand "Web Feed Plugin" and press "Settings".
4. Tick "Include identifiers (ISBN, keywords, categories, etc.) in the
   feed summary?" and press "OK". "Your changes have been saved." shows.
5. Sign out and open the Atom feed again. Then open the RSS 2.0 feed
   (`…/WebFeedGatewayPlugin/rss2`) and the RSS 1.0 feed
   (`…/WebFeedGatewayPlugin/rss`, which the browser downloads as
   `rss.rdf`).

**Expected:** the item's subject categories name "tides", "moon",
"Oceanography" and "Marine science" (step 2), and after step 4 its summary
opens "Keywords: tides, moon", "Subjects: Oceanography", "Disciplines:
Marine science" (step 5).

**Observed:** in step 2 the entry carries, besides the section:

```xml
<category term="Array" label="Keywords" scheme="https://pkp.sfu.ca/ojs/category/keywords"/>
<category term="Array" label="Keywords" scheme="https://pkp.sfu.ca/ojs/category/keywords"/>
<category term="Array" label="Subjects" scheme="https://pkp.sfu.ca/ojs/category/subjects"/>
<category term="Array" label="Disciplines" scheme="https://pkp.sfu.ca/ojs/category/disciplines"/>
```

In step 5 the summary of all three feeds reads (a journal; a preprint
server opens "Section: Preprints", a press has no section line):

```
Section: Articles<br /> Keywords: Array, Array<br /> Subjects: Array<br /> Disciplines: Array<br /> <br /> <p>Tides follow the moon.</p>
```

RSS 2.0 has `<category domain="…/keywords">Array</category>` and RSS 1.0
`<rdf:value>Array</rdf:value>` under each `dc:subject`, one per term. The
server logs nothing. Control: the section ("Articles", "Preprints") and the
categories read correctly in the same places, and the article's page
lists the keywords by name.

## Cause

`WebFeedGatewayPlugin::getIdentifiers()` (lines 170–173):

```php
foreach (['keywords' => 'common.keywords', 'subjects' => 'common.subjects', 'disciplines' => 'search.discipline'] as $field => $label) {
    $values = $publication->getLocalizedData($field) ?? [];
    if (count($values)) {
        $identifiers[] = ['type' => $field, 'label' => __($label), 'values' => $values];
```

The templates print each value with `{$value|strip|escape:"html"}` and the
summary with `{', '|implode:$identifier.values}`. Since pkp-lib
`90918476a2` ("Controlled vocabulary support", #10833) the publication's
`keywords`, `subjects` and `disciplines` are lists of vocabulary entries,
each an array such as `['name' => 'tides']` with optional `identifier` and
`source` (`schemas/publication.json`: `items` of type `object`). The plugin
still treats them as words, and PHP converts each array to the string
"Array". The app's own templates were adapted (`article_details.tpl`
prints `$keyword.name`); the plugin's `getIdentifiers()` was not. The
section and categories are read as titles and are unaffected.

## Proposed fix

A proposal; the team decides.

1. Map the entries to their names in `getIdentifiers()`:
   `$values = array_column($publication->getLocalizedData($field) ?? [], 'name');`.
   One line in the plugin; all three templates and all three feeds are
   then right. It drops the entry's `identifier` and `source`.
2. Or pass the entries through and print `$value.name` in the three
   templates, which leaves room to print the `identifier` as a term's
   scheme later. Four places to change instead of one.
3. Either way, apply it to `stable-3_5_0`, which carries the same plugin
   code and the same vocabulary change.

## Evidence

- Re-drive for this report, 2026-09-26, on the main fleet's probe servers
  (8050/8150/8250), kept script
  `shared/playwright/checks/U18/reports/rep.js`
  (`PROBE_FEATURE=U18 PROBE_AGENT=rep node bin/probe.js <ojs|omp|ops> shared/playwright/checks/U18/reports/rep.js`,
  phases `seed,a7`, and `a7page` on OMP). Scratch contexts "Tide Notes …":
  OJS `u18reprepg67rtak`, OMP `u18reprepbvp0ouk`, OPS `u18reprep5w0n58k`.
  On OJS and OPS the terms were seeded through the submission builder,
  which types them on the "Metadata" page; on OMP the builder refuses
  `keywords` for a press, so the script typed them on the book's
  "Metadata" page as the Press Manager (`seed-omp-metadata-saved-omp`,
  save 200). Snapshots in `.reports/U18/rep/`:
  - `a7-01-item-page-*` (+ `.png`): "Keywords: moon, tides" on the
    article, book and preprint pages.
  - `a7-02-atom-before-*`: `Keywords=Array` twice, `Subjects=Array`,
    `Disciplines=Array`.
  - `a7-03-include-identifiers-{filled,after-ok}-*` (+ `.png`): the
    window, the ticked box, "Your changes have been saved.".
  - `a7-04-atom-after-*`, `a7-05-rss2-after-*`, `a7-06-rss-after-*`: the
    summaries and terms quoted above; the full documents are in each
    file's `feed.body` / `body`.
- Claim check chunk K1 (`.reports/U18/cc-K1.md`, K1-6), 2026-09-25:
  `.reports/U18/ccK1/i-10-items-*`, `d-02-identifiers-on-*`,
  `r-03-fr-atom-from-box-*` (French: "Mots-clés: Array"), and on OMP the
  terms typed on screen, `i-05-omp-metadata-saved-omp` then
  `i-10-items-omp`. Also footnotes g and f-a7 of
  `docs/specs/U18-web-feeds.md`.
- The introducing change: pkp-lib `90918476a2` (jyhein, 2025-02-13),
  pkp/pkp-lib#10833 "pkp/pkp-lib#1550 Controlled vocabulary support",
  merged 2025-02-13; it changes `schemas/publication.json` so that the
  three term lists hold objects with a `name`. `git blame` on the
  plugin's `getIdentifiers()` gives the term loop to `e2bb67cd` (the
  plugin's initial commit, 2023-03-14); no later plugin commit touches it.
- stable-3_5_0, by code only: `checkouts/stable-3_5_0/<app>/lib/pkp` at
  `479b38a09c` contains `90918476a2`, its `article_details.tpl` prints
  `$keyword.name`, and the plugin at `cd16aa3` has the same
  `getIdentifiers()`. Not driven.
- The before side was not driven; it rests on the schema change.
