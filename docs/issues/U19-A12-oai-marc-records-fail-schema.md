# A journal's OAI-PMH MARC records do not validate against the schemas they name

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced as one change: spread over five changes, listed in Evidence; present since at least [824cda1a29](https://github.com/pkp/ojs/commit/824cda1a2932760f4dbe14250e685eab83c74f9e) (2015-01-29)
- **Upstream** `pkp/ojs#4349` (open pull request, 2024), covering only field 773 in `marcxml`
- **Tracked in** spec U19 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

OJS offers two MARC formats over OAI-PMH, `marcxml` and `oai_marc`. Both
are always on, with no setting. The records do not validate against the
schemas they name, because several fields are written with the wrong
markup. A MARC reader either refuses them or reads them with a field
missing: on `main`, the pymarc library refuses every `marcxml` record,
and on 3.5 it reads each one without the issue's publication date.

Which records fail:

- `marcxml`: every article's record, in every journal.
- `oai_marc`: all records of a journal with an ISSN, and the record of
  any article whose contributor has an affiliation. A journal
  with neither ISSN nor affiliations gets valid `oai_marc` records.

The part that makes pymarc refuse the whole record is new on `main` and
not yet released.

## Impact

- **Lost**: usable records. A harvester that validates drops the
  records described above, with no message to the journal. A reader
  that does not validate still refuses every `main` `marcxml` record
  (pymarc) or drops the issue's publication date on the release lines
  before `main`.
- **Who**: harvesters that ask a journal for `marcxml` or `oai_marc`
  instead of the default Dublin Core (`oai_dc`), which is not affected.
- **Way round**: none for the journal. A harvester can switch to
  `oai_dc`. Nothing stored needs repair, but records already harvested
  stay as they are until the harvester fetches them all again.

Medium: the `marcxml` records fail their schema silently in every
journal, and pymarc refuses each one on `main` and drops the issue date
on 3.5. It would be high if a named harvester or catalogue were shown to
drop OJS records.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`: journal `publicknowledge`
  ("Journal of Public Knowledge") with its online and print ISSN
  (0378-5955), DOIs allowed for articles but no "DOI Prefix" set, and the
  OAI interface on, as by default. Published in Vol. 1 No. 2 (2014):
  article 17 "Antimicrobial, heavy metal resistance and plasmid profile
  of coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran" (one contributor, with an affiliation) and article 1
  "Signalling Theory Dividends" (three contributors, the first with an
  affiliation).
- The two schemas the records name, and a validator such as `xmllint`:
  `MARC21slim.xsd` (https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd)
  and `oai_marc.xsd` (http://www.openarchives.org/OAI/1.1/oai_marc.xsd).
- The dataset has no DOI on any article, so steps 1–4 give article 17 one
  (field 024 is written only for an article with a DOI).

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "DOIs" › "Setup", type "10.1234" in
   "DOI Prefix" and press "Save".
3. Open "DOIs" in the left menu. In the "Articles" list, tick article 17's
   row.
4. Choose "Bulk Actions" › "Assign DOIs", then press "Assign DOIs" in the
   window. The notice reads "Items successfully assigned new DOIs".
5. Sign out. Open
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=marcxml&identifier=oai:ojs2.localhost:article/17`,
   save the answer and cut out its `<record xmlns="http://www.loc.gov/MARC21/slim">`
   element as `record.xml`. Validate it:
   `xmllint --noout --schema MARC21slim.xsd record.xml`.
6. The validator stops checking at the misspelled `dataField` element
   (below). In a copy of `record.xml`, replace `dataField` with
   `datafield` (the opening and closing tags) and validate the copy the
   same way.
7. Open the address of step 5 with `metadataPrefix=oai_marc`, cut out the
   `<oai_marc>` element and validate it against `oai_marc.xsd`.
8. Repeat steps 5–7 for article 1 (`…identifier=oai:ojs2.localhost:article/1`).

**Expected.** Each of the four records validates (`record.xml validates`).

**Observed.** None validates. Article 17 in `marcxml`, step 5 (article 1
the same without the 024 line):

```
record.xml:8:  datafield (022), attribute 'ind1': The value '#' is not accepted by the pattern '[\da-z ]{1}'.
record.xml:8:  datafield (022), attribute 'ind2': The value '#' is not accepted by the pattern '[\da-z ]{1}'.
record.xml:11: (the same for the second 022)
record.xml:14: datafield (024), attribute 'ind2': The value '#' is not accepted by the pattern '[\da-z ]{1}'.
record.xml:39: Element '{http://www.loc.gov/MARC21/slim}dataField': This element is not expected. Expected is ( {http://www.loc.gov/MARC21/slim}datafield ).
```

Step 6, the copy with `dataField` corrected: the same 022 and 024
messages, then field 773:

```
record.xml:51: datafield, attribute 'id': '773' is not a valid value of the atomic type '{http://www.loc.gov/MARC21/slim}idDataType'.
record.xml:51: datafield: The attribute 'i1' is not allowed. / The attribute 'i2' is not allowed.
record.xml:51: datafield: The attribute 'tag' is required but missing. (and 'ind1', 'ind2')
record.xml:52: subfield: The attribute 'label' is not allowed. / The attribute 'code' is required but missing.
record.xml:53: (the same for the second subfield)
```

The record's lines behind these messages:

```xml
<datafield tag="022" ind1="#" ind2="#">
<datafield tag="024" ind1="7" ind2="#">
<dataField tag="260" ind1=" " ind2=" "><subfield code="c">2026-09-30 12:12:00</subfield></dataField>
<datafield id="773" i1="0" i2=" ">
  <subfield label="t">Journal of Public Knowledge;</subfield>
  <subfield label="g">Vol. 1 No. 2 (2014)</subfield>
```

Article 17 in `oai_marc`, step 7 (article 1 the same):

```
record.xml:6:  varfield (022), attribute 'i1': The value '#' is not accepted by the pattern '[0-9a-z\s]?'. (and 'i2')
record.xml:7:  subfield, attribute 'label': The value '$a' is not accepted by the pattern '[0-9a-z]'.
record.xml:9:  (the same for the second 022, lines 9 and 10)
record.xml:25: subfield, attribute 'code': The attribute 'code' is not allowed.
record.xml:25: subfield: The attribute 'label' is required but missing.
```

Line 25 is the contributor's affiliation,
`<subfield code="u">University of Tehran</subfield>`, inside a
`<varfield id="100">` whose other subfields are written `label="a"`.

## Cause

Two OJS templates write the records by hand. In several fields a
template uses the other MARC format's element and attribute names, or
writes "#" where the value is a space: the Library of Congress's MARC
documentation uses "#" as its notation for a blank indicator. No code
checks the output against a schema.

`plugins/oaiMetadataFormats/marcxml/templates/record.tpl` (MARC 21 XML,
`datafield tag ind1 ind2` with `subfield code`):

- Lines 19 and 24 (022, ISSN) write `ind1="#" ind2="#"`, and line 29
  (024, DOI) writes `ind2="#"`. The schema's indicator pattern
  `[\da-z ]{1}` allows a space and no "#".
- Lines 90 and 92 (260 $c, the issue's publication date) write
  `<dataField>`. The schema has no such element (XML names are
  case-sensitive), and the PHP that this template replaced in 2015
  wrote `datafield` there.
- Lines 109–112 (773, the journal and issue) write
  `<datafield id="773" i1="0" i2=" ">` with `<subfield label="t">` and
  `label="g"`, which is `oai_marc`'s naming. In MARC 21 XML, `id` is an
  XML ID (it may not start with a digit), `i1`, `i2` and `label` are not
  allowed, and `tag`, `ind1`, `ind2` and `code` are required.
  `pkp/ojs#5056` (2025) moved the journal and issue from 786 to 773 by
  copying `oai_marc`'s 773 (`pkp/ojs#4350`) as it stood. The earlier
  releases write the valid `<datafield tag="786">`.

`plugins/oaiMetadataFormats/marc/templates/record.tpl` (`oai_marc`,
`varfield id i1 i2` with `subfield label`):

- Lines 17 and 22 (022) write `i1="#" i2="#"`. The schema's indicator
  pattern is `[0-9a-z\s]?`. Lines 18 and 23 write `label="$a"`, and the
  schema's pattern is `[0-9a-z]` ("the leading $ is not used"). Both
  date from 2015. `pkp/pkp-lib#3062` (2017) renamed this template's
  `tag`/`ind1`/`ind2` to `id`/`i1`/`i2` but kept both values.
- Lines 55 and 56 write the affiliation subfield in 100 or 720 (the ROR
  and the name branch of one `{if}`) as `<subfield code="u">`.
  `pkp/ojs#4639` (2025, multiple affiliations) wrote the `marcxml`
  naming in both templates. Before it, this template wrote `label="u"`.

Reach:

- GetRecord and ListRecords render the same template (checked on
  screen: ListRecords in both formats lists the two published articles).
- Which fields fail, and when:
  - `marcxml` 773 is written for every article (`main`).
  - `marcxml` 260 $c: on `main` for an article in an issue; on 3.5, 3.4
    and 3.3 for every article, without an `{if $issue}`.
  - 022 in both formats whenever the journal has an ISSN; `marcxml` 024
    whenever the article has a DOI.
  - The `oai_marc` affiliation subfield whenever a contributor has an
    affiliation (`main` and 3.5; 3.4 and 3.3 write `label="u"`).
  So every `marcxml` record fails on every release line: through 773 on
  `main`, through 260 $c on the others.
- OMP and OPS ship no MARC format: their `plugins/oaiMetadataFormats`
  holds only `dc` (checked in the code). The `oai_dc` record is not
  affected.
- The formats are always on: `OAIMetadataFormatPlugin` registers its
  format when `getEnabled()` is true, and the MARC plugins keep
  `Plugin::getEnabled()`, which returns true (checked in the code).
- The rest of each template already uses its own format's naming and
  writes a blank indicator as a space, as in 042's `ind1=" "`. After the
  fix, both templates validate on every field the walk wrote (checked on
  screen).
- One more field is wrong but valid against the schema: 008's content,
  with quote marks and `%` signs (spec U19
  [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a15)).
  It is left to that entry.

## Proposed fix

Write each field in its template's own format, as the rest of that
template already does:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-fail-schema/fix.diff).

```diff
 plugins/oaiMetadataFormats/marcxml/templates/record.tpl
-		<datafield tag="022" ind1="#" ind2="#">
+		<datafield tag="022" ind1=" " ind2=" ">          (twice)
-	<datafield tag="024" ind1="7" ind2="#">
+	<datafield tag="024" ind1="7" ind2=" ">
-		<dataField tag="260" ind1=" " ind2=" ">
+		<datafield tag="260" ind1=" " ind2=" ">          (and the closing tag)
-	<datafield id="773" i1="0" i2=" ">
-		<subfield label="t">…
+	<datafield tag="773" ind1="0" ind2=" ">
+		<subfield code="t">…                             (and label="g" → code="g")

 plugins/oaiMetadataFormats/marc/templates/record.tpl
-		<varfield id="022" i1="#" i2="#">
-			<subfield label="$a">…
+		<varfield id="022" i1=" " i2=" ">
+			<subfield label="a">…                        (twice)
-				…<subfield code="u">…
+				…<subfield label="u">…                   (both affiliation lines)
```

The fix changes markup only. The 773 $t keeps the ";" after the journal
name ("Journal of Public Knowledge;"), which both formats carry over
from the old 786 $n. The schemas allow it, and dropping it is a
content choice that could go in the same change.

Tried on `main`: all four records of the Steps validate, and pymarc
reads the `marcxml` record with all 16 fields, 773 and both 260s
included. Compared field by field, the records with and without the fix
differ only in markup: the `oai_dc` record of article 17 is identical,
each MARC field has the same value ("#" read as a space), and
ListRecords in both formats lists the same two records.

**Alternatives:**

- Put 260 $c into the first 260, beside $b, as MARC usually writes one
  imprint. It is better MARC, but it is not needed for validity and
  changes the field count harvesters see. It can go with this fix or
  after it.
- Go back to 786 in `marcxml`, as before `pkp/ojs#5056`. That loses the
  change's aim, since 773 is MARC's field for the host journal and
  issue.
- Merge `pkp/ojs#4349` for the 773 part. It writes 773 as this fix does
  (`tag`, `code`), but predates `pkp/ojs#5056`, no longer applies and
  leaves the other fields as they are.

**What goes with it:**

- No stored data, API or hook changes: the records are rendered from
  the templates on each request. A template change does not move the
  records' datestamps, so a harvester that harvests by date keeps its
  old copies until it fetches everything again. That is worth a line in
  the release notes.
- Backport: on 3.5 the `oai_marc` part applies as written, but the
  `marcxml` part does not (773, see the Cause).
  [fix-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-fail-schema/fix-3_5.diff)
  makes the other changes and applies to 3.5's tip (checked with
  `patch --dry-run`, not applied). The 3.5 records the walk saved,
  edited by hand the same way, validate. 3.4 and 3.3 have the same
  lines as 3.5, except the affiliations, which there already read
  `label="u"`.
