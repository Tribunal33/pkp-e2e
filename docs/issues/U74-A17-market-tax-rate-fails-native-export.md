# A book whose market has a tax rate other than "Zero-rated", or a tax type alone, fails its Native XML export

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#1753` for `pkp/pkp-lib#10561` · [dca0635](https://github.com/pkp/omp/commit/dca0635188557f6feb0d1e4092d013ba1618ae73) · 2024-11-08 · Kaitlin Newson (kaitlinnewson); on 3.4 and 3.3 `pkp/omp#1742` and `pkp/omp#1741` for `pkp/pkp-lib#10560` (2024-10-25)
- **Upstream** `pkp/pkp-lib#10105` (open), asking for the tax percentage and amount fields the market lacks; it does not mention the export failing
- **Tracked in** spec U74 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a17)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor sets a "Taxation Rate" such as "Standard rate (S)" on a
book's market. Or they choose a "Taxation Type" such as "VAT
(Value-added tax) (01)" and leave the rate empty. When they then export
the book from Tools › "Native XML Plugin", the export ends with "The
process failed. Check below for errors/warnings." and "Element
'{http://ns.editeur.org/onix/3.0/reference}Tax': Missing child
element(s).", and no file is offered. They expect the file, with the
tax they chose stated in it. Until a schema change in late 2024, the
same book exported with its tax type and rate code in the file.

If other books are ticked in the same export, they get no file either.
The editor can export the book only by changing its tax:

- emptying the tax fields drops the tax from the record;
- choosing "Zero-rated (Z)" records a tax rate the press does not
  charge.

## Impact

- **Lost**: the Native XML file for every book in an export that
  includes the taxed book, so a backup or a move to another install
  fails. The error names an XML element, not the market's "Taxation"
  fields.
- **Who**: a press manager or editor exporting books, when a book's
  market states a non-zero tax or a tax type with no rate.
- **Way round**: export the taxed books apart from the others. For
  those books, empty their tax fields or choose "Zero-rated (Z)". Where
  the price really includes tax, a "Price Type" that says so, such as
  "RRP including tax (02)", also exports. The file then carries no tax
  details, only the price type.

