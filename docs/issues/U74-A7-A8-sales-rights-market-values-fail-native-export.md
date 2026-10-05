# Sales rights, markets, page counts and sizes save with no territory or a value that is not a number above 0, and the book's Native XML export fails

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; present since the windows were written, [5e0d3c7](https://github.com/pkp/omp/commit/5e0d3c7ff97d3a777956ec3368f72d1694a170b6) · 2012-01-29 (the market window) and [c0c611a](https://github.com/pkp/omp/commit/c0c611aea59e581a16d7c12a2cefcf9c3ad918e9) · 2012-01-17 (the sales-rights window), [77e0e86](https://github.com/pkp/omp/commit/77e0e86b0aa1564daa2e1c989fcaa091683618d7) · 2012-01-02 and [47eeca3](https://github.com/pkp/omp/commit/47eeca316b08ac6536114d0cd289cfe06ad982c9) · 2012-01-11 (the sizes and page counts of the "Metadata" tab), all Jason Nugent (jnugent)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a7), [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a8); spec U73 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a17)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor records a book format's trade data on its "Metadata"
tab. Three of its parts save values the book's ONIX data cannot hold:

- The "Sales Rights" window saves an entry with no country and no
  region while "Rest of World?" is unticked.
- The "Market Territories" window saves a market with no country or
  region. Separately, it saves a "Price" such as "ten", "12,50" or 0.
- The tab saves "Front Matter" and "Back Matter" page counts such as
  "xii", and a "Height", "Width", "Thickness" or "Weight" such as
  "tall", "12,5", 0 or -3.

ONIX needs a territory on every sales right and market, and a price,
page count or size written as a number greater than 0, with a decimal
point rather than a comma. So a price or size of 0, and "12,50", fail
like "ten".

Exporting the book from Tools › "Native XML Plugin" then ends in "The
process failed. Check below for errors/warnings." with a schema message
such as "Element '{http://ns.editeur.org/onix/3.0/reference}Market':
Missing child element(s)." or "… 'xii' is not a valid value of the
atomic type …", naming neither the book nor the format. When several
books are ticked, the export fails for all of them and no file comes
out.

The market window also saves a "Date" such as "abc" whatever "Date
Format" says. That does not fail the export, but the file carries the
date as typed, under a format code it does not match.

The proposed fix adds input checks only. Books that already hold such
values keep failing the export until an editor corrects each value by
hand.

## Impact

- **Lost**: the Native XML file, used for backups and for moving books
  between installs.
- **Who**: press managers and editors who fill in sales rights,
  markets, or a printed format's page counts and sizes. A blank
  territory, a decimal comma, or front matter counted in roman numerals
  ("xii") is an easy slip.
- **Way round**: export the books one at a time to find the one that
  fails, find the value on each format's "Metadata" tab, give it a
  country or region or a plain number, and export again.

Medium: a secondary task fails for the affected books, and there is a
way round on screen, though slow on a press with many books.

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

A page count or size that is not a number:

12. On the book's "Publication Formats", press "Add publication
    format". Type Paperback u73d in "Name", choose "Paperback / softback
    (BC)" in "Publication Format", tick "Physical format" and press
    "OK". (The book's only format, "PDF", is digital, and the export
    writes sizes only for a physical format.)
13. On "Paperback u73d", press the arrow, then "Edit", and open the
    "Metadata" tab. Choose "Single-component retail product (00)" in
    "Product Composition". Type xii in "Front Matter", abc in "Back
    Matter", tall in "Height", wide in "Width", thick in "Thickness" and
    heavy in "Weight". Press "Save".
14. Export the book as in step 4.

**Expected**: steps 3, 6, 8, 10 and 13 are refused and nothing is
saved: the entry needs a country or region (or "Rest of World?"), the
market needs a country or region, the price must be a number, the date
must be eight digits as "YYYYMMDD" says, as the window's own message "A
date is required and the date value must match the chosen date format."
promises, a page count must be a whole number and a size a number above
0. The exports then complete.

**Observed**: each of steps 3, 6, 8, 10 and 13 saves. The windows say
"Sales Rights added.", "Market added." or "Market edited.". In step 13
the "Edit" window closes on "Save"; opened again, its "Metadata" tab
shows xii, abc, tall, wide, thick and heavy in the six boxes. The
market's row shows
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

Step 14 fails like step 4. Under "Generic Items" the six lines below
appear twice, once for each of the book's two formats (see Cause), and
"Validation errors:" then lists the same twelve without "Line 0 Column
0:":

```
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}Measurement': 'tall' is not a valid value of the atomic type '{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'.
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}Measurement': 'wide' is not a valid value of the atomic type '{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'.
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}Measurement': 'thick' is not a valid value of the atomic type '{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'.
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}Measurement': 'heavy' is not a valid value of the atomic type '{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'.
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}ExtentValue': 'xii' is not a valid value of the atomic type '{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'.
Line 0 Column 0: Element '{http://ns.editeur.org/onix/3.0/reference}ExtentValue': 'abc' is not a valid value of the atomic type '{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'.
```

With 12, 3, 240, 160, 20 and 500 typed in the same boxes, the tab saves
and the export completes, the file carrying them as `<onix:Extent>` and
`<onix:Measure>` elements.

## Cause

`MarketForm::__construct()`
(`controllers/grid/catalogEntry/form/MarketForm.php`, lines 54–55)
checks "Date" and "Price" for presence only, with plain
`FormValidator` checks. Nothing checks that the date matches the chosen
"Date Format", that the price is a number, or that a country or region
is included. `SalesRightsForm::__construct()` (same folder, lines
52–69) checks the type and the one "Rest of World?" entry per format,
but not the territory. `PublicationFormatMetadataForm::__construct()`
(same folder, lines 93–97), the "Metadata" tab's own form, checks
"Product Availability", "Product Composition" and a `directSalesPrice`
the tab no longer shows (line 94). "Front Matter", "Back Matter",
"Height", "Width", "Thickness" and "Weight" have no check. The three
`execute()` methods store what was posted.

These values go straight into the format's ONIX product.
`MonographONIX30XmlFilter::createProductNode()`
(`plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`)
always writes a sales-rights `Territory`, even an empty one (lines
670–671). It leaves out a market's empty `Territory` (line 782), which
leaves `Market` without its required child. It writes the price as
`PriceAmount` (line 914) and the date as `Date` (line 821), as stored.
It writes each page count as an `ExtentValue` when it compares above 0
(lines 456–467; under PHP 8 a word such as "xii" compares above 0 as
text), and for a physical format each non-empty size as a `Measurement`
(lines 247–272). ONIX requires a `Territory` to hold
`CountriesIncluded` or `RegionsIncluded`, and a `PriceAmount`, an
`ExtentValue` and a `Measurement` each to be a decimal greater than
zero (`dt.StrictPositiveDecimal`). `Date` is any non-empty text to the
schema, so a malformed date passes.

The Native export checks that product before using it. When the six
press settings are set
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
- `createRepresentationNode()` runs the filter on the whole book (line
  65) once for each of the book's formats. So one bad value drops the
  ONIX product of every format of the book, not only its own, and its
  schema errors are logged once per format: twice in step 14, where
  the book has "PDF" and "Paperback u73d".
- The schema errors stay in libxml's buffer.
  `PKPImportExportDeployment::export()` collects them as
  `xmlValidationErrors` and reports them under "Generic Items" as "Line
  0 Column 0", with nothing naming the book or format, and the export
  is marked failed.

All the books ticked in one export run through one deployment and
share that buffer, so one bad value fails them all (walked with
submissions 4 and 14 ticked).

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
missing territory failed the export before that too. `ExtentValue` and
`Measurement` were decimals there (`dt.Decimal`), so a word as a page
count or size failed before too, while 0 and a negative size passed.

Reach:

- A market whose only territory is an excluded country also fails the
  export, with the same `Market` message (walked).
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
  (code). Its export works on a fresh `main` install since
  pkp/omp#2372 (2026-10-05; [U74 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a1), retired).
- On the tab, "12abc" as a page count fails the export too, and a size
  of 0 or -3 fails with "[facet 'minExclusive'] The value '0' must be
  greater than '0'". A page count of 0 is left out of the product and
  passes (walked).
- A word typed as a size on a digital format is stored but not
  written, so the export completes (walked on "PDF"). The tab offers
  the size boxes on every format
  ([U73 A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U73-A6-digital-format-metadata-tab-asks-physical-details.md)),
  and the word fails the export once the format's "Physical format"
  box is ticked (code).

## Proposed fix

Check in the three forms what the ONIX product will need:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sales-rights-market-values-fail-native-export/fix.diff)
(`MarketForm.php`, `SalesRightsForm.php`,
`PublicationFormatMetadataForm.php`, `locale/en/locale.po`).

