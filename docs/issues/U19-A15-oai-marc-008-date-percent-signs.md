# A journal's MARC records in OAI-PMH write the publication date in field 008 with "%" signs ("%26%09%30 %2026")

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; the date pattern is read the old way there)
- **Introduced** a `pkp/pkp-lib` commit for `pkp/pkp-lib#9303` (3.4:
  `pkp/pkp-lib#10352`) ·
  [22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5)
  (3.4:
  [d6b045e](https://github.com/pkp/pkp-lib/commit/d6b045eb39e2a782bfc0150d8f1e8f4addabc879))
  · 2024-09-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a15)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester reading MARC field 008 of a journal's article expects the
article's publication date as six digits, then the publication year,
such as "260930 2026" for 30 September 2026. Every `oai_marc` and
`marcxml` record carries "%26%09%30 %2026" in its place. On a server
whose time zone is east of UTC the day is also the one before:
"%26%09%29 %2026".

Field 008 is read by position, and the four "%" signs move everything
after them. Software that takes the field by position gets, without any
error, "%26%09" as the date, "30 %" as the year and blanks as the
language code.

The same record in Dublin Core carries the date correctly.

## Impact

- **Lost.** The publication date, the publication year and the language
  code of field 008: at their positions the field holds other
  characters. The record is still well-formed, so nothing is refused
  and nobody is told.
- **Who.** Any harvester that takes a journal's articles in a MARC
  format and reads field 008, from every journal and every article.
- **Way round.** The harvester takes "oai_dc", whose "Date" is right, or
  reads the language from field 546 of the same record. The journal has
  no setting that changes the field.

Medium: a secondary output is wrong in one field, for every record and
silently, and the other format gives a way round. It is not higher
because the rest of the record is right; which catalogues read field
008 of harvested records was not looked at.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: the journal `publicknowledge`.
  Nothing is created. Article 17, "Antimicrobial, heavy metal resistance
  and plasmid profile of coliforms isolated from nosocomial infections
  in a hospital in Isfahan, Iran", is published on the day the dataset
  was built (2026-09-30 in the walk).
- The dataset's `config.inc.php` has `time_zone = UTC`.

Signed out:

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=marcxml`
   and copy the identifier that ends in "article/17"
   ("oai:ojs2.localhost:article/17" in the walk; its middle part is the
   install's `repository_id`).
2. Open
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=marcxml&identifier=<that identifier>`.
3. Under "Unknown Metadata Format", read the line
   `<controlfield tag="008">`.
4. Open the same address with `metadataPrefix=oai_marc` and read the
   line `<fixfield id="008">`.

**Expected.** The article's publication date as year, month and day in
two digits each, a space and the year in four, then the language code:

```
"260930 2026                        eng  "
```

**Observed.** After steps 3 and 4, in both formats:

```
"%26%09%30 %2026                        eng  "
```

With `time_zone = "Europe/Prague"` in `config.inc.php`, the same steps
show the day before:

```
"%26%09%29 %2026                        eng  "
```

Control: the address of step 2 with `metadataPrefix=oai_dc` shows "Date"
as "2026-09-30", in both time zones.

## Cause

The line is line 14 of
`plugins/oaiMetadataFormats/marc/templates/record.tpl` and line 16 of
`plugins/oaiMetadataFormats/marcxml/templates/record.tpl`:

```smarty
<fixfield id="008">"{$publication->getData('datePublished')|strtotime|date_format:"%y%m%d %Y"}                        eng  "</fixfield>
```

It was written for Smarty's own `date_format` modifier, which sent a
pattern holding "%" to `strftime()` and printed a timestamp in the
server's time zone. Until
[22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5)
the line printed the right value. That commit (for `pkp/pkp-lib#9303`,
so that dates follow the reader's language) registered
`PKPTemplateManager::smartyDateFormat()` in the modifier's place:

```php
return (new \Carbon\Carbon($string))->locale(Locale::getLocale())->translatedFormat($format);
```

This changed two things for the line, and the templates were not
changed with it:

- `translatedFormat()` takes patterns in PHP's `date()` form only. There
  "%" is not a pattern letter, so it is printed as it stands, and "y",
  "m", "d" and "Y" print the date after it.
- `|strtotime` hands the modifier an integer, made from midnight in the
  server's time zone. Carbon 3 reads a bare integer as a UTC timestamp
  and prints it in UTC, so east of UTC the day is the one before.

The field is 40 characters read by position. With the four "%" signs it
is 44. Counting from the first character after the opening quotation
mark of the walked value: positions 00 to 05, the date, hold "%26%09";
07 to 10, the publication year, hold "30 %"; 35 to 37, the language,
hold spaces, and "eng" sits at 39 to 41.

Reach:

- Field 008 of every article record in both MARC formats, in
  `ListRecords` and `GetRecord` (walked for articles 17 and 1). The
  templates have no other date pattern: the issue's date in field 260
  is printed as stored.
- A press and a preprint server have no MARC formats.
- Releases: the commit is dated 2024-09-06 on `main` and on
  `stable-3_4_0`, so every 3.5 release and the 3.4 releases made after
  that day (not checked release by release).
- The same pattern mistake in other templates is reported or tracked
  apart: the "Endnote/Zotero/Mendeley (RIS)" citation download
  ([U13-A8-ris-download-dates-percent-signs.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-A8-ris-download-dates-percent-signs.md),
  another plugin and another fix), the announcement feed's Atom date
  (spec U12 A15) and the COUNTER report's `Created` attribute
  (`plugins/reports/counter/templates/reportxml.tpl` and `sushixml.tpl`,
  in the code; not driven).
- Not covered here: the `marcxml` template writes the field between
  quotation marks, which only the `oai_marc` schema asks for, so its
  field stays two characters over 40 with this fix. That is named in
  [U19-A12-oai-marc-records-not-valid-for-their-schemas.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A12-oai-marc-records-not-valid-for-their-schemas.md).

## Proposed fix

In both templates, write the pattern in `date()` form and give the
modifier the date itself, without `|strtotime`. A proposal, tried on
`main`; the team decides.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-008-date-percent-signs/fix.diff)
(against the OJS root):

```diff
--- a/plugins/oaiMetadataFormats/marc/templates/record.tpl
-		<fixfield id="008">"{$publication->getData('datePublished')|strtotime|date_format:"%y%m%d %Y"}                        eng  "</fixfield>
+		<fixfield id="008">"{$publication->getData('datePublished')|date_format:"ymd Y"}                        eng  "</fixfield>
--- a/plugins/oaiMetadataFormats/marcxml/templates/record.tpl
-		<controlfield tag="008">"{$publication->getData('datePublished')|strtotime|date_format:"%y%m%d %Y"}                        eng  "</controlfield>
+		<controlfield tag="008">"{$publication->getData('datePublished')|date_format:"ymd Y"}                        eng  "</controlfield>
```

Tried on OJS `main` with `time_zone` UTC and Europe/Prague: field 008 of
articles 17 and 1 reads `"260930 2026                        eng  "` in
both formats and both time zones. Every other field of the four records,
the issue date in field 260 included, was the same as without the fix.

Carbon reads the date string in the server's time zone and prints it in
the same, so the day cannot move. This is how the other templates call
the modifier: the web feed plugin's `atom.tpl` has
`{$publication->getData('datePublished')|date_format:"Y-m-d\TH:i:sP"}`.
The change keeps what `pkp/pkp-lib#9303` was for: the value is digits,
so the reader's language does not change it.

**Alternatives**

- Change only the pattern and keep `|strtotime`. The first version of
  this fix did so: it is right on a server at or west of UTC and prints
  the day before east of it (run on its own with the checkout's Carbon
  3.11.4: "260929 2026" in Europe/Prague).
- Make `PKPTemplateManager::smartyDateFormat()` translate a `strftime()`
  pattern first, as `PKPString::convertStrftimeFormat()` does for the
  configured date formats. It would remove the "%" signs here and in the
  RIS download on 3.5 and 3.4, but not the day before east of UTC. It
  would not correct the Atom pattern (the table has no `%T` or `%z`) or
  the COUNTER one (its literal "T" and "Z" are pattern letters to
  `date()`), and that method throws when `deprecation_warnings` is on.
  Not tried.

**What goes with it**

- No stored data changes; a record is written on each request. A
  harvester that already took the records gets the change only when it
  harvests the articles again, since their datestamps do not move.
- 3.5: the same two lines (Carbon 3.11.4 there too). Not tried there.
- 3.4: the same change on `$article->getDatePublished()`:
  `{$article->getDatePublished()|date_format:"ymd Y"}`. 3.4 carries
  Carbon 2.72.5, where the reading of a bare integer was not tested;
  without `|strtotime` the question does not arise. Not tried there.
- Guard: an e2e scenario in this repository's spec (U19 Rule 12: field
  008 opens with the publication date as six digits, a space and the
  year), or a plugin test that renders both templates under a time zone
  east of UTC.

