# A book imported from a press's Native XML file loses every format's "Returnable Indicator" and "Product Availability"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; present since the import of a format's ONIX data was written, [2c06909](https://github.com/pkp/omp/commit/2c06909d05067deadcd289386a58604bfebd83fa) · 2013-12-03 · Jason Nugent (jnugent)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a18)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor exports a book from Tools › "Native XML Plugin" and
imports the file again, into the same press or another one. The file
carries each format's availability and returns condition, but the
import stores neither, and says "The import completed successfully.".

The imported format's "Metadata" tab then shows "Available (20)" and,
on a physical format, "Yes, returnable, full copies only (Y)", whatever
the original had (such as "In stock (21)" and "No, not returnable
(N)"). These are only the form's defaults: nothing is stored, and the
book's ONIX product calls the format available and states no returns
condition. An editor who opens the tab and presses "Save" stores those
defaults, so a book that was not returnable is then recorded as
returnable.

The editor can choose both again on each imported format's tab, if the
original values are still known.

## Impact

- **Lost**: every imported format's availability and returns condition,
  silently; a format that was out of stock or not returnable goes to
  the trade as available, and becomes "returnable" once its tab is
  saved.
- **Who**: press managers and editors who move or restore books with
  the Native XML Plugin, for every format with at least one market (the
  file carries the two values only inside a market's supply data).
- **Way round**: choose both again on each imported format's "Metadata"
  tab, one format at a time, from the original press's screens.

Medium: an export-and-import task gives a wrong result for two fields
of every such format, and the trade data built from it misleads; there
is a way round on screen while the original is at hand.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- Sign in as `dbarnes`.
- The dataset's formats are all digital, and "Returnable Indicator" is
  offered on a physical format only, so step 2 adds one.
- A Native XML file carries a format's ONIX product only when the
  press's contact name and email (the dataset has them) and its four
  "Publisher Identity" details (the dataset leaves them blank) are set.
  Step 1 sets them.

Steps:

1. Settings › Press › "Masthead" › "Publisher Identity": "Press
   Publisher Name" "Public Knowledge Press", "Geographical Location"
   "Vancouver", "Publisher Code Type" "Proprietary (01)", "Publisher
   Code" "PKP-01"; "Save".
2. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture" › "Publication Formats" › "Add publication format":
   name "Paperback u74ir8", "Paperback / softback (BC)", tick "This is a
   physical (non-digital) format."; "OK".
3. "Paperback u74ir8" › arrow › "Edit" › "Metadata" › "Market
   Territories" › "Add Market": "Countries Included" "Canada (CA)",
   "Date" "20261001", "Price" "25"; "OK".
4. On the same tab: "Product Composition" "Single-component retail
   product (00)" (required to save), "Product Availability" "In stock
   (21)", "Returnable Indicator" "No, not returnable (N)"; "Save".
5. Tools › "Import/Export" › "Native XML Plugin" › "Export": tick
   submission 4, "Export Submissions", "Download Exported File". The
   "Paperback u74ir8" product carries:

   ```xml
   <onix:ReturnsConditions><onix:ReturnsCodeType>02</onix:ReturnsCodeType><onix:ReturnsCode>N</onix:ReturnsCode></onix:ReturnsConditions>
   <onix:ProductAvailability>21</onix:ProductAvailability>
   ```

6. "Import": upload that file, "Import". The results read "The import
   completed successfully. The following items were imported:
   Submission "19" - "How Canadians Communicate: Contexts of Canadian
   Popular Culture"".
7. Open submission 19 › "Publication Formats" › "Paperback u74ir8" ›
   "Edit" › "Metadata".
8. Export submission 19 as in step 5, ticking submission 19 (the list
   shows the title twice).

**Expected**: "Product Availability" "In stock (21)" and "Returnable
Indicator" "No, not returnable (N)", as exported; the new file carries
them again.

**Observed**: "Product Availability" "Available (20)" and "Returnable
Indicator" "Yes, returnable, full copies only (Y)", the tab's defaults
for a format with nothing stored. The file of step 8 has
`<onix:ProductAvailability>20</onix:ProductAvailability>` and no
`ReturnsConditions` for the format.

## Cause

`NativeXmlPublicationFormatFilter::_processProductNode()` (OMP
`plugins/importexport/native/filter/NativeXmlPublicationFormatFilter.php`,
lines 376–378) reads both values from inside the `Supplier` element:

```php
$representation->setReturnableIndicatorCode($this->_extractTextFromNode($supplierNode, $onixDeployment, 'ReturnsCode'));
$representation->setProductAvailabilityCode($this->_extractTextFromNode($supplierNode, $onixDeployment, 'ProductAvailability'));
```

In ONIX 3.0, and in what `MonographONIX30XmlFilter::createProductNode()`
writes (lines 878–892), `ReturnsConditions` and `ProductAvailability`
are children of `SupplyDetail`, beside the `Supplier`, never inside it.
Both lookups return null and the format is stored without either
value. The import's sample file, `plugins/importexport/native/sample.xml`
(added in a0cd37aa1, its ONIX block written by 2c06909, deleted by
015051ac2 in 2025), placed `ProductAvailability` beside the `Supplier`
too; it can be read with `git show 2c06909:plugins/importexport/native/sample.xml`.
Until 8f22722 (2023) the second line called the getter instead of the
setter, so the availability was never read at all.

Reach:

- Every imported format with at least one market, walked into the same
  press; the import into another press runs the same code (read).
- A digital format loses its availability the same way and shows
  "Available (20)"; it has no "Returnable Indicator" on screen, and its
  product states none before or after.
- The other lookups of the method: the sales-rights lookup and the
  supplier lookups go wrong in other ways (the sibling reports below);
  the price lookup searches the `ProductSupply` element and is right.

## Proposed fix

Read both values from the market's `ProductSupply` element, which holds
one `SupplyDetail`, and outside the supplier branch, since they belong
to the format
([fix-a18-import.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-a18-import.diff)):

```php
                }

                // The format's returns condition and availability: SupplyDetail holds them beside the
                // Supplier, the same in every market the export writes.
                $representation->setReturnableIndicatorCode($this->_extractTextFromNode($productSupplyNode, $onixDeployment, 'ReturnsCode'));
                $representation->setProductAvailabilityCode($this->_extractTextFromNode($productSupplyNode, $onixDeployment, 'ProductAvailability'));
```

This is how the method already reads the price. The export writes the
same two values into every market of the format, so reading them per
market stores the same values.

Tried on `main` within the combined
[fix-trial.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-trial.diff),
which carries this fix and the four sibling ones; only this one touches
these two lookups. With it, the imported tab showed "In stock (21)" and
"No, not returnable (N)", and the copy's export carried `ReturnsCode`
`N` and `ProductAvailability` `21`. A separate run with the same values,
another sales-rights entry and a chosen supplier gave the same with the
fix, and the defaults without it.

**Alternatives**:

- Read them from the first `SupplyDetail` of the product, once: the
  same result, with a lookup of its own.
- Carry the two values as attributes of the Native XML
  `publication_format` element: a schema change, and the ONIX product
  already holds them.

**What goes with it**:

- Books imported before the fix keep no values; the original press
  still has them, so a press can re-import or set them by hand. No
  repair is proposed.
- A file whose format had no stored availability carries `20` (the
  export's fallback), and the import now stores `20`: what the tab
  showed anyway.
- Backport: the lines are the same on `stable-3_5_0`, `stable-3_4_0`
  (368–369) and `stable-3_3_0` (312–313). The diff applies as it stands
  to `stable-3_5_0` and `stable-3_4_0`; `stable-3_3_0` has the same code
  indented with tabs (`NativeXmlPublicationFormatFilter.inc.php`), so
  the change is re-made there by hand.
- Guard: no test of the native import filters exists in OMP or
  pkp-lib, so a unit test of `NativeXmlPublicationFormatFilter` needs
  its own setup (a deployment, a submission, the DAOs) before it can
  import a product whose `SupplyDetail` holds `ReturnsConditions` and
  `ProductAvailability`; an end-to-end export-and-import test is the
  lighter guard.

Small: two lines moved in one method, and a test.

The sibling reports, same round trip, other causes:

- [U74-A18-unsaved-format-states-no-returns-condition.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-unsaved-format-states-no-returns-condition.md)
  (a never-saved tab against the product)
- [U74-A11-native-import-unticks-rest-of-world.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A11-native-import-unticks-rest-of-world.md)
- [U74-A19-native-import-adds-press-as-supplier.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-adds-press-as-supplier.md)
- [U74-A19-native-import-changes-supplier-websites.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-changes-supplier-websites.md)

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/walk.js),
  run as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/native-import-loses-trade-details/walk.js`.
  It takes these Steps and those of the four sibling reports in one run.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02); both gave the same results. Tips: OMP `main` 3b0ecf794
  (2026-09-29), its pkp-lib 3dc90c81a6; OMP `stable-3_5_0` 9c5e24246
  (2026-10-01), its pkp-lib cf3f984335.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp; the
  two lookups read at the lines the Backport bullet names, with the
  setter, and the export's `SupplyDetail` layout the same.
- Introduced: blame on lines 376–378 gives dca0635 (2024, the ONIX
  schema update), which only moved them into the supplier branch; at
  its parent and back to 2c06909 (`*8445*`, the old bug tracker) the
  lookups read `$supplierNode`. 8f22722 (2023-06-04, Jonas Raoni Soares
  da Silva, "Replaced getter by setter") fixed the availability call
  but kept the lookup.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by native import returnable, `ProductAvailability` import, product
  availability, ONIX returns and `NativeXmlPublicationFormatFilter`:
  nothing about this fault.
