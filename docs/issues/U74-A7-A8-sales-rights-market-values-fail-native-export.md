# Sales rights and markets save with no territory or a price like "ten", and the book's Native XML export fails

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; present since the windows were written, [5e0d3c7](https://github.com/pkp/omp/commit/5e0d3c7ff97d3a777956ec3368f72d1694a170b6) · 2012-01-29 (the market window) and [c0c611a](https://github.com/pkp/omp/commit/c0c611aea59e581a16d7c12a2cefcf9c3ad918e9) · 2012-01-17 (the sales-rights window), both Jason Nugent (jnugent)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a7), [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a8)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor records a book format's trade data on its "Metadata"
tab. The "Sales Rights" window saves an entry with no country and no
region while "Rest of World?" is unticked. The "Market Territories"
window saves a market with no country or region, a "Price" such as
"ten" or "12,50", and a "Date" such as "abc" whatever "Date Format"
says. Each save says "Sales Rights added." or "Market added.", and
nothing warns the editor.

Exporting the book from Tools › "Native XML Plugin" then ends in "The
process failed. Check below for errors/warnings." with a schema message
such as "Element '{http://ns.editeur.org/onix/3.0/reference}Market':
Missing child element(s).". The message names neither the book nor the
publication format. When several books are ticked, the export fails
for all of them and no file comes out. A date that does not match its
format does not fail the export: it goes into the file as typed.

Presses may already hold such entries, since the windows have taken
them since 2012. Those books fail the export until each entry is
edited.

## Impact

- **Lost**: the Native XML file, used for backups and for moving books
  between installs.
- **Who**: press managers and editors who fill in sales rights or
  markets. A blank territory, or a price with a decimal comma, is an
  easy slip.
- **Way round**: export the books one at a time to find the one that
  fails, find its entry on each format's "Metadata" tab, give it a
  country or region or a plain number as the price, and export again.

Medium: a secondary task fails for the affected books, and there is a
way round on screen, though slow on a press with many books. It would
be high if the Native XML export were the only way to move a press's
books.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`.
- Sign in as `dbarnes`.
- A Native XML file carries a format's ONIX data only when six press
  settings are set: the principal contact's name and email, which the
  dataset sets, and the four "Publisher Identity" details, which it
  leaves blank. On Settings › Press › "Masthead", group "Publisher
  Identity", type "Public Knowledge Press" in "Press Publisher Name" and
  "Vancouver" in "Geographical Location", choose "Proprietary (01)" in
  "Publisher Code Type", type "PKP-01" in "Publisher Code", and press
  "Save".

A sales-rights entry with no territory:

1. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture" (in Production), and choose "Publication Formats"
   in its side menu.
2. On the format "PDF", press the arrow, then "Edit". Open the
   "Metadata" tab.
3. Under "Sales Rights", press "Add Sales Rights". Keep the type the
   window opens on, "For sale with exclusive rights in the specified
   countries or territories (01)". Leave "Rest of World?" unticked and
   choose nothing under "Countries" or "Regions". Press "OK".
4. Go to Tools › "Import/Export" › "Native XML Plugin" and open the
   "Export" tab. Tick "How Canadians Communicate: Contexts of Canadian
   Popular Culture" and press "Export Submissions".
5. Back on the format's "Metadata" tab, press the entry's arrow, then
   "Delete", then "OK".

A market with no territory:

6. Under "Market Territories", press "Add Market". Type 20261001 in
   "Date" and 25 in "Price", and choose nothing under "Countries" or
   "Regions". Press "OK".
7. Export the book as in step 4.

A price that is not a number:

8. On the "Metadata" tab, press the market's arrow, then "Edit".
   Choose "Canada (CA)" under "Countries" in "Included" and type ten in
   "Price". Choose the empty choice in "Taxation Type" (the edit window
   fills in "GST (Sales tax) (02)", a separate fault that fails the
   export on its own). Press "OK".
9. Export the book as in step 4.

A date that does not match its format:

10. Press the market's arrow, then "Edit". Type 25 in "Price" and abc in
    "Date", choose "YYYYMMDD" in "Date Format" and the empty choice in
    "Taxation Type". Press "OK".
11. Export the book as in step 4, and press "Download Exported File".

**Expected**: steps 3, 6, 8 and 10 are refused and nothing is saved:
the entry needs a country or region (or "Rest of World?"), the market
needs a country or region, the price must be a number, and the date
must be eight digits as "YYYYMMDD" says, as the window's own message "A
date is required and the date value must match the chosen date format."
promises. The exports then complete.

**Observed**: each of steps 3, 6, 8 and 10 saves, with "Sales Rights
added.", "Market added." or "Market edited.". The market's row shows
"Included: , Excluded:" after step 6 and the price "tenCAD" after step
8. The export in step 4 ends in the tab "Export Submissions Results":

```
The process failed. Check below for errors/warnings.
Errors occured:
Generic Items
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}Territory': Missing child element(s). Expected is one of ( {http://ns.editeur.org/onix/3.0/reference}CountriesIncluded, {http://ns.editeur.org/onix/3.0/reference}RegionsIncluded ).
Validation errors:
Element '{http://ns.editeur.org/onix/3.0/reference}Territory': Missing child element(s). Expected is one of ( … ).
```

Steps 7 and 9 end the same way, with:

```
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}Market': Missing child element(s). Expected is ( {http://ns.editeur.org/onix/3.0/reference}Territory ).
```

```
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}PriceAmount': 'ten' is not a valid value of the atomic type '{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'.
```

Step 11 reads "The export completed successfully.", and the file's
market date is
`<onix:MarketDate><onix:MarketDateRole>01</onix:MarketDateRole><onix:DateFormat>00</onix:DateFormat><onix:Date>abc</onix:Date></onix:MarketDate>`.
## Cause

`MarketForm::__construct()`
(`controllers/grid/catalogEntry/form/MarketForm.php`, lines 54–55)
checks "Date" and "Price" for presence only, with plain
`FormValidator` checks. Nothing checks that the date matches the chosen
"Date Format", that the price is a number, or that a country or region
is included. `SalesRightsForm::__construct()` (same folder, lines
52–69) checks the type and the one "Rest of World?" entry per format,
but not the territory. Both `execute()` methods store what was posted.

These values go straight into the format's ONIX product.
`MonographONIX30XmlFilter::createProductNode()`
(`plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`)
always writes a sales-rights `Territory`, even an empty one (lines
670–671). It leaves out a market's empty `Territory` (line 782), which
leaves `Market` without its required child. It writes the price as
`PriceAmount` (line 914) and the date as `Date` (line 821), as stored.
ONIX requires a `Territory` to hold `CountriesIncluded` or
`RegionsIncluded`, and a `PriceAmount` to be a decimal greater than
zero. `Date` is any non-empty text to the schema, so a malformed date
passes.

The Native export checks that product before using it, as the
[U74 A17 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A17-market-tax-rate-fails-native-export.md)
describes for the market's tax. When the six press settings are set
(`PublicationFormatNativeXmlFilter.php` line 53),
`PublicationFormatNativeXmlFilter::createRepresentationNode()` runs the
`monograph=>onix30-xml` filter on the book:

- `Filter::execute()` checks the filter's output with
  `XMLTypeDescription::checkType()` against the group's output type,
  the ONIX schema (`plugins/importexport/native/filter/filterConfig.xml`
  lines 71–76, and the `I10561_OnixFilter` migration on upgraded
  installs).
- When the check fails, `execute()` logs `Filter output validation
  failed` (`lib/pkp/classes/filter/Filter.php` line 471) and returns
  null, and `if ($onixDoc)` leaves the format's product out without an
  error.
- The schema errors stay in libxml's buffer.
  `PKPImportExportDeployment::export()` collects them as
  `xmlValidationErrors` and reports them under "Generic Items" as "Line
  0 Column 0", with nothing naming the book or format, and the export
  is marked failed.

All the books ticked in one export run through one deployment and
share that buffer, so one bad entry fails them all.

The publication-date window already makes the check the market form
misses: `PublicationDateForm` checks the date against its format with a
`FormValidatorCustom` and the same message, though by length only. The
market form was written in 2012 with the message and without the check.

A non-numeric price has failed the Native export only since late 2024.
Before that, the check used `native/ONIX_BookProduct_3.0_reference_notstrict.xsd`,
a lenient copy of ONIX in which `PriceAmount` was any non-empty text.
dca0635 (`pkp/omp#1753`, `pkp/pkp-lib#10561`, November 2024) pointed
the filter group's output type at the current ONIX schema. The
`Territory` and `Market` rules were the same in the lenient copy, so a
missing territory failed the export before that too.

Reach:

- Both windows and all three values (walked). A market whose only
  territory is an excluded country also fails the export, with the same
  `Market` message (walked).
- A price with a decimal comma fails like "ten": "'12,50' is not a
  valid value of the atomic type … dt.StrictPositiveDecimal" (walked).
- With two books ticked (submissions 4 and 14) and the bad market on
  one, the export fails with the same lines, names neither book, and
  offers no file (walked).
- A price of 0 fails the export today ("[facet 'minExclusive'] The
  value '0' must be greater than '0'", walked). The filter always
  writes a `PriceAmount` and never ONIX's `UnpricedItemType`, so a
  press cannot state a free book in a market.
- "Discount percentage, if applicable" is not checked either. "ten"
  saves, and the export fails on `DiscountPercent` ("not a valid value
  of the atomic type … dt.PercentDecimal") (walked).
- `PublicationDateForm`'s length-only check lets "abcdefgh" through as
  a "YYYYMMDD" publication date (code). The widened check below could
  serve it too; it is left out of this fix.
- The ONIX 3.0 tool builds the same product with the same filter
  (code). On today's code that tool fails for every book anyway
  ([U74 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A1-onix-export-fails-every-book.md)).
- A sibling fault in another window: the format's "Metadata" tab takes
  any text as a page count or dimension, and the export fails on it
  ([U73 A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a17)).
  That is `PublicationFormatMetadataForm`, a different form with its
  own fix.

## Proposed fix

Check in the two forms what the ONIX product will need:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sales-rights-market-values-fail-native-export/fix.diff)
(`MarketForm.php`, `SalesRightsForm.php`, `locale/en/locale.po`).

- `MarketForm` "Date": `PublicationDateForm`'s `FormValidatorCustom`,
  widened so that each letter of the format stands for a digit rather
  than any character ("abc" and "abcdefgh" are refused under
  "YYYYMMDD"). A time format may end in "Z" or an hhmm offset, as ONIX
  allows, and a "Text string" format takes any text, as before.
- `MarketForm` "Price": a `FormValidatorCustom` taking digits with an
  optional decimal point, plus a new rule that the price is above 0,
  under the existing "A valid price is required.". The pattern is the
  one in `PublicationFormatMetadataForm`'s check on `directSalesPrice`,
  a field the "Metadata" tab no longer shows. The price check users
  meet today, in the approved-proof window (`ApprovedProofForm.php`
  line 52), uses a pattern of its own.
- `MarketForm` "Discount percentage": a new optional check for a number
  from 0 to 100.
- Both forms: override `validate()`, as `NavigationMenuForm` and
  `AddLanguageForm` do for checks across fields, and add an error when
  no country and no region is included. The sales-rights form skips
  this when "Rest of World?" is ticked.

```php
public function validate($callHooks = true)
{
    // ONIX requires a market's territory to include at least one country or region.
    if (!array_filter((array) $this->getData('countriesIncluded')) && !array_filter((array) $this->getData('regionsIncluded'))) {
        $this->addError('countriesIncluded', __('grid.catalogEntry.territoryRequired'));
    }
    return parent::validate($callHooks);
}
```

The check goes in the forms because they store the values. These two
windows are the only place a press enters markets and sales rights. A
Native XML import cannot bring bad values in either, because the import
is checked against the same schema. So one fix covers the Native
export, the ONIX tool and any later reader.

Tried on `main`: steps 3, 6, 8 and 10 were each refused, with nothing
saved, and every export completed; "12,50", 0 and "abcdefgh" were
refused too. Valid entries saved and exported the same with the fix in
and out: a "Rest of World?" entry with no country, an entry and a
market with a region alone, 20261001 under the default "YYYYMMDD (H)",
2026 under "YYYY", 20261001T1230Z under "YYYYMMDDThhmm", the price 12.50
and the discount 10.

**Alternatives**:

- Make the filter leave out an entry or market it cannot write, and
  clear the schema errors. Today the product is already dropped
  silently, and only the leftover errors fail the export; with them
  cleared the export would complete, and the trade would silently lose
  a sales right or a market the press believes it sent.
- Check the values only at export time and name the book and format.
  This helps the editor find the entry, but the windows would still
  take values that can never be exported.

**What goes with it**:

- Free books: a price of 0 never exports today, and the fix refuses it
  in the window with "A valid price is required.". The team needs to
  decide how a free book is recorded, for example 0 written as
  `UnpricedItemType` "Free of charge (01)". That is a follow-up; the
  fix does not depend on it.
- A refusal in these windows shows the way any refusal does there
  today. The window stays open with a second "Required fields are
  marked with an asterisk: *" line, and the reason is shown only as a
  notice once the next page loads. The fix for
  [U09 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A11-static-page-refusal-repeated-after-save.md)
  shows the reason at once.
- The price check replaces the key `grid.catalogEntry.priceRequired`,
  which no locale file defines, so an empty price no longer shows
  "##grid.catalogEntry.priceRequired##".
- Stored entries need no repair script: a bad value cannot be corrected
  automatically, and the editor meets the refusal on the entry's
  "Edit".
- Backport: the same forms are on 3.5, 3.4 and 3.3 (on 3.3 as
  `MarketForm.inc.php` and `SalesRightsForm.inc.php`, with unqualified
  validator class names). The diff applies to 3.5 as it stands, and to
  the older lines with those names changed.
- Guard: in this repository, a U74 scenario that saves a market and a
  sales-rights entry without a territory, and a price of "ten", and
  expects each refused (a Planned item). In OMP, a unit test of the two
  forms' `validate()` and the date check.

Small: about fifty lines in the two forms of one folder and two new
strings: the date and territory checks are new, the price check adds
the rule above 0 to an existing pattern.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sales-rights-market-values-fail-native-export/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sales-rights-market-values-fail-native-export/lib.js)
  (which uses the U74 A17 walk's
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-tax-rate-fails-native-export/lib.js)).
  It takes the Steps on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/sales-rights-market-values-fail-native-export/walk.js`.
  `MODE=reach` runs the excluded-country market and the discount,
  `MODE=triage` the "12,50" price, the price 0 in a two-book export and
  the "abcdefgh" date, and `MODE=neighbour` the valid entries the fix
  must still save.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02); both gave the same results. Tips: OMP `main` 3b0ecf794
  (2026-09-29), its pkp-lib 3dc90c81a6. OMP `stable-3_5_0` 9c5e24246
  (2026-10-01), its pkp-lib cf3f984335. The reach and triage checks were
  walked on `main` only. Each failed export answered 200.
- Fix tried on `main` with `node bin/try-fix.js apply …/fix.diff omp`,
  then reverted.
- Introduced: blame on `MarketForm.php` lines 54–55 and
  `SalesRightsForm.php` lines 52–69 gives 86f2daa114 and 01088072a8
  (2021 namespacing and reformatting). The `addCheck()` lines are the
  ones 5e0d3c7 wrote when it created `MarketForm.inc.php` and c0c611a
  when it created `SalesRightsForm.inc.php` (read at those commits),
  both by Jason Nugent (jnugent); GitHub lists no PR for either. At
  dca0635^ the `monograph=>onix30-xml` output type named
  `native/ONIX_BookProduct_3.0_reference_notstrict.xsd`, whose
  `PriceAmount` was `dt.NonEmptyString`.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp. Read on
  each: the two forms' checks (the same as `main`), the filter's
  `Territory` and `PriceAmount` writing (3.3 also writes a market's
  empty `Territory`, so it fails on `Territory` rather than `Market`),
  and the filter group's output type, which still names the `notstrict`
  copy. 9592d84 and 6d5c330 (`pkp/omp#1742`, `#1741`,
  `pkp/pkp-lib#10560`, 2024-10-25) replaced that copy with the 3.0.2
  schema, where `PriceAmount` is `dt.Decimal`: "ten" fails, a negative
  price passes.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words (sales rights territory, market territory,
  ONIX price validation, the schema message) and by `MarketForm` and
  `SalesRightsForm`. `pkp/pkp-lib#10105` (market tax fields) and
  `pkp/pkp-lib#6610` (showing ONIX export errors) are about other faults.
- Unverified: MySQL not checked; the fault does not depend on the
  database. What a trade recipient does with a malformed `Date` was not
  checked.