Small: one line in each of two templates of one plugin directory, in
the form the other templates use, with no data repair.

## Evidence

- Kept script that takes the Steps on OJS, signed out, on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 2c84c3c,
  2026-10-01, the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade
  needed):
  [`shared/playwright/checks/issues/oai-marc-008-date-percent-signs/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-008-date-percent-signs/walk.js),
  run with `PROBE_FEATURE=issues-a12 PROBE_AGENT=a12 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-008-date-percent-signs/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; "a12" is the run's
  label). It takes the identifier from `ListIdentifiers`, opens each
  address in the browser, reads the field on the page and in the raw
  XML, and reads the "oai_dc" date as the control. Its helpers are in
  [`../oai-marc-records-not-valid-for-their-schemas/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/lib.js).
- The Europe/Prague walks: the same command with `Europe/Prague` as the
  script's argument. The install's own config is not edited; the script
  starts a second server for the same code and database with a copy of
  that config differing only in `time_zone` (and its own port). Walked
  on `main` only, with the fix out and in.
- The page shows runs of spaces as one, so on the page the field reads
  `"%26%09%30 %2026 eng "`; the value in Observed is the one sent (the
  page's source).
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-marc-008-date-percent-signs/fix.diff ojs`,
  then `walk.js` as above on UTC and on Europe/Prague. Besides the
  Steps the script reads article 1 in both formats, field 260, and
  every field other than 008 of the four records; those were the same
  with the fix in and out, in each time zone. Reverted with
  `node bin/try-fix.js revert` and the same arguments.
- The pattern on its own, with the checkout's Carbon 3.11.4 and the
  date 2026-09-30: through `strtotime()` "ymd Y" gives "260930 2026" in
  UTC and America/Vancouver and "260929 2026" in Europe/Prague; on the
  date string it gives "260930 2026" in all three.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc); 3.5 at OJS
  18d097d94e (lib/pkp 1fb843f491), on UTC, where the field read the
  same as on main in both formats. The walks ran on PostgreSQL.