- Guard: a unit test per format beside
  `plugins/oaiMetadataFormats/dc/tests/OAIMetadataFormat_DCTest.php`
  that renders a record and checks it with
  `DOMDocument::schemaValidate()`. The proposal is to keep copies of
  `MARC21slim.xsd` (7 KB) and `oai_marc.xsd` (4 KB) beside the test, so
  that it never fetches them. The team should check whether both may be
  copied into the repo. The MARC formats have no test today.

Small: a few attribute values and one element name in the two MARC
plugins' templates, and a unit test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-fail-schema/walk.js)
  takes the Steps on PKP's default test dataset (pkp/datasets 38ab955,
  2026-09-30, PostgreSQL). It signs in as `dbarnes`, sets the prefix and
  assigns article 17's DOI through the screens, then signs out and reads
  the four records. Validation, step 6's corrected copy included, is in
  [marc.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-fail-schema/marc.js),
  with `MARC21slim.xsd` from the Wayback Machine's copy and
  `oai_marc.xsd` from openarchives.org.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-fail-schema/neighbour.js)
  reads the `oai_dc` record, both MARC records' field values and both
  MARC ListRecords. It was run with the fix in, then out, on the same
  install.
  Run from pkp-e2e on a freshly loaded dataset:
  `PROBE_FEATURE=issues-w14 PROBE_AGENT=w14 node bin/probe.js ojs
  shared/playwright/checks/issues/oai-marc-records-fail-schema/walk.js`.
