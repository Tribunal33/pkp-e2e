# Editing a book's market fills in "GST (Sales tax)" as its tax type, and "OK" saves it unasked

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; present since [75d161d](https://github.com/pkp/omp/commit/75d161dc1ab6d3f322cafa881f4cd6abcf536d83) · 2012-01-20 · Jason Nugent (jnugent), carried into the market window by [5e0d3c7](https://github.com/pkp/omp/commit/5e0d3c7ff97d3a777956ec3368f72d1694a170b6) (2012-01-29)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a6)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor saves a book's market with "Taxation Type" left empty.
When they later open the market's "Edit" window, "Taxation Type" shows
"GST (Sales tax) (02)". Pressing "OK" to change anything else, such as
the price, also saves GST as the market's tax type. They expect the
window to reopen on what they saved, with the tax type still empty.

Nothing tells them the tax type changed. If the market has no "Taxation
Rate", the book's Native XML export then fails with "The process
failed. Check below for errors/warnings." If its "Taxation Rate" is
"Zero-rated (Z)", the export states GST, a tax the press never chose.

## Impact

- **Lost**: the market's empty tax type, overwritten with GST.
- **Who**: a press manager or editor who edits a book's market in a
  publication format's "Metadata" tab. "Add Market" opens with
  "Taxation Type" empty, so any market saved without touching that list
  is exposed.
- **Way round**: choose the empty "Taxation Type" again before each
  "OK".

Medium: an edit stores a value nobody chose, without a word, and that
value breaks or misstates the book's export. There is a way round on
screen once the press knows to look.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`.
- Sign in as `dbarnes`.
- A Native XML file carries a format's ONIX data, including its
  markets, only when six press settings are set. The dataset already
  sets two of them, the principal contact's name and email. Set the
  four "Publisher Identity" details it leaves blank: on Settings ›
  Press › "Masthead", type "Public Knowledge Press" in "Press Publisher
  Name" and "Vancouver" in "Geographical Location", choose "Proprietary
  (01)" in "Publisher Code Type", type "PKP-01" in "Publisher Code", and
  press "Save".

Steps:

1. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture" (in Production), and choose "Publication Formats"
   in its side menu. On the format "PDF", press the arrow, then "Edit",
   and open the "Metadata" tab.
2. Under "Market Territories", press "Add Market". Type 20261001 in
   "Date", choose "Canada (CA)" under "Countries" in "Included", and type
   25 in "Price". Leave "Price Type", "Taxation Rate" and "Taxation
   Type" empty. Press "OK": "Market added."
3. Go to Tools › "Import/Export" › "Native XML Plugin", open "Export",
   tick the book and press "Export Submissions". The export completes.
4. Back on the format's "Metadata" tab, press the market's arrow, then
   "Edit".
5. Replace the price with 30 and press "OK": "Market edited."
6. Export the book again as in step 3.

**Expected**: in step 4 the "Edit" window shows "Taxation Type" empty,
as saved. In step 6 the export completes, as in step 3.

**Observed**: in step 4 the "Edit" window shows "GST (Sales tax) (02)"
chosen in "Taxation Type" ("Price Type" and "Taxation Rate" are empty,
as saved). Step 5 stores GST with the new price. Step 6 ends with "The
process failed. Check below for errors/warnings." and:

```
Element '{http://ns.editeur.org/onix/3.0/reference}Tax': Missing child element(s). Expected is ( {http://ns.editeur.org/onix/3.0/reference}TaxAmount ).
```

Control: a market saved with "VAT (Value-added tax) (01)" reopens on
VAT, and "Add Market" opens with "Taxation Type" empty.

## Cause

`MarketForm::fetch()` (`controllers/grid/catalogEntry/form/MarketForm.php`,
line 207) assigns the template's `taxTypeCode` for an existing market
as follows:

```php
'taxTypeCode' => $market->getTaxTypeCode() != '' ? $market->getTaxTypeCode() : '02',
```

So a market stored with no tax type is shown with `02`, "GST (Sales
tax)". The list has an empty choice and the field is optional, so an
empty tax type is a valid saved state, not a missing value.
`MarketForm::execute()` saves whatever the list posts, so the next "OK"
stores `02`. The new-market branch of the same method sets no tax type,
which is why "Add Market" opens empty.

Reach:

- The book's Native XML export, reproduced in the browser. After such
  an edit of a market with no "Taxation Rate", the export fails.
  `MonographONIX30XmlFilter::createProductNode()`
  (`plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`,
  lines 916–931) writes a `Tax` with the type alone, and ONIX refuses
  it ([U74 A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A17-market-tax-rate-fails-native-export.md)).
- Other cases, read in the code only:
  - With "Taxation Rate" "Zero-rated (Z)", the file states `TaxType` 02.
  - With a tax-inclusive "Price Type", no `Tax` is written, so nothing
    shows.
- The ONIX 3.0 tool's own export, read in the code only. It builds the
  same product and so carries the same GST. Its export works on a fresh
  `main` install since pkp/omp#2372 (2026-10-05;
  [U74 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a1), retired).
- Other fallbacks, read in the code only. The same method falls back to
  "CAD" for an empty stored currency (line 205). That list has no empty
  choice and "Price" is required, so a saved market always has a
  currency. The fallbacks in `PublicationFormatMetadataForm::fetch()`
  (units, country of manufacture, availability, returnable, technical
  protection) are also on lists without an empty choice. None of them
  overrides a choice the user made.
- Stored data: markets edited since 2012 may hold a GST nobody chose.
  They cannot be told apart from a GST chosen on purpose, so no repair
  is proposed.

## Proposed fix

Show the stored tax type as it is:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-edit-fills-in-gst-tax-type/fix.diff).

```diff
-                'taxTypeCode' => $market->getTaxTypeCode() != '' ? $market->getTaxTypeCode() : '02',
+                'taxTypeCode' => $market->getTaxTypeCode(),
```

This brings the line in line with `taxRateCode`, the line above, and
with the new-market branch, neither of which assigns a fallback.

Tried on `main`: the "Edit" window reopened with "Taxation Type" empty,
"OK" stored the new price with no tax type, and the export completed.
The cases the fix must leave alone behaved the same with the fix and
without it: a VAT market reopened on VAT, and "Add Market" opened empty.

**Alternatives**:

- Keep GST as a default for new markets only. That would put a
  country-specific tax on every press's markets, and with no rate it
  fails the export (U74 A17).

**What goes with it**:

- Two fixes are needed for the export:
  - This fix stops an edit from saving GST that nobody chose.
  - A17's fix lets a market with a tax type and no rate export,
    whether the type was chosen or left over from this fallback.
- Backport: the line is identical on 3.5 and 3.4 (line 207) and on 3.3
  (`MarketForm.inc.php`, line 171).
- Guard: an end-to-end check that opens a market's "Edit" window and
  asserts "Taxation Type" as saved.

Small: one line in one form, with no data to repair.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-edit-fills-in-gst-tax-type/walk.js),
  with its helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-tax-rate-fails-native-export/lib.js).
  It takes the Steps on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/market-edit-fills-in-gst-tax-type/walk.js`.
  The stored tax type was empty after step 2 and `02` after step 5.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02). No request failed and no page script failed. Tips: OMP
  `main` 3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6. OMP
  `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib cf3f984335.
- Fix tried on `main` with `bin/try-fix.js`, then reverted.
- Introduced: blame on line 207 gives 01088072a (2021, a reformat).
  5e0d3c7 created the market form with this line. 75d161d had put the
  `'taxTypeCode', '02'; // GST` default into the existing-format branch
  of `CatalogEntryPublicationMetadataForm::fetch()`. GitHub lists no PR
  for 75d161d.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp. Read
  on each: the fallback line and the template's "Taxation Type" list.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words and the class name. Nothing matched this
  fallback.
- Unverified: MySQL not checked; the fault does not depend on the
  database.