- Code read on main: the two templates, lib/pkp
  `classes/template/PKPTemplateManager.php` (`smartyDateFormat()` and
  its registration as `date_format`), `PKPString::getStrftimeConversion()`,
  and a search of the three apps' and pkp-lib's templates for
  `date_format:"…%…"` (the two MARC templates, the two COUNTER
  templates and the announcement feed's `atom.tpl`, all in OJS). 3.5:
  the same template lines and the same `smartyDateFormat()`.
- 3.4 and 3.3 by code: OJS `upstream/stable-3_4_0` (9571d8fde7), both
  templates' 008 line with the same pattern, and lib/pkp
  `origin/stable-3_4_0` (df13621c2d), where `smartyDateFormat()` is the
  same Carbon call (d6b045e). OJS `upstream/stable-3_3_0` (9fdb9bcf9a)
  has the same template lines, and lib/pkp `origin/stable-3_3_0`
  (d446601ebe) registers no `date_format` modifier in
  `PKPTemplateManager.inc.php`, so Smarty's own reads the pattern with
  `strftime()`.
- Introduced: `git log -S smartyDateFormat` in pkp-lib gives 22c0390 on
  `main` (also on `stable-3_5_0`) and d6b045e on `stable-3_4_0`. The
  template lines carry the pattern since the commit that created them
  (OJS 824cda1a29, 2015).
- Tracker search, 2026-10-01, pkp/pkp-lib and pkp/ojs, issues and PRs:
  "marc 008", "marcxml", "oai_marc", "date_format strftime percent"
  (the whole pkp organisation). Nothing about this field.
- Not driven: the site-wide address; 3.5 east of UTC. Unverified: which
  catalogues read field 008 of harvested records, and Carbon 2.72.5's
  reading of an integer on 3.4.