- Walked on `main` and `stable-3_5_0`, OJS, each on a fresh load of that
  branch's dataset. `main` showed the Observed above. 3.5 showed the same
  022, 024, `dataField` and `oai_marc` messages.
- pymarc 5.4.0 (`parse_xml_to_array`), run on the records the walks
  saved:
  - `main`'s `marcxml` record: refused with `KeyError: (None, 'tag')` at
    field 773.
  - 3.5's: read without the second 260 (the issue date), with "##" and
    "7#" as the 022 and 024 indicators.
  - With the fix: all 16 fields read.
  Other readers are unverified.
- Tips walked or read:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc). The two templates at
    the lines named in the Cause, `lib/pkp/classes/plugins/OAIMetadataFormatPlugin.php`
    and `Plugin::getEnabled()`.
  - stable-3_5_0: OJS 92b9a16b48 (pkp-lib a9c76aed62). `marcxml`: 022
    and 024 "#", `dataField`. `oai_marc`: 022
    "#" and "$a", affiliations `code="u"`.
  - stable-3_4_0 (code): OJS 9571d8fde7, `plugins/oaiMetadataFormats/{marc,marcxml}/templates/record.tpl`.
    `marcxml`: 022 and 024 "#", `dataField`.
    `oai_marc`: 022 "#" and "$a", affiliation `label="u"`.
  - stable-3_3_0 (code): OJS 9fdb9bcf9a, the same files and the same
    lines as 3.4.
