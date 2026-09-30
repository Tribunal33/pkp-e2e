# In the browser view of OAI, a record's "formats" page lists the whole archive's formats, with no link to the record

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [cdd5b10886](https://github.com/pkp/pkp-lib/commit/cdd5b108865517f8768e0d4d551116a280fc7c02), the commit that added the browser stylesheet (no pull request) · 2008-12-02 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Opened in a web browser, an install's OAI address shows each response as
a readable page, built by one stylesheet shared by all three apps. On
those pages every record carries a block "OAI Record Header", and that
block has a "formats" link. The block appears on the ListRecords,
ListIdentifiers and GetRecord pages.

A journal manager, a support person or an indexing service's staff
member who presses "formats" expects a page about that record: which
formats it comes in, with a link to the record in each. Instead they
get the same page as the archive-wide "ListMetadataFormats" link at the
top. It reads "This is a list of metadata formats available from this
archive." and has no link to the record.

This happens for every record, on a journal's, press's or server's own
address and on the install-wide one.

## Impact

- **Lost**: nothing. The formats listed are the right ones, and
  harvesters, which read the XML behind the page, receive the record's
  identifier with the list.
- **Who**: only people reading OAI in a browser. No editor or reader
  screen links the OAI address.
- **Way round**: the "oai_dc" link beside "formats" opens the record in
  Dublin Core, and changing `metadataPrefix` in the address opens it in
  another format.

Low: nothing is lost, and the way round is one click.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), with its
  journal, press or server `publicknowledge` and its OAI interface on,
  as by default.
- A browser that applies the XSL stylesheet the response names (the walk
  used Chromium). Without it the raw XML shows, and that is correct.

No sign-in is needed. The browser shows each response as a page headed
"OAI 2.0 Request Results".

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   (the same page opens from the link "ListIdentifiers" at the top of
   `/index.php/publicknowledge/oai`).
2. On the first "OAI Record Header", press "formats", beside "oai_dc".
   The address becomes `…/oai?verb=ListMetadataFormats&identifier=oai:ojs2.localhost:article/1`
   (OMP `oai:omp.localhost:publicationFormat/2`, OPS
   `oai:ops.localhost:preprint/2`).
3. Read the line above the first "Metadata Format" block.

**Expected.** The line names the record and links it in each format:

```
This is a list of metadata formats available for the record "oai:ojs2.localhost:article/1". Use these links to view the metadata: marcxml oai_dc oai_marc
```

(OMP and OPS: `oai_dc` only.) Each link opens that record in that
format, headed "OAI Record: oai:ojs2.localhost:article/1".

**Observed.** On all three apps the line is the one for the whole
archive, with no link:

```
This is a list of metadata formats available from this archive.
```

The XML response does carry the identifier:

```xml
<request verb="ListMetadataFormats" identifier="oai:ojs2.localhost:article/1">http://…/index.php/publicknowledge/en/oai</request>
```

Control: the top link "ListMetadataFormats", which sends no identifier,
shows the same line, and there it is right.

## Cause

The browser view is `lib/pkp/xml/oai2.xsl`, which `OAI::response()` links
as the response's stylesheet. Its `oai:ListMetadataFormats` template
(line 447) tests the global variable `$identifier`:

- When `$identifier` is not empty, the template prints "…available for
  the record "{identifier}". Use these links…" and one `GetRecord` link
  per `metadataPrefix`.
- When it is empty, the template prints "…available from this archive."

`$identifier` (line 155) is cut out of the text of `<request>`, after
`identifier=` and up to the next `&`:

```xml
<xsl:variable name='identifier' select="substring-before(concat(substring-after(/oai:OAI-PMH/oai:request,'identifier='),'&amp;'),'&amp;')" />
```

That assumes the request's arguments are in its text, as a query
string. OAI-PMH puts them in attributes, and the text is the base URL
alone. `PKP\oai\OAI::response()` (`lib/pkp/classes/oai/OAI.php`) writes
exactly that: `<request verb="…" identifier="…">{baseUrl}</request>`.
So the text never holds `identifier=`, the variable is always empty,
and the template always prints the archive line.

The stylesheet is Christopher Gutteridge's EPrints XSLT, and this line
came with it (Introduced; Evidence gives the history).

Reach:

- `$identifier` is read only by the `ListMetadataFormats` template and
  its `metadataPrefix` links (checked in the code). The other templates
  take a record's identifier from the record itself, so GetRecord,
  ListRecords and ListIdentifiers pages are right (the "oai_dc" and
  "formats" links checked on screen).