Medium: a secondary task fails for every export that includes a taxed
book. There is a way round on screen, but it costs the tax statement.
If the Native XML export were a press's only way to move its catalogue,
this would be high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`.
- Sign in as `dbarnes`.
- A Native XML file carries a format's ONIX data only when six press
  settings are set. The dataset already sets two of them, the principal
  contact's name and email. Set the four "Publisher Identity" details it
  leaves blank: on Settings › Press › "Masthead", type "Public Knowledge
  Press" in "Press Publisher Name" and "Vancouver" in "Geographical
  Location", choose "Proprietary (01)" in "Publisher Code Type", type
  "PKP-01" in "Publisher Code", and press "Save".

Steps:

1. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture" (in Production), and choose "Publication Formats"
   in its side menu.
2. On the format "PDF", press the arrow, then "Edit". Open the
   "Metadata" tab.
3. Under "Market Territories", press "Add Market". Type 20261001 in
   "Date", choose "Canada (CA)" under "Countries" in "Included", type 25
   in "Price", and choose "Standard rate (S)" in "Taxation Rate". Leave
   "Price Type" and "Taxation Type" empty. Press "OK": "Market added."
4. Go to Tools › "Import/Export" › "Native XML Plugin" and open the
   "Export" tab. Tick "How Canadians Communicate: Contexts of Canadian
   Popular Culture" and press "Export Submissions".

A tax type without a rate:

5. Back on the format's "Metadata" tab, press the market's arrow, then
   "Edit". Choose the empty choice in "Taxation Rate" and "VAT
   (Value-added tax) (01)" in "Taxation Type". Press "OK": "Market
   edited."
6. Export the book again as in step 4.

**Expected**: after steps 4 and 6, "The export completed successfully."
and "Download Exported File".

**Observed**: after steps 4 and 6, the tab "Export Submissions Results"
reads:

```
The process failed. Check below for errors/warnings.
…
Errors occured:
Generic Items
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}Tax': Missing child element(s). Expected is ( {http://ns.editeur.org/onix/3.0/reference}TaxAmount ).
Validation errors:
Element '{http://ns.editeur.org/onix/3.0/reference}Tax': Missing child element(s). Expected is ( {http://ns.editeur.org/onix/3.0/reference}TaxAmount ).
```

The "…" stands for four warnings about skipped review files, which a
successful export shows too.

Several books: with the market of step 3 in place, tick both that book
and submission 14, "From Bricks to Brains: The Embodied Cognitive
Science of LEGO Robots" (which has no market), and export. The result is
the same failure, with no file. Submission 14 exported alone completes.

Control: with "Zero-rated (Z)" in "Taxation Rate" (and VAT kept), the
export of step 4 completes, and the file's price carries
`<Tax><TaxType>01</TaxType><TaxRateCode>Z</TaxRateCode><TaxRatePercent>0</TaxRatePercent><TaxableAmount>25</TaxableAmount></Tax>`.

## Cause

`MonographONIX30XmlFilter::createProductNode()`
(`plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`,
line 916) writes a `Tax` element inside the market's `Price` whenever
the market has a tax type or a tax rate code and its price type does
not include tax. The ONIX schema
(`plugins/importexport/onix30/ONIX_BookProduct_3.0_reference.xsd`,
`Tax`) requires a `Tax` to carry either a `TaxRatePercent` or a
`TaxAmount`. A market stores neither, because the market window has no
field for them. The filter writes `TaxRatePercent` 0 for "Zero-rated
(Z)" (line 925) and nothing for any other rate, so every other `Tax` it
writes is invalid.

The Native export checks that product before using it. When the press's
six ONIX settings are set,
`PublicationFormatNativeXmlFilter::createRepresentationNode()` (line 65)
runs the `monograph=>onix30-xml` filter on the book:

- `Filter::execute()` checks the filter's output with
  `XMLTypeDescription::checkType()`. That check uses the group's output
  type, set to the ONIX schema above in `native/filter/filterConfig.xml`
  line 76 (and by the `I10561_OnixFilter` migration on upgraded
  installs).
- When the check fails, `execute()` returns null, and
  `if ($onixDoc)` leaves the format's product out without an error.
- The schema errors stay in libxml's buffer.
  `PKPImportExportDeployment::export()` collects them as
  `xmlValidationErrors`, and `isProcessFailed()` then marks the whole
  export as failed.

All the books ticked in one export run through one deployment and share
that buffer, so one taxed book fails them all.

Before late 2024 the check used `native/ONIX_BookProduct_3.0_reference_notstrict.xsd`,
a lenient copy of the 2009 ONIX 3.0 schema in which every child of
`Tax` is optional, so the same `Tax` passed. The changes went in this
order:

- July 2024: `pkp/pkp-lib#10086` (`pkp/omp#1643`) moved the ONIX
  tool's own schema to Revision 2 (07cc317ac). Its second commit,
  90cd034ae, changed only the filter, adding the zero-rated percentage.
  The Native check still used the lenient copy.
- November 2024: dca0635 (`pkp/omp#1753`, `pkp/pkp-lib#10561`) replaced
  the ONIX tool's schema with Revision 8. It pointed the filter group's
  output type and `native.xsd` at that schema, which brought the rule to
  the Native export. The aim was one recent ONIX version for both
  exports.
- 3.4 and 3.3: the output type still names the lenient copy, but
  `pkp/pkp-lib#10560` (2024-10-25) replaced that copy with the 3.0.2
  schema.

Reach:

- The ONIX 3.0 tool's own export builds the same product with the same
  `Tax`. That was read in the code, not walked, because on a fresh
  install the tool failed for every book until pkp/omp#2372
  (2026-10-05; [U74 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a1), retired).
- "Taxation Rate" offers six codes. Only "Zero-rated (Z)" exports; the
  walk failed with "Standard rate (S)". "Higher rate (H)", "Tax paid at
  source (Italy) (P)", "Lower rate (R)" and "Super-low rate (T)" take
  the same path in the code.
- A market saved with no tax type can gain "GST (Sales tax) (02)"
  without the user choosing it, on its next edit. With no rate, that
  market then fails the export through this cause
  ([U74 A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A6-market-edit-fills-in-gst-tax-type.md)).
- A price type in the filter's tax-inclusive list (02, 04, 07, 09, 12,
  14, 17, 22, 24, 27, 34, 42) writes no `Tax`, so it exports. This was
  walked with "RRP including tax (02)".
- A product that fails its check is dropped silently at
  `if ($onixDoc)`, and the export fails only because the schema errors
  leak out of the buffer. The team may want that drop to report an
  error of its own. That is separate from the fix below.

## Proposed fix

Write the `Tax` element only when the filter can complete it, which
today means a zero-rated market:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-tax-rate-fails-native-export/fix.diff).