- Introduced: `git blame` and `git log -S` on each line, then the GitHub
  API's `commits/<sha>/pulls`:
  - `marcxml` 022 "#", `dataField`; `oai_marc` 022 "#" and "$a":
    [824cda1a29](https://github.com/pkp/ojs/commit/824cda1a2932760f4dbe14250e685eab83c74f9e),
    `pkp/ojs#401` for `pkp/pkp-lib#278`, 2015, Alec Smecher (asmecher).
    This change moved both formats from PHP into templates. The PHP
    wrote no 022 and wrote 260 $c as `datafield`.
  - `oai_marc` 022 kept "#" when `pkp/ojs#1709` for `pkp/pkp-lib#3062`
    ([3bec467aeb](https://github.com/pkp/ojs/commit/3bec467aebfb3659d8d9de6d3501505ca6ace6b7), 2017,
    Bozana Bokan, bozana) fixed the attribute names.
  - `marcxml` 024 "#":
    [f3555e45b4](https://github.com/pkp/ojs/commit/f3555e45b497809190a1da6f110df8f9fb552cd3),
    `pkp/ojs#3297`, 2022, Adrian Pachzelt (GrazingScientist).
  - `oai_marc` affiliation `code="u"`:
    [b2dcf98025](https://github.com/pkp/ojs/commit/b2dcf98025b2f9e87989b0cb85f71bf1ea3b7ef7),
    authored 2025-01-31 by GaziYucel in `pkp/ojs#4639` for
    `pkp/pkp-lib#7135`, a pull request opened by Bozana Bokan (bozana)
    and merged 2025-02-06.
  - `marcxml` 773 in `oai_marc` naming:
    [328db851de](https://github.com/pkp/ojs/commit/328db851de8724ccd68427f65e9e8949b1fbe9df),
    `pkp/ojs#5056`, 2025-08-20, Horacio Degiorgi (horaciod).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  issues and pull requests, by symptom words and the class name.
  `pkp/pkp-lib#3062` (closed, 2017) is related: it fixed `oai_marc`'s
  attribute names only.