- `MarketForm` "Date": `PublicationDateForm`'s `FormValidatorCustom`,
  widened so that each letter of the format stands for a digit rather
  than any character ("abc" and "abcdefgh" are refused under
  "YYYYMMDD"). A time format may end in "Z" or an hhmm offset, as ONIX
  allows, and a "Text string" format takes any text, as before.
- `MarketForm` "Price": a `FormValidatorCustom` taking digits with an
  optional decimal point, plus a new rule that the price is above 0,
  under the existing "A valid price is required.". The pattern is the
  one in `PublicationFormatMetadataForm`'s check on `directSalesPrice`,
  a field the "Metadata" tab no longer shows.
- `MarketForm` "Discount percentage": a new optional check for a number
  from 0 to 100.
- `MarketForm` and `SalesRightsForm`: override `validate()`, as `NavigationMenuForm` and
  `AddLanguageForm` do for checks across fields, and add an error when
  no country and no region is included. The sales-rights form skips
  this when "Rest of World?" is ticked.
- `PublicationFormatMetadataForm` "Front Matter" and "Back Matter": an
  optional `FormValidatorRegExp` for a whole number, the class the form
  already uses on `directSalesPrice`, with "A page count must be a
  whole number, such as 12.". 0 stays allowed, since the filter leaves
  a page count of 0 out. "Height", "Width", "Thickness", "Weight" and
  "File Size in Mbytes": the price check above, optional, with "A size,
  weight or file size must be a number greater than 0, such as 228.6.".
  The tab does not show the file size today (U73 A6); the check covers
  it once it does.
