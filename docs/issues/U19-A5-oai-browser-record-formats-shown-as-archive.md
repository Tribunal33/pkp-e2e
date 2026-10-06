# The browser view of one OAI-PMH record's formats reads "available from this archive" and has no links to that record

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least
  [cdd5b10886](https://github.com/pkp/pkp-lib/commit/cdd5b108865517f8768e0d4d551116a280fc7c02)
  (2008-12-02), which added the stylesheet
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager or developer who reads a journal's OAI-PMH address in a
browser sees a "formats" link beside each record of a list. Pressing it
should open a page that says which formats that record comes in, with a
link to the record in each. The page says "This is a list of metadata
formats available from this archive." instead.

It is the same page as the formats of the whole archive. The formats
listed are the record's own, but each links to the list of every record
in that format, not to the record.

It happens for every record, with no setup. Harvesters, which read the
XML, are not affected.

## Impact

- **Lost.** The sentence naming the record and the links that open that
  record in each of its formats.
- **Who.** A manager checking what the journal exposes, or a developer,
  on the browser view of a list of records or of one record.
- **Way round.** Press a format's "metadataPrefix" link and find the
  record in the list it opens, or type
  `?verb=GetRecord&metadataPrefix=…&identifier=…` in the address bar.

Low: a sentence misleads and a shortcut is missing while the task gets
done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: the journal "Journal of Public
  Knowledge" (`publicknowledge`) on OJS, the press and the preprint
  server of the same path on OMP and OPS. Nobody signs in: the OAI-PMH
  address is public.
- A browser that applies XSL stylesheets (the walks used Chromium):
  the links are part of the page the stylesheet builds, not of the XML.

Steps:

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
2. In the first record's "OAI Record Header", press "formats" beside
   the "OAI Identifier" (`oai:ojs2.localhost:article/1` on OJS,
   `oai:omp.localhost:publicationFormat/2` on OMP,
   `oai:ops.localhost:preprint/2` on OPS).
3. In the "Metadata Format" block whose "metadataPrefix" is "oai_dc",
   press that "oai_dc" link.

**Expected.** Step 2 reads 'This is a list of metadata formats
available for the record "oai:ojs2.localhost:article/1". Use these
links to view the metadata:' followed by one link per format, each
opening that record in that format.

**Observed.** Step 2 opens
`?verb=ListMetadataFormats&identifier=oai:ojs2.localhost:article/1` and
reads "This is a list of metadata formats available from this
archive.", with no link in or after the sentence. Under it are the
"Metadata Format" blocks (3 on OJS: "marcxml", "oai_dc", "oai_marc"; 1
on OMP and OPS: "oai_dc"). Step 3 opens `?verb=ListRecords&metadataPrefix=oai_dc`, the
list of every record (2 on OJS and OMP, 17 on OPS). Each address
redirects to the same address with "/en/" in it, which is the one that
answers.

The XML response names the record:

```
GET /index.php/publicknowledge/en/oai?verb=ListMetadataFormats&identifier=oai:ojs2.localhost:article/1   200

<request verb="ListMetadataFormats" identifier="oai:ojs2.localhost:article/1">http://…/index.php/publicknowledge/en/oai</request>
```

Control: "ListMetadataFormats" in the row of links at the top of every
OAI-PMH page names no record. It shows the same sentence and blocks,
and there they are right.

## Cause

The browser view is built by `lib/pkp/xml/oai2.xsl`, which every OAI-PMH
answer names as its stylesheet. It works out which record the request
named from the text of the `request` element
([line 155 on main](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/xml/oai2.xsl#L155)):

```xml
<xsl:variable name='identifier' select="substring-before(concat(substring-after(/oai:OAI-PMH/oai:request,'identifier='),'&amp;'),'&amp;')" />
```

That looks for "identifier=" in the element's text, as if the text were
the address with its query string. In OAI-PMH 2.0 the text is the base
address alone and the arguments are attributes of the element, which is
what `PKP\oai\OAI::response()` writes
([`classes/oai/OAI.php`, lines 706 to 715](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/oai/OAI.php#L706-L715)).
So `$identifier` is always the empty string.

The template for ListMetadataFormats
([lines 447 to 457](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/xml/oai2.xsl#L447-L457))
chooses its sentence by `<xsl:when test="$identifier">`. The test never
holds, so the "for the record" sentence and the links built by the
`oai:metadataPrefix` template (line 472) are never shown.

Reach:

- `$identifier` is used in those two templates and nowhere else in the
  file; no other template reads an argument from the element's text
  (the others read attributes, as line 545 reads `@verb`) (code).
- "formats" on any record, in ListRecords, ListIdentifiers and
  GetRecord, at a context's address and the site-wide one, leads to the
  same page. Only "formats" on a ListRecords page was pressed; the
  rest is from the code.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/fix.diff)
applied to the three apps. With it, step 2 reads as Expected (on OJS
the links are "marcxml", "oai_dc" and "oai_marc"), and each link opens
that one record in that format. "ListMetadataFormats" in the top row
still reads "… available from this archive." with no record links. The
"Metadata Format" blocks, the "oai_dc" link beside a record's
identifier and the refusal for a record that does not exist are
unchanged.

Recommended: read the identifier from the attribute.

```diff
--- a/lib/pkp/xml/oai2.xsl
+++ b/lib/pkp/xml/oai2.xsl
@@ -152,7 +152,7 @@
 <xsl:call-template name='xmlstyle' />
 </xsl:template>
 
-<xsl:variable name='identifier' select="substring-before(concat(substring-after(/oai:OAI-PMH/oai:request,'identifier='),'&amp;'),'&amp;')" />
+<xsl:variable name='identifier' select="/oai:OAI-PMH/oai:request/@identifier" />
 
 <xsl:template match="/">
 <html lang="en">
```

The file already reads the request's other argument this way (`/oai:OAI-PMH/oai:request/@verb`,
line 545). `test="$identifier"` is false when the attribute is absent,
so a request without an identifier keeps the archive sentence.

**Alternatives:**

- Remove the "for the record" branch and the variable: the page would
  then be consistent, but "formats" beside a record would stay a link
  to a page that says nothing about that record.

**What goes with it:**

- Only the browser view changes. No XML answer, stored data, hook or API
  changes.
- With the fix the "metadataPrefix" links in the blocks still list the
  whole archive, as the stylesheet intends; the record's own links are
  the ones in the sentence.
- Backport: `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0` hold the
  same file, byte for byte, so the diff applies as written.
- Guard: a pkp-e2e test that presses "formats" on a record and expects
  the record's identifier in the sentence and a working link per
  format, proposed as a Planned item of spec U19.

Small: one line in one file.

## Evidence

- Kept script that takes the Steps on the three apps, signed out, each
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 2c84c3c, 2026-10-01, the `main` and `stable-3_5_0`
  PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/walk.js),
  run with `PROBE_FEATURE=issues-a4 PROBE_AGENT=a4 node bin/probe.js all shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It presses the links
  on the page and reads the raw XML beside each. On 3.5 every step
  showed what main showed, with a fourth block on OJS ("rfc1807").
  The walks pressed the first block's link at step 3 ("marcxml" on OJS,
  "oai_dc" on OMP and OPS); the Steps name "oai_dc" because the blocks'
  order follows the order the format plugins load.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/fix.diff ojs omp ops`,
  then `walk.js` as above, which presses every link the sentence then
  offers and also reads the cases the fix must not change
  ("ListMetadataFormats" in the top row, the blocks' links, "oai_dc"
  beside the identifier, the formats of a record that does not exist),
  run with the fix in and out. Reverted with
  `node bin/try-fix.js revert shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/fix.diff ojs omp ops`.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 at OJS 18d097d94e, OMP
  b24879c3db, OPS 3f0919468c (lib/pkp 1fb843f491).
- Code read on main: lib/pkp `xml/oai2.xsl` (the variable, the
  ListMetadataFormats and `oai:metadataPrefix` templates, the header
  template that builds the "formats" link, every use of `oai:request`),
  `classes/oai/OAI.php` (`response()`, `listMetadataFormats()`).
- 3.5, 3.4 and 3.3 by code: `xml/oai2.xsl` on lib/pkp `stable-3_5_0`
  (1fb843f491), `origin/stable-3_4_0` (df13621c2d) and
  `origin/stable-3_3_0` (d446601ebe) is identical to main's, and each
  branch's `OAI.php` (`OAI.inc.php` on 3.3) writes the arguments as
  attributes of `request` and the base address as its text.
- Introduced: the variable is in the file as first added to pkp-lib
  (cdd5b10886, "Added XSL for OAI", the EPrints stylesheet by
  Christopher Gutteridge), unchanged since; `pkp/pkp-lib#9766` (2024)
  did not touch the line.
- Upstream search, 2026-10-01, issues and PRs, open and closed:
  pkp/pkp-lib by "oai2.xsl", "OAI stylesheet", "OAI
  ListMetadataFormats", "OAI formats "this archive"", "OAI "metadata
  formats" record identifier" and "OAI XSL"; pkp/ojs by "oai2.xsl" and
  "OAI stylesheet"; pkp/omp and pkp/ops by "OAI stylesheet". Nothing on
  this fault. pkp/ui-library was not searched: the stylesheet is
  pkp-lib's.
- Not driven: "formats" from a ListIdentifiers or GetRecord page, the
  site-wide address, and a deleted record's "formats".
