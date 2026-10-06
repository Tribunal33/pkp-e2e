# A journal's MARC records in OAI-PMH do not follow the schemas they name, and software reading them misses the journal, the issue date, the ISSN or the affiliations

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS (the lost journal and issue in `marcxml` is a regression
    since 3.5)
  - 3.5: OJS (`marcxml` loses the issue date, `oai_marc` the ISSN and
    the affiliations)
  - 3.4: OJS (code; `marcxml` loses the issue date, `oai_marc` the ISSN)
  - 3.3: OJS (code; as 3.4)
- **Introduced** not traced to one change (four, listed in Evidence);
  present since at least
  [824cda1a29](https://github.com/pkp/ojs/commit/824cda1a2932760f4dbe14250e685eab83c74f9e)
  (2015-01-29). The journal and issue field on main: `pkp/ojs#5056` ·
  [328db851de](https://github.com/pkp/ojs/commit/328db851de8724ccd68427f65e9e8949b1fbe9df)
  · 2025-08-19 · Horacio Degiorgi (horaciod)
- **Upstream** `pkp/ojs#4349` (open PR, not in main), covering only
  field 773 of the `marcxml` record; the proposed fix includes that
  change, written for today's template, and replaces the PR
- **Tracked in** spec U19 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester that checks a journal's `marcxml` records against the MARC21
schema they name finds every one invalid, and so does one that checks
the `oai_marc` records against theirs. Five things are wrong:

- `marcxml` writes field 773 (the journal's name and the issue) with
  the attribute names of `oai_marc`. This came after 3.5 and is on main
  only.
- `marcxml` writes the element of the issue's date in field 260 as
  "dataField", where the schema's name is "datafield".
- `oai_marc` writes each affiliation with the attribute name of
  `marcxml`.
- `oai_marc` names the ISSN's subfield "$a" where the schema's name is
  "a".
- Both write the indicators of the ISSN field, and `marcxml` those of
  the DOI field, as "#", which neither schema allows.

Software that reads a record without checking it, and takes the fields
by element name, field number and subfield code, loses nothing to the
"#" indicators. It silently finds no field for the other four: no
journal and issue and no issue date in `marcxml`, no ISSN and no
affiliation in `oai_marc`.

Every article of every journal is affected, in both formats, which are
always on. The same records in Dublin Core are not affected.

## Impact

- **Lost.** In `marcxml`: the journal's name and the issue an article is
  in (main only), and the issue's date. In `oai_marc`: the journal's
  ISSN and each contributor's affiliation. A harvester that validates
  refuses the whole record.
- **Who.** Every library catalogue or aggregator that harvests a journal
  in a MARC format.
- **Way round.** The harvester takes "oai_dc" instead, if it can.

Medium: a secondary output is wrong in a few fields of every record,
and the other format gives a way round. No catalogue was tried: the
losses were shown by reading the records by element name, field number
and subfield code. It would be high if a catalogue in use were shown to
refuse the records, or to harvest MARC only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: the journal `publicknowledge`.
  Nothing is created: the journal has both ISSNs, and article 17,
  "Antimicrobial, heavy metal resistance and plasmid profile of
  coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran", is published in "Vol. 1 No. 2 (2014)" with one
  contributor, whose affiliation is "University of Tehran".
- `xmllint`, and the two schema files the records name, saved beside
  the records:
  `https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd` and
  `http://www.openarchives.org/OAI/1.1/oai_marc.xsd`.

Signed out:

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=marcxml`
   and copy the identifier that ends in "article/17"
   ("oai:ojs2.localhost:article/17" in the walk; its middle part is the
   install's `repository_id`).
2. Open
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=marcxml&identifier=<that identifier>`.
   The page shows the record under "Unknown Metadata Format".
3. View the page's source and save the `<record …>…</record>` element
   inside `<metadata>` as `marcxml.xml`.
4. Run `xmllint --noout --schema MARC21slim.xsd marcxml.xml`.
5. Open the address of step 2 with `metadataPrefix=oai_marc` and save
   the `<oai_marc …>…</oai_marc>` element as `oai_marc.xml`.
6. Run `xmllint --noout --schema oai_marc.xsd oai_marc.xml`.

**Expected.** Both records validate, and each field is written with the
element and attribute names of the record's own format.

**Observed.** After step 4 the record fails to validate. The check
gives the first two messages for each of the two 022 fields and the
third for the issue date's 260, where it stops:

```
Element '{http://www.loc.gov/MARC21/slim}datafield', attribute 'ind1': [facet 'pattern'] The value '#' is not accepted by the pattern '[\da-z ]{1}'.
Element '{http://www.loc.gov/MARC21/slim}datafield', attribute 'ind2': [facet 'pattern'] The value '#' is not accepted by the pattern '[\da-z ]{1}'.
Element '{http://www.loc.gov/MARC21/slim}dataField': This element is not expected. Expected is ( {http://www.loc.gov/MARC21/slim}datafield ).
```

Further down, the record writes field 773 with `id`, `i1`, `i2` and
`label`, the attributes of `oai_marc`:

```xml
<dataField tag="260" ind1=" " ind2=" ">
	<subfield code="c">2026-09-30 12:12:00</subfield>
</dataField>
…
<datafield id="773" i1="0" i2=" ">
	<subfield label="t">Journal of Public Knowledge;</subfield>
	<subfield label="g">Vol. 1 No. 2 (2014)</subfield>
</datafield>
```

[3.5: there is no field 773; the journal and the issue are in a field
786 written with `tag`, `ind1`, `ind2` and `code`. The rest is the
same.]

After step 6 the record fails to validate. The check gives the first
three messages for each of the two 022 fields and the last two for the
affiliation in field 100:

```
Element '{http://www.openarchives.org/OAI/1.1/oai_marc}varfield', attribute 'i1': [facet 'pattern'] The value '#' is not accepted by the pattern '[0-9a-z\s]?'.
Element '{http://www.openarchives.org/OAI/1.1/oai_marc}varfield', attribute 'i2': [facet 'pattern'] The value '#' is not accepted by the pattern '[0-9a-z\s]?'.
Element '{http://www.openarchives.org/OAI/1.1/oai_marc}subfield', attribute 'label': [facet 'pattern'] The value '$a' is not accepted by the pattern '[0-9a-z]'.
Element '{http://www.openarchives.org/OAI/1.1/oai_marc}subfield', attribute 'code': The attribute 'code' is not allowed.
Element '{http://www.openarchives.org/OAI/1.1/oai_marc}subfield': The attribute 'label' is required but missing.
```

```xml
<varfield id="022" i1="#" i2="#">
	<subfield label="$a">0378-5955</subfield>
</varfield>
…
<varfield id="100" i1="1" i2=" ">
	<subfield label="a">Karbasizaed, Vajiheh</subfield>
	<subfield code="u">University of Tehran</subfield>
</varfield>
```

Control: every other field of the two records uses its format's own
names (`<datafield tag="245" ind1="0" ind2="0">` with
`<subfield code="a">`, `<varfield id="245" i1="0" i2="0">` with
`<subfield label="a">`).

## Cause

The two records are plain Smarty templates,
`plugins/oaiMetadataFormats/marcxml/templates/record.tpl` (MARC21:
`datafield` with `tag`, `ind1`, `ind2`, and `subfield` with `code`) and
`plugins/oaiMetadataFormats/marc/templates/record.tpl` (`oai_marc`:
`varfield` with `id`, `i1`, `i2`, and `subfield` with `label`). Nothing
checks what they write, and no test renders them, so a line copied from
the other template, or a typing slip, stays.

The lines on `main` that break the schema each record names:

- `marcxml`, lines 19 and 24 (022) and 29 (024): `ind1="#"`, `ind2="#"`.
  MARC documentation prints a blank indicator as "#"; in a record it is
  a space, as the template's other fields write it (`ind1=" "`).
- `marcxml`, lines 90 and 92: `<dataField tag="260" …>` for the issue's
  date. XML names are case-sensitive, so this is not a `datafield`.
- `marcxml`, lines 109 to 113: field 773 written as
  `<datafield id="773" i1="0" i2=" ">` with `<subfield label=…>`. It has
  no `tag`, `ind1`, `ind2` or `code`. This is the one part that is on
  `main` only: `pkp/ojs#5056` replaced a well-formed field 786 with
  lines copied from the `oai_marc` template, where `pkp/ojs#4350` had
  made the same change of field.
- `oai_marc`, lines 17 and 22 (022): `i1="#" i2="#"`, and lines 18 and
  23: `label="$a"`. The schema's own comment says the leading "$" is
  not used.
- `oai_marc`, lines 55 and 56: the affiliation as `<subfield code="u">`,
  where the schema requires `label`. 3.4 and 3.3 write it
  `<subfield label="u">`.

Reach:

- Every article record, in `ListRecords` and `GetRecord`, on the
  journal's and the site-wide address (walked for articles 17 and 1 on
  the journal's address; the template is the same for all).
- 022 shows for a journal with an ISSN, the 260 date and 773 for an
  article in an issue, the affiliation for a contributor who has one,
  in field 100 or, with several contributors, 720 (all walked). 024
  shows for an article with a DOI (in the code; the dataset's articles
  have none).
- The version fields are written in each format's own names: 251 was in
  the walked records; 780 and the "Summary of Changes" 500 show only
  for an article with an earlier published version, which the dataset
  lacks (in the code).
- A press and a preprint server have no MARC formats.
- Not covered here: both templates write field 008 between quotation
  marks. The `oai_marc` schema requires them; MARC21 does not have
  them, so the `marcxml` field is two characters longer than its 40.
  The schema does not check this. The date inside is the fault of
  another report (spec U19 A15,
  [U19-A15-oai-marc-008-date-percent-signs.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A15-oai-marc-008-date-percent-signs.md)).

## Proposed fix

Write each of those lines with its own format's names. A proposal,
tried on `main`; the team decides.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/fix.diff)
(against the OJS root), in short:

```diff
--- a/plugins/oaiMetadataFormats/marcxml/templates/record.tpl
-		<datafield tag="022" ind1="#" ind2="#">
+		<datafield tag="022" ind1=" " ind2=" ">
-	<datafield tag="024" ind1="7" ind2="#">
+	<datafield tag="024" ind1="7" ind2=" ">
-		<dataField tag="260" ind1=" " ind2=" ">
+		<datafield tag="260" ind1=" " ind2=" ">
-	<datafield id="773" i1="0" i2=" ">
-		<subfield label="t">…</subfield>
-			<subfield label="g">…</subfield>
+	<datafield tag="773" ind1="0" ind2=" ">
+		<subfield code="t">…</subfield>
+			<subfield code="g">…</subfield>
--- a/plugins/oaiMetadataFormats/marc/templates/record.tpl
-		<varfield id="022" i1="#" i2="#">
-			<subfield label="$a">…</subfield>
+		<varfield id="022" i1=" " i2=" ">
+			<subfield label="a">…</subfield>
-				{if $affiliation->getRor()}<subfield code="u">…
+				{if $affiliation->getRor()}<subfield label="u">…
```

Tried on OJS `main`: both records of article 17 and of article 1 (three
contributors, so field 720; both carry the version field 251) validate
against their schemas, and reading by element name, field number and
subfield code finds 773, both 260 fields, the ISSNs and the
affiliations. Every field's value was the same as without the fix, and
so was the "oai_dc" record.

**Alternatives**

- Merge `pkp/ojs#4349`. Its 773 has the same element and attribute
  names as this fix, but it was written against the field 786 that
  `pkp/ojs#5056` has since replaced, so it no longer applies; it also
  drops the ";" after the journal's name, predates the pages in subfield
  "g", and leaves the other lines.
- Build the records in PHP with a DOM writer instead of templates. It
  would make a wrong element name impossible, and is a rewrite of both
  plugins for no other gain.

**What goes with it**

- No stored data changes; a record is written on each request. A
  harvester that already took the records gets the change only when it
  harvests the articles again, since their datestamps do not move.
- A harvester that had adapted to the wrong names (reading
  `label="$a"`, or `dataField`) would have to follow.
- 3.5: the same lines apart from 773, which `marcxml` does not have
  there. 3.4 and 3.3: the 022, 024 and `dataField` lines of `marcxml`
  and the 022 lines of `oai_marc`. Not tried on those versions.
- Guard: an e2e scenario in this repository's spec (U19 Rule 12: each
  MARC record validates against the schema it names), or a plugin test
  beside `plugins/oaiMetadataFormats/dc/tests` that renders both
  templates and validates the result.

Small: about a dozen lines, each an element or attribute name or an
indicator, in the two templates of one repository, each following the
line next to it, with no data repair; it was tried and both records
validate. It would be medium if the team wants harvesters warned of the
changed names first.

## Evidence

- Kept script that takes the Steps on OJS, signed out, on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 2c84c3c,
  2026-10-01, the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade
  needed):
  [`shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/walk.js),
  run with `PROBE_FEATURE=issues-a12 PROBE_AGENT=a12 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes the
  identifier from `ListIdentifiers`, opens each address in the browser,
  reads the raw XML beside it, fetches the two schemas from the
  addresses the records name and checks each record.
- Where the walk differs from the Steps: the machine has no `xmllint`,
  so the check runs through PHP's `DOMDocument::schemaValidate()`
  (`validate.php` beside the script), which is libxml2, the library
  `xmllint` uses. The messages in Observed are its messages. The same
  file reads each record's fields by element name, field number and
  subfield code; that reading is what the Summary's losses rest on.
- With `dataField` corrected by hand in a copy of the walk's `marcxml`
  record, the check went on to field 773 and refused its `id`, `i1`,
  `i2` and `label` attributes and the missing `tag`, `ind1`, `ind2` and
  `code`.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/fix.diff ojs`,
  then `walk.js` as above. Besides the Steps the script reads article 1
  in both formats, every field's values in the four records and the
  "oai_dc" record of article 17; those were compared with the fix in
  and out. Reverted with `node bin/try-fix.js revert` and the same
  arguments.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc); 3.5 at OJS
  18d097d94e (lib/pkp 1fb843f491), where both records failed with the
  same messages, the 260 date was not found in `marcxml` nor the ISSN
  and the affiliation in `oai_marc`, and `marcxml` held no 773. The
  walks ran on PostgreSQL; the fault does not depend on the database.
- Code read on main: the two templates whole, and a search of the three
  apps' plugins and pkp-lib's templates for other "#" indicators (none
  outside these two files). 3.5: the same two templates
  (`marcxml` lines 19, 24, 29, 72, 74; `oai_marc` lines 17, 18, 22, 23,
  38, 39).
- 3.4 and 3.3 by code: OJS `upstream/stable-3_4_0` (9571d8fde7) and
  `upstream/stable-3_3_0` (9fdb9bcf9a), the same two templates:
  `marcxml` lines 19, 24 (022 "#"), 29 (024 "#"), 66 and 68
  (`dataField`); `oai_marc` lines 17 and 22 ("#"), 18 and 23
  (`label="$a"`). The `oai_marc` affiliation is written correctly there
  (line 38, `<subfield label="u">`), and neither record has a 773.
- The four changes that wrote the lines, by `git blame`, `git log -S`
  and `git show` on each:
  - [824cda1a29](https://github.com/pkp/ojs/commit/824cda1a2932760f4dbe14250e685eab83c74f9e)
    (2015-01-29, for `pkp/pkp-lib#278`) created the two templates from
    PHP code that is not traced further, with `dataField`, the 022 "#"
    in both and the `oai_marc` `label="$a"`.
    [3bec467aeb](https://github.com/pkp/ojs/commit/3bec467aebfb3659d8d9de6d3501505ca6ace6b7)
    (2017-11-17, for `pkp/pkp-lib#3062`) renamed the `oai_marc`
    attributes to `id`, `i1`, `i2` and carried the "#" and "$a" over.
  - [f3555e45b4](https://github.com/pkp/ojs/commit/f3555e45b497809190a1da6f110df8f9fb552cd3)
    (2022-02-11, `pkp/ojs#3297`): the 024 "#".
  - [b2dcf98025](https://github.com/pkp/ojs/commit/b2dcf98025b2f9e87989b0cb85f71bf1ea3b7ef7)
    (2025-01-31, for `pkp/pkp-lib#7135`): the `oai_marc` `code="u"`.
  - [328db851de](https://github.com/pkp/ojs/commit/328db851de8724ccd68427f65e9e8949b1fbe9df)
    (2025-08-19, `pkp/ojs#5056`): the `marcxml` 773.
- Tracker search, 2026-10-01, pkp/pkp-lib and pkp/ojs, issues and PRs:
  "marcxml", "oai_marc", "marc 008", "marc 773", "MARC21 schema", "marc
  dataField". `pkp/pkp-lib#13280` (closed, fixed) is about subjects
  printed as "Array"; `pkp/pkp-lib#3062` (closed, fixed in 2017) is
  about the `oai_marc` attributes and links a forum thread where an
  OAI registry refused a journal over them.
- Not driven: the site-wide address; an article with a DOI or with an
  earlier published version; any catalogue or harvester software.
  Unverified: which harvesters validate and which drop a field they
  cannot read.