```diff
-            if (!$excludeTaxNode && ($market->getTaxTypeCode() != '' || $market->getTaxRateCode() != '')) {
+            // ONIX requires a Tax composite to carry the rate as a percentage or the tax amount.
+            // A market stores neither, so only a zero-rated market (0%) can state its tax.
+            if (!$excludeTaxNode && $market->getTaxRateCode() == 'Z') {
```

The invalid element is written in this filter, and it is the only code
that writes `Tax`. Both the ONIX tool and the Native export call
`createProductNode()`, so one condition fixes both. It keeps the intent
of `pkp/pkp-lib#10086` and `#10561`: valid ONIX on a current schema,
with the zero-rated percentage.

Tried on `main`: the three exports of the Steps completed. Two cases
the fix must leave alone gave the same files with the fix and without
it:

- a zero-rated VAT market keeps its `Tax`;
- a tax-inclusive price type writes no `Tax`.

**Alternatives**:

- Give the market window the fields ONIX needs: a tax percentage, and
  perhaps the taxable and tax amounts, as `pkp/pkp-lib#10105` asks. That
  is the complete answer, but it needs new `markets` columns, a
  migration, the form, the filter and the Native import, plus a product
  decision on the fields.
- Write a `TaxRatePercent` guessed from the rate code. No percentage
  follows from "Standard rate"; it differs by country.
- Check the product against a lenient copy of ONIX again. That would
  mean reverting the filter group's output type, the `I10561_OnixFilter`
  migration and the `native.xsd` import. It would hide invalid ONIX in
  the file, against the aim of `pkp/pkp-lib#10561`.

**What goes with it**:

- The file states no tax for markets other than zero-rated ones. A
  Native import reads `TaxType` and `TaxRateCode` back from the price
  (`NativeXmlPublicationFormatFilter`), so such a book loses those two
  codes when moved.
- A separate concern, not part of this fix: the schema describes `Tax`
  as "Details of the type and amount of tax included within a Price
  amount", yet the filter writes `Tax` only for price types that
  exclude tax.
- Backport: the same condition is on 3.5 (line 895), 3.4 (line 835) and
  3.3 (line 808, in `MonographONIX30XmlFilter.inc.php`). The diff
  applies with only the line numbers (and, on 3.3, the file name)
  changed.
- Guard: a new case in
  `plugins/importexport/onix30/tests/MonographONIX30XmlFilterTest.php`,
  which today stubs no markets. It would build a market at each rate
  code and a type alone, and validate the product against the ONIX
  schema.

Small: one condition in one filter and a unit test, with no stored data
to repair.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-tax-rate-fails-native-export/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-tax-rate-fails-native-export/lib.js).
  It takes the Steps and the control on an install loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/market-tax-rate-fails-native-export/walk.js`.
  `MODE=batch` runs the two-book export, and `MODE=neighbour` the cases
  the fix must leave alone.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02); the two-book export was walked on `main` only. No
  request failed and no page script failed. Tips: OMP `main` 3b0ecf794
  (2026-09-29), its pkp-lib 3dc90c81a6. OMP `stable-3_5_0` 9c5e24246
  (2026-10-01), its pkp-lib cf3f984335.
- Fix tried on `main` with `bin/try-fix.js`, then reverted.
- Introduced: blame on line 916 gives 90cd034ae (`pkp/omp#1643`,
  2024-07-16). The check that fails is the `monograph=>onix30-xml`
  output type. At dca0635^ it named the lenient `notstrict` copy; dca0635
  set it to the onix30 schema (Revision 8, which has the `Tax` choice).
  The onix30 schema was Revision 2 from 07cc317ac.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp. Read on
  each:
  - the filter's condition;
  - `native/filter/filterConfig.xml`'s output type, which names the
    `notstrict` copy;
  - that copy's `Tax`, which 9592d8416 and 6d5c33071 gave the required
    choice;
  - `PublicationFormatNativeXmlFilter`'s check and embedding of the
    product.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words and the class names. Only `pkp/pkp-lib#10105`
  matches; `#10086`, `#10560` and `#10561` were read as the history.
- Unverified: MySQL not checked; the fault does not depend on the
  database.
