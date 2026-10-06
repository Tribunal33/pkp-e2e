# "Endnote/Zotero/Mendeley (RIS)" citation download writes its dates with "%" signs ("PY  - %2026/%09/%30")

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; from 3.4.0-8)
  - 3.3: none (code; Smarty's own date modifier)
- **Introduced** made wrong by a `pkp/pkp-lib` commit for `pkp/pkp-lib#9303` (3.4: `pkp/pkp-lib#10352`) · [22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5) (3.4: [d6b045e](https://github.com/pkp/pkp-lib/commit/d6b045eb39e2a782bfc0150d8f1e8f4addabc879)) · 2024-09-06 · Alec Smecher (asmecher); carried into `main`'s Blade template by `pkp/citationStyleLanguage#155` for `pkp/pkp-lib#9968` · [19f6dc5](https://github.com/pkp/citationStyleLanguage/commit/19f6dc5ea6393cb885c8ddfe3fd85c570956408c) · 2025-09-02 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal, a preprint server and a press, the
"Endnote/Zotero/Mendeley (RIS)" file a reader downloads from the "How to
Cite" block writes its dates with a "%" before the year, the month and
the day. An article's and a preprint's file reads
"PY  - %2026/%09/%30" and "Y2  - %2026/%10/%01", and a book's
"PY  - %2026". The reader expects "2026/09/30" and "2026".

The file's publication date and access date are therefore not in the
form the RIS format asks for. The "BibTeX" download of the same page
carries the year correctly.

It needs the "Citation Style Language" plugin turned on. Every RIS
download is affected, whatever the item.

## Impact

- **Lost.** A well-formed date in the downloaded citation: the
  publication date, and on a journal or a preprint server the access
  date too. Nobody is told.
- **Who.** Every reader who downloads the RIS file, from any published
  article, preprint, book or chapter, on an install with the plugin on.
- **Way round.** The reader downloads "BibTeX" instead, or removes the
  "%" signs from the file. A manager cannot correct it in the settings.

Low: the file downloads with every other field right, and the date can
still be read in the wrong value. What a reference manager does with
such a date was not tried by importing the file; Zotero's import code
was read, and it keeps the value as text. It would be medium if a
reference manager refused the file or dropped the date.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main`: the OJS journal, the OPS server
  and the OMP press, each `publicknowledge`.
- The "Citation Style Language" plugin is off in the dataset. On each
  app, sign in as `rvaca`, open Settings › Website › "Plugins", tick
  "Citation Style Language" and sign out.

On the journal, signed out:

1. Open article 17, "Antimicrobial, heavy metal resistance and plasmid
   profile of coliforms isolated from nosocomial infections in a
   hospital in Isfahan, Iran":
   `/index.php/publicknowledge/article/view/17`.
2. Under "How to Cite", press "More Citation Formats", then, under
   "Download Citation", "Endnote/Zotero/Mendeley (RIS)".
3. Open the downloaded file,
   "Antimicrobial,+heavy+metal+resistance+and+plasmid+profile+of.ris",
   in a text editor.

On the preprint server, signed out:

4. Open preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence":
   `/index.php/publicknowledge/preprint/view/2`, and take steps 2 and 3.

On the press, signed out:

5. Open book 5, "Bomb Canada and Other Unkind Remarks in the American
   Media": `/index.php/publicknowledge/catalog/book/5`, and take steps 2
   and 3.

**Expected.** The publication date and the day of the download, as the
year, the month and the day set apart by "/". For the article and the
preprint, published on 30 September 2026 and downloaded on 1 October
2026:

```
PY  - 2026/09/30
Y2  - 2026/10/01
```

and for the book `PY  - 2026`.

**Observed.** After steps 3 and 4:

```
PY  - %2026/%09/%30
Y2  - %2026/%10/%01
```

After step 5:

```
PY  - %2026
```

Control: "BibTeX" on the same pages downloads a file with
`year={2026}` (and `month={Sept.}` for the article), and the citation
on the page reads "Karbasizaed, V. (2026). …".

## Cause

The plugin's RIS template gives a date pattern in the old `strftime()`
form, `%Y/%m/%d`, to code that reads patterns in PHP's `date()` form. In
that form "%" is not a pattern letter, so it is printed as it stands,
and "Y", "m" and "d" print the year, the month and the day after it.

**On 3.4 and 3.5** the template is
`plugins/generic/citationStyleLanguage/templates/citation-styles/ris.tpl`:

```smarty
PY  - {$citationData->issued->raw|date_format:"%Y/%m/%d"}
Y2  - {$citationData->accessed->raw|date_format:"%Y/%m/%d"}
…
PY  - {$citationData->issued->raw|date_format:"%Y"}
```

Smarty's own `date_format` modifier sent a pattern holding "%" to
`strftime()` and any other to `date()`, so the template was right.
[22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5)
(for `pkp/pkp-lib#9303`, so that dates follow the reader's language)
registered `PKPTemplateManager::smartyDateFormat()` in its place:

```php
return (new \Carbon\Carbon($string))->locale(Locale::getLocale())->translatedFormat($format);
```

`translatedFormat()` takes `date()` patterns only. The templates still
passing a `strftime()` pattern were not changed with it.

**On `main`** `pkp/citationStyleLanguage#155`
([19f6dc5](https://github.com/pkp/citationStyleLanguage/commit/19f6dc5ea6393cb885c8ddfe3fd85c570956408c),
for `pkp/pkp-lib#9968`) rewrote the template as `ris.blade` and carried
the patterns over into a direct Carbon call, which reads them the same
way:

```blade
PY  - {{ \Carbon\Carbon::parse($citationData->issued->raw)->format('%Y/%m/%d') }}
```

Reach:

- The three date lines of the RIS template: "PY" and "Y2" of a journal
  article and a preprint, "PY" of a book and of a chapter (walked for
  the article, the preprint and the book; the chapter uses the book's
  line, by the code). The plugin has no other date pattern; "BibTeX" and
  the on-screen formats get their dates from the CSL library.
- The same mistake, a `strftime()` pattern handed to Carbon, is in other
  templates on `main`, all of them in plugins only OJS ships. Each is a
  finding of its own and not covered here:
  - MARC field 008 of the `oai_marc` and `marcxml` OAI-PMH records
    (`date_format:"%y%m%d %Y"`; spec U19 A15, seen on screen);
  - the announcement feed's Atom and RSS 1.0 dates
    (`date_format:"%Y-%m-%dT%T%z"` and
    `$announcement->datePosted->format("%Y-%m-%d")`; spec U12 A15, seen
    on screen);
  - the COUNTER report's `Created` attribute in
    `plugins/reports/counter/templates/reportxml.tpl` and `sushixml.tpl`
    (in the code; not driven).

## Proposed fix

Write the three patterns in the template in `date()` form. A proposal,
tried on `main`; the team decides.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ris-download-dates-percent-signs/fix.diff)
(against the app root, the same for the three apps):

```diff
 @if($citationData->issued)
-PY  - {{ \Carbon\Carbon::parse($citationData->issued->raw)->format('%Y/%m/%d') }}
+PY  - {{ \Carbon\Carbon::parse($citationData->issued->raw)->format('Y/m/d') }}
 @endif
 @if($citationData->accessed)
-Y2  - {{ \Carbon\Carbon::parse($citationData->accessed->raw)->format('%Y/%m/%d') }}
+Y2  - {{ \Carbon\Carbon::parse($citationData->accessed->raw)->format('Y/m/d') }}
 @endif
…
 @if($citationData->issued)
-PY  - {{ \Carbon\Carbon::parse($citationData->issued->raw)->format('%Y') }}
+PY  - {{ \Carbon\Carbon::parse($citationData->issued->raw)->format('Y') }}
 @endif
```

Tried on OJS, OMP and OPS `main`: the files read "PY  - 2026/09/30" and
"Y2  - 2026/10/01" for the article and the preprint and "PY  - 2026" for
the book. Every other line of the RIS file, the file's name, the
"BibTeX" file and the citation on the page were the same as without the
fix.

The template owns the pattern on `main`, where it calls Carbon itself,
so no shared layer can correct it there. On 3.5 and 3.4 the template
goes through the `date_format` modifier, and `date()` patterns are what
the other templates give that modifier (`date_format:"Y-m-d"` in the web
feed plugin's `rss.tpl`).

The change keeps what `pkp/pkp-lib#9303` and the Blade rewrite were for.
The dates are numbers, so the reader's language does not change them.

The fix lands in the `pkp/citationStyleLanguage` plugin, which the apps
hold as a submodule: one pull request per plugin branch (`main`, and
`stable-3_5_0` and `stable-3_4_0` if backported), then the usual
submodule bump in OJS, OMP and OPS.

**Alternatives**

- Make `PKPTemplateManager::smartyDateFormat()` translate a `strftime()`
  pattern first, since the Smarty modifier it replaced accepted one.
  `PKPString::convertStrftimeFormat()` does this for the configured date
  formats. Not tried. By its conversion table
  (`PKPString::getStrftimeConversion()`):
  - it would correct the RIS file on 3.5 and 3.4 and MARC field 008,
    whose patterns (`%Y`, `%m`, `%d`, `%y`) all convert;
  - it would not correct the Atom pattern, because the table has no
    `%T` or `%z` and those would still print "%";
  - it would not correct the COUNTER pattern, because the converted
    pattern keeps the literal "T" and "Z", which `date()` reads as
    pattern letters;
  - it does not reach `main`'s `ris.blade` or the announcement feed's
    direct `format()` calls, and `convertStrftimeFormat()` throws when
    `deprecation_warnings` is on.

**What goes with it**

- No stored data changes; the file is written on each download.
- 3.5 and 3.4: the same three patterns in `ris.tpl`
  (`date_format:"Y/m/d"`, `date_format:"Y"`). Not tried there.
- Guard: an e2e scenario in this repository's spec, U13 Rule 15b (the
  RIS file's "PY" and "Y2" lines hold the dates as digits and "/"), or a
  plugin test that renders the RIS template and fails on a "%" in a date
  line.

Small: three patterns in one template of one plugin repository,
following the form the other templates use, tried on the three apps. The
submodule bumps are the apps' routine and a backport is not counted.

## Evidence

- Kept script that takes the Steps on OJS, OPS and OMP, on installs
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/ris-download-dates-percent-signs/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ris-download-dates-percent-signs/walk.js),
  run with `PROBE_FEATURE=issues-ir24 PROBE_AGENT=ir24 node bin/probe.js all shared/playwright/checks/issues/ris-download-dates-percent-signs/walk.js`.
  It records the RIS file's name, its date lines and its other lines,
  the "BibTeX" file and the citation the page shows first.
- Walked on `main` (OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7; the
  plugin at 9dd6eba) and on `stable-3_5_0` (OJS 92b9a16b48, OMP
  3081c9b00, OPS cf4fce69bd; the plugin at 41ddd1b, pkp-lib a9c76aed62),
  where the date lines read the same as on `main`. No request answered
  an error and no page script failed. The walks ran on PostgreSQL; the
  fault does not depend on the database.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/ris-download-dates-percent-signs/fix.diff ojs omp ops`,
  then the script as above, compared with the run without the fix; then
  reverted.
- Code reads on `main`: `templates/citation-styles/ris.blade`,
  `getCitation()`, `getCitationDownloads()` and `downloadCitation()` in
  `CitationStyleLanguagePlugin.php`; `smartyDateFormat()` and its
  registration in `lib/pkp/classes/template/PKPTemplateManager.php`;
  `ViewHelper::dateFormat()`; `PKPString::convertStrftimeFormat()` and
  `getStrftimeConversion()`; Smarty's `modifier.date_format.php`. The
  instances under Reach come from a search of the three apps' templates
  for `date_format:"…%…"` and for `format()` given a "%" pattern; OMP
  and OPS have none outside this plugin.
- 3.5 (code, beside the walk): `ris.tpl` and `smartyDateFormat()` as the
  Cause quotes them.
- 3.4 (code), not walked:
  - pkp-lib `stable-3_4_0` (df13621c2d) has `smartyDateFormat()` from
    d6b045e, whose first tag is `3_4_0-8`;
  - the apps' `stable-3_4_0` branches (OJS 9571d8fde7, OMP 0aec65441,
    OPS acd8ae704b) pin the plugin at 8f54149, whose `ris.tpl` has the
    three patterns.
- 3.3 (code): pkp-lib `stable-3_3_0` (d446601ebe) registers no
  `date_format` modifier, so Smarty's own sends the "%" pattern to
  `strftime()`. Only OJS (9fdb9bcf9a) ships the plugin there (648ae36).
  Not walked.
- The trace:
  - `git blame` on the `ris.blade` date lines gives 19f6dc5. The
    `ris.tpl` it replaced already had the three patterns, and has them
    on `stable-3_3_0`.
  - `git log -S` on `smartyDateFormat` in pkp-lib gives 22c0390 on
    `main` and d6b045e on `stable-3_4_0`. `stable-3_5_0` holds 22c0390
    from its start. No pull request was found for 22c0390.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs and
  pkp/citationStyleLanguage for the RIS download and its date, "date_format
  strftime" and `smartyDateFormat`. No issue or pull request covers the
  "%" in the output. `pkp/pkp-lib#8768` ("Drop the remaining usage of
  strftime()", closed for 3.4) asked for the "%" patterns to be removed
  from the Smarty templates; `pkp/pkp-lib#10966` is a different fault in
  `smartyDateFormat()` (a missing format).
- Unverified:
  - No reference manager imported the file. Zotero's RIS import
    translator (`dateRIStoZotero()` in zotero/translators, read on
    2026-10-01) does not match "%2026/%09/%30" as a date and returns the
    text as written. EndNote and Mendeley were not looked at.
  - A chapter's RIS download, and the 3.5 and 3.4 form of the fix, were
    not driven.