- A journal's, press's or server's own address and the install-wide
  address `/index.php/index/oai` share the stylesheet and
  `OAI::response()` (checked in the code).

## Proposed fix

A proposal; the team decides. Read the identifier from the request's
attribute, where the server puts it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-record-formats-shown-as-archive/fix.diff)):

```diff
-<xsl:variable name='identifier' select="substring-before(concat(substring-after(/oai:OAI-PMH/oai:request,'identifier='),'&amp;'),'&amp;')" />
+<xsl:variable name='identifier' select="/oai:OAI-PMH/oai:request/@identifier" />
```

This reads the request the way the rest of the file does: "Request was
of type …" and the "Resume" link read `oai:request/@verb`.

The template's `GetRecord` links put the identifier into the address
without URL-encoding it. The "oai_dc" and "formats" links on a record
already do the same, and the fix leaves that as it was. It does not
matter for PKP's identifiers, such as `oai:ojs2.localhost:article/1`:
they hold letters, digits, `.`, `:` and `/`, and all of these may stand
unencoded in a query string. In the trial, every link opened its
record.

Tried on `main`, OJS, OMP and OPS: the "formats" page matched Expected,
and each link opened the record in its format. The fix reaches no
further than that page:

- The top link "ListMetadataFormats" still read "…available from this
  archive.", with no record links.
- An identifier that is not in the repository still showed "OAI
  Error(s)" with `idDoesNotExist`.
- The "oai_dc" and "formats" links on a record page were unchanged.

**Alternatives:**

- Put the arguments into `<request>`'s text as well: breaks the
  protocol, which asks for the base URL there, and changes what
  harvesters receive.
- Drop the record branch from the template: loses the per-record links
  the stylesheet was written to give.

**What goes with it:**

- No stored data, API or plugin hook is involved. The diff applies as
  written to every version Affects lists.
- The same change could be offered to EPrints.
- Guard: the XSLT has no unit test; a pkp-e2e scenario on U19 can press
  "formats" on a record and read the page.

Small: a one-line change that follows the file's own pattern, plus a test.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-record-formats-shown-as-archive/walk.js)
  takes the Steps in a browser on PKP's default test dataset
  (pkp/datasets 38ab955, 2026-09-30, PostgreSQL), on the three apps, and
  then opens each record link the line offers;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-record-formats-shown-as-archive/neighbour.js)
  makes the three checks listed under the trial, with the fix in and out
  (the same results both ways). Both read the page through
  [formats.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-record-formats-shown-as-archive/formats.js).
  Run from pkp-e2e: `PROBE_FEATURE=issues-w09 PROBE_AGENT=w09 node
  bin/probe.js all
  shared/playwright/checks/issues/oai-record-formats-shown-as-archive/walk.js`;
  3.5 the same with `PKP_E2E_LINE=stable-3_5_0` in front. On 3.5, OJS
  also lists `rfc1807`.
- Tips walked or read:
  - main: OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7; pkp-lib
    2e377d27fc (OJS), 3dc90c81a6 (OMP, OPS).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd; pkp-lib
    a9c76aed62.
  - stable-3_4_0 (code): OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b;
    pkp-lib df13621c2d. `xml/oai2.xsl` has the same line 155 and
    template; `classes/oai/OAI.php` writes the base URL as `<request>`'s
    text; each app has the OAI handler (`pages/oai`).
  - stable-3_3_0 (code): OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161;
    pkp-lib d446601ebe. The same line and template;
    `classes/oai/OAI.inc.php` writes the base URL as the text; each app
    has `pages/oai`.
  - A dry run of `patch` applies fix.diff to the 3.4 and 3.3
    stylesheets as written.
- Introduced: `git blame` on line 155 gives cdd5b10886 ("#1442# Added
  XSL for OAI", 2008-12-02). `OAI.inc.php` at that commit already wrote
  `<request {params}>{baseUrl}</request>`, so the line has never
  matched what PKP sends. 5939680212 (`pkp/pkp-lib#9766`, 2024-11-13,
  the refresh from EPrints) and its backports kept the line. EPrints'
  current `lib/static/oai2.xsl` (eprints/eprints3.4) has the same line.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library for "oai2.xsl", "oai stylesheet", "oai xsl", "oai
  xslt", "metadata formats available", "oai formats identifier" and
  "ListMetadataFormats". `pkp/pkp-lib#9766` is the only match on the
  stylesheet, and does not touch this line.