- The size checks run on every format, though the filter writes sizes
  only for a physical one. That is intended: on
  today's tab, which shows the size boxes on every format, a digital
  format already holding a word as a size is refused at its next save
  until the box is cleared, and the word is wrong data that reaches the
  export as soon as "Physical format" is ticked. The fix for
  [U73 A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U73-A6-digital-format-metadata-tab-asks-physical-details.md)
  (pkp-e2e#796) stops showing the physical groups on a digital format;
  their boxes are then not posted, the optional checks skip them, and
  that refusal no longer arises.

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

These two windows and the tab are the only places a press enters these values. A
Native XML import cannot bring bad values in either, because the import
is checked against the same schema. So one fix covers the Native
export, the ONIX tool and any later reader.

Tried on `main`: steps 3, 6, 8 and 10 were each refused, with nothing
saved, and every export completed; "12,50", 0 and "abcdefgh" were
refused too. Valid entries saved and exported the same with the fix in
and out: a "Rest of World?" entry with no country, an entry and a
market with a region alone, 20261001 under the default "YYYYMMDD (H)",
2026 under "YYYY", 20261001T1230Z under "YYYYMMDDThhmm", the price 12.50
and the discount 10. On the tab, step 13 was refused, and so were
"12abc", "12,5", 0 and -3, with nothing saved and the export
completing; 12, an empty "Back Matter", 228.6, 152.4, 20 and 500 saved
and exported the same with the fix in and out, and the "PDF" format's
tab still saved with empty sizes ("tall" typed there was refused).

**Alternatives**:

- Make the filter leave out an entry or market it cannot write, and
  clear the schema errors. Today the product is already dropped
  silently, and only the leftover errors fail the export; with them
  cleared the export would complete, and the trade would silently lose
  a sales right or a market the press believes it sent.
- Check the values only at export time and name the book and format.
  This helps the editor find the entry, but the windows would still
  take values that can never be exported.
- Write a front-matter count in roman numerals as ONIX's
  `ExtentValueRoman`. It would serve presses that count front matter
  that way, but every other word would still fail; it can follow as a
  feature.

**What goes with it**:

- Free books: a price of 0 never exports today, and the fix refuses it
  in the window with "A valid price is required.". The team needs to
  decide how a free book is recorded, for example 0 written as
  `UnpricedItemType` "Free of charge (01)". That is a follow-up; the
  fix does not depend on it.
- A refusal in these windows and on the tab shows the way any refusal
  does there today. The window stays open with a second "Required fields are
  marked with an asterisk: *" line, and the reason is shown only as a
  notice once the next page loads. The fix for
  [U09 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A11-static-page-refusal-repeated-after-save.md)
  shows the reason at once.
- The price check replaces the key `grid.catalogEntry.priceRequired`,
  which no locale file defines, so an empty price no longer shows
  "##grid.catalogEntry.priceRequired##".
- Stored values: the fix adds input checks only, and proposes no
  repair and no export-side tolerance. A book that already holds a bad
  value keeps failing the export until an editor corrects it. The
  window or tab refuses the old value at its next save, so the editor
  meets it there, but nothing points them to it. A script cannot
  repair it, since a word or a missing territory cannot be turned into
  what the press meant; tolerance at export is the first alternative
  above, which drops the value silently.
- Backport: the same forms are on 3.5, 3.4 and 3.3 (on 3.3 as
  `MarketForm.inc.php`, `SalesRightsForm.inc.php` and
  `PublicationFormatMetadataForm.inc.php`, with unqualified validator
  class names). The diff applies to 3.5 as it stands, and to the older
  lines with those names changed.
- Guard: in this repository, a U74 scenario that saves a market and a
  sales-rights entry without a territory, and a price of "ten", and
  expects each refused, and a U73 one that saves "xii" and "tall" on
  the tab and expects the refusal (Planned items). In OMP, a unit test
  of the two forms' `validate()`, the date check and the tab's number
  checks.

Medium: about seventy lines in three forms of one folder, four new
strings and a unit test across the forms. The date and territory
checks are new; the price, page-count and size checks reuse an
existing pattern. No data repair is counted, since none is possible.

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
- Kept script for steps 12–14: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/page-counts-dimensions-fail-native-export/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/page-counts-dimensions-fail-native-export/lib.js):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/page-counts-dimensions-fail-native-export/walk.js`.
  It takes the preconditions and steps 12–14 on a freshly loaded
  dataset, without steps 1–11, then the numbers as the control.
  `MODE=reach` runs a page count of 0, "12abc", and the sizes "12,5", 0
  and -3, then the word on "PDF", and `MODE=neighbour` the values the
  fix must still save.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02) for steps 1–11 and 566bb1f (2026-10-03) for steps 12–14;
  `main` and 3.5 gave the same results. Tips: OMP `main` 3b0ecf794
  (2026-09-29), its pkp-lib 3dc90c81a6. OMP `stable-3_5_0` 9c5e24246
  (2026-10-01), its pkp-lib cf3f984335. The reach and triage checks were
  walked on `main` only. Each failed export answered 200.
- Fix tried on `main` with `node bin/try-fix.js apply …/fix.diff omp`,
  then reverted. The `PublicationFormatMetadataForm` part was tried
  with the whole diff applied, on steps 12–14 and the tab's reach and
  neighbour checks.
- Introduced: blame on `MarketForm.php` lines 54–55 and
  `SalesRightsForm.php` lines 52–69 gives 86f2daa114 and 01088072a8
  (2021 namespacing and reformatting). The `addCheck()` lines are the
  ones 5e0d3c7 wrote when it created `MarketForm.inc.php` and c0c611a
  when it created `SalesRightsForm.inc.php` (read at those commits),
  both by Jason Nugent (jnugent); GitHub lists no PR for either. At
  dca0635^ the `monograph=>onix30-xml` output type named
  `native/ONIX_BookProduct_3.0_reference_notstrict.xsd`, whose
  `PriceAmount` was `dt.NonEmptyString` and whose `ExtentValue` and
  `Measurement` were `dt.Decimal`.
- Introduced, the tab: blame on `PublicationFormatMetadataForm.php`
  lines 93–97 gives d002b418ed (`pkp/pkp-lib#10365`, 2024, imports and
  reformatting). Followed back with `git log --follow`, the form began
  as `controllers/tab/catalogEntry/form/CatalogEntryPublicationMetadataForm.inc.php`
  (f9cc512, 2011-12-29) with no checks. 77e0e86 (2012-01-02) added
  `height`, `width`, `thickness` and `weight` to its `readInputData()`
  and 47eeca3 (2012-01-11) `frontMatter` and `backMatter`, both by Jason
  Nugent (jnugent), with no check; GitHub lists no PR for either.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp. Read on
  each: the two forms' checks (the same as `main`), the filter's
  `Territory` and `PriceAmount` writing (3.3 also writes a market's
  empty `Territory`, so it fails on `Territory` rather than `Market`),
  and the filter group's output type, which names
  `native/ONIX_BookProduct_3.0_reference_notstrict.xsd` there. 9592d84
  and 6d5c330 (`pkp/omp#1742`, `#1741`, `pkp/pkp-lib#10560`,
  2024-10-25) kept that file name and replaced its content with the
  3.0.2 schema, where `PriceAmount` is `dt.Decimal`: "ten" fails, a negative
  price passes. Also read on each, and on 3.5
  (`checkouts/stable-3_5_0/omp`, the same as `main`):
  `PublicationFormatMetadataForm`'s checks (the same two), the tab's
  `physicalPublicationFormat.tpl` (the six boxes), and the filter's
  `ExtentValue` and `Measurement` writing (the same conditions). Both
  are `dt.Decimal` in the 3.4 and 3.3 schema, so a word fails and 0 or
  a negative size passes there.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words (sales rights territory, market territory,
  ONIX price validation, the schema message) and by `MarketForm` and
  `SalesRightsForm`. `pkp/pkp-lib#10105` (market tax fields) and
  `pkp/pkp-lib#6610` (showing ONIX export errors) are about other faults.
  For the tab, searched by page count, front matter, dimensions, height
  and width with ONIX, `StrictPositiveDecimal`, `ExtentValue` and
  `PublicationFormatMetadataForm`: `pkp/pkp-lib#9602` (more ONIX extent
  types, wrong extent type codes) is about another fault.
- Unverified, the tab: on 3.3 under PHP 7, a word compares as 0, so
  the filter would leave a worded page count out rather than fail
  (code reasoning, not run).
- Unverified: MySQL not checked; the fault does not depend on the
  database. What a trade recipient does with a malformed `Date` was not
  checked.
