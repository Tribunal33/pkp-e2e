# A physical format's "Metadata" tab shows "Yes, returnable" until saved, but its ONIX product states no returns condition

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; present since the returnable indicator was added, [80bc049](https://github.com/pkp/omp/commit/80bc049b23620a3c31337b8a965f4acb61ee5552) · 2012-01-25 · Jason Nugent (jnugent)
- **Upstream** none found (2026-10-06)
- **Tracked in** spec U74 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a18)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-06.** On `main` and 3.5 an e-book's "Metadata" tab
also offers "Returnable Indicator", preset to "Yes", while its product
rightly states no returns condition: there the tab is wrong, by a
separate fault ([pkp-e2e#796](https://github.com/jardakotesovec/pkp-e2e/issues/796), every format's tab is
built as a physical format's). This report stays with physical formats,
and its way round is not for e-books.

## Summary

A press editor opens the "Metadata" tab of a physical publication
format, such as a paperback, whose tab has never been saved.
"Returnable Indicator" shows "Yes, returnable, full copies only (Y)"
and "Product Availability" shows "Available (20)", as if those were the
format's settings.

The format's ONIX product, which goes to trade partners in the ONIX 3.0
tool's file and is also carried in the Native XML file, states the
availability but no returns condition at all. Since the tab already
shows "Yes", nothing prompts the editor to save it, and nothing shows
that the product leaves it out.

It touches every physical format with at least one market whose tab
was never saved; a format without a market has no supply data in the
product at all. Saving the tab once, even unchanged, puts the returns
condition into the product.

## Impact

- **Lost**: the returns condition in such a format's ONIX product.
- **Who**: presses that sell physical formats and add markets without
  ever saving the format's "Metadata" tab; adding a market does not
  need that tab to be saved.
- **Way round**: save each physical format's "Metadata" tab once
  ("Product Composition" must be chosen to save it).

Low: the product omits an optional statement rather than stating a
wrong one, and one save on screen puts it right. It would be medium if
a trade partner refused products without a returns condition.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- Sign in as `dbarnes`.
- The dataset's formats are all digital, so step 2 adds a physical
  one, the kind whose tab is meant to offer "Returnable Indicator" (the
  Cause's reach says what a digital format's tab shows).
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
3. "Paperback u74ir8" › arrow › "Edit" › "Metadata". "Product
   Availability" reads "Available (20)", "Returnable Indicator" reads
   "Yes, returnable, full copies only (Y)".
4. Same tab › "Market Territories" › "Add Market": "Countries Included"
   "Canada (CA)", "Date" "20261001", "Price" "25"; "OK" (the market
   window closes and the market is saved). Close the format's "Edit"
   window with its "Cancel", without saving the tab.
5. Tools › "Import/Export" › "Native XML Plugin" › "Export": tick
   submission 4, "Export Submissions", "Download Exported File".

**Expected**: the "Paperback u74ir8" product states what the tab shows:

```xml
<onix:ReturnsConditions><onix:ReturnsCodeType>02</onix:ReturnsCodeType><onix:ReturnsCode>Y</onix:ReturnsCode></onix:ReturnsConditions>
<onix:ProductAvailability>20</onix:ProductAvailability>
```

(or the tab shows no returns choice until one is saved).

**Observed**: the product's `SupplyDetail` holds the supplier,
`<onix:ProductAvailability>20</onix:ProductAvailability>` and the price,
and no `ReturnsConditions`. Control: once the tab is saved with "No, not
returnable (N)" and "In stock (21)", the next export carries
`<onix:ReturnsCode>N</onix:ReturnsCode>` and
`<onix:ProductAvailability>21</onix:ProductAvailability>`.

## Cause

`PublicationFormatMetadataForm::initData()` (OMP
`controllers/grid/catalogEntry/form/PublicationFormatMetadataForm.php`,
lines 188 and 190) fills the tab with a fallback when the format has
no stored value: `'20'` for `productAvailabilityCode` and `'Y'` for
`returnableIndicatorCode`. Nothing is stored until "Save".

`MonographONIX30XmlFilter::createProductNode()` (OMP
`plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`)
writes one `ProductSupply` per market, and in it the format's returns
condition and availability. For the availability it applies the same
fallback as the form (lines 893–897, "assume 'available' if not
specified"), but lines 883–891 write `ReturnsConditions` only when a
code is stored. So the screen shows a returns condition the product
does not carry.

80bc049 (2012) added the returnable indicator with both halves of the
mismatch: the form's `'Y'` fallback and the export's stored-only
`ReturnsConditions`. The export's availability fallback came four days
later, in [5e0d3c7](https://github.com/pkp/omp/commit/5e0d3c7ff97d3a777956ec3368f72d1694a170b6)
(2012-01-29), and has matched the form since.

Reach:

- Both exports build the product with this filter: the ONIX 3.0 tool
  (read in the code) and the Native XML Plugin (walked). The ONIX 3.0
  tool exports on a fresh `main` install too since pkp/omp#2372
  (2026-10-05; [U74 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a1), retired), with this gap.
- A digital format is not reached. Its tab shows "Returnable
  Indicator" preset to "Yes" (walked), but an e-book should state no
  returns condition, so its product is right and the tab is wrong.
  Both `PublicationFormatGridHandler` callers, `editFormatMetadata()`
  and `updateFormatMetadata()` (lines 662 and 680), build the form
  without the format's `getPhysicalFormat()`, and the constructor's
  `$isPhysicalFormat` defaults to `true`.
- Saving an e-book's tab therefore stores `'Y'` and `'CA'` and empties
  its technical protection, because `execute()` stores what was
  posted; the way round above is not for e-books.
- This fix and [pkp-e2e#796](https://github.com/jardakotesovec/pkp-e2e/issues/796) do not depend on each other:
  this one covers physical formats, #796 takes the choice off e-books,
  and after #796 an e-book's tab and product agree only if its tab was
  never saved.
- Two other fallbacks of `initData()` disagree the same way, read in
  the code: "Country of Manufacture" falls back to `'CA'` and
  "Technical Protection" to `'00'`, while the export (lines 280 and
  284) writes `CountryOfManufacture` and `EpubTechnicalProtection` only
  from stored values. The walked file had no `CountryOfManufacture` for
  the never-saved paperback. "Technical Protection" belongs to the
  digital group, which no tab shows while #796 stands. The
  measurement units' fallbacks are harmless: a unit is written only
  with a typed measurement.

## Proposed fix

Give the export the tab's fallback for a physical format, the way it
already does for the availability
([fix-a18-tab.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-a18-tab.diff)):

```php
// Until its "Metadata" tab is saved, a physical format's tab shows "Yes, returnable, full copies
// only" (PublicationFormatMetadataForm::initData()): state the same, as for the availability below.
$returnableIndicatorCode = $publicationFormat->getReturnableIndicatorCode();
if ($returnableIndicatorCode == '' && $publicationFormat->getPhysicalFormat()) {
    $returnableIndicatorCode = 'Y';
}
if ($returnableIndicatorCode != '') {
    // ReturnsConditions as today, with $returnableIndicatorCode
}
```

Tried on `main` within the combined
[fix-trial.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-trial.diff),
which carries this fix and the four sibling ones; only this one touches
the export. With it, the never-saved paperback's product carried
`<onix:ReturnsCode>Y</onix:ReturnsCode>`, and a tab saved with "No,
not returnable (N)" still exported `N`.

**Alternatives**:

- The `'Y'` fallback for every format, digital ones included: every
  never-saved e-book would then be stated returnable, which an e-book
  should not be.
- One shared default instead of `'Y'` in two places: a constant (or a
  physical-format fallback in a `PublicationFormat` getter) read by the
  form and the export alike. It is the better shape if the team expects
  more readers of these codes, since two hard-coded copies are how the
  two drifted apart; it touches the form and the class as well, so it
  is a little more than this diff.
- Show an empty "Returnable Indicator" until one is saved: honest too,
  but it changes what every press sees, and it is a product decision.
- Store the defaults when a format is created: formats created before
  the change would still disagree, so it would need a migration.
- The same fallback in the export for "Country of Manufacture" is left
  out on purpose: it would state Canada for every press's never-saved
  format, a country the press never chose. That fallback belongs in the
  form (an empty choice until saved), which is the team's call; the
  technical protection's `'00'` ("None") could follow the returns
  condition if the team wants the two to agree.

**What goes with it**:

- Physical formats never saved start stating "returnable" in their next
  export. Recipients of the ONIX feed see a new `ReturnsConditions` for
  them.
- Backport: the code is the same on `stable-3_5_0` (line 857),
  `stable-3_4_0` (form line 186, export line 797) and `stable-3_3_0`
  (form line 171, export line 775). The diff applies as it stands to
  `stable-3_5_0`; the two older branches call `_buildTextNode()` there
  (and 3.3 indents with tabs), so the change is re-made by hand.
- Guard: a case in `plugins/importexport/onix30/tests/MonographONIX30XmlFilterTest.php`
  with a physical format that has a market and no stored returnable
  code.

Small: one condition in the export, following its own fallback for the
availability, and a test.

The sibling reports, same round trip, other causes:

- [U74-A18-native-import-resets-returns-and-availability.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-native-import-resets-returns-and-availability.md)
- [U74-A11-native-import-unticks-rest-of-world.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A11-native-import-unticks-rest-of-world.md)
- [U74-A19-native-import-adds-press-as-supplier.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-adds-press-as-supplier.md)
- [U74-A19-native-import-changes-supplier-websites.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-changes-supplier-websites.md)

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/walk.js),
  run as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/native-import-loses-trade-details/walk.js`.
  It takes these Steps and those of the four sibling reports in one run;
  with `MODE=digital` in front it takes them on a digital format,
  "E-book u74hk9" (the Cause's digital reach).
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets 5a53d3d
  (2026-10-05), both modes; both versions gave the same results. Tips:
  OMP `main` 592914b83 (2026-10-05), its pkp-lib e39fdee199; OMP
  `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib cf3f984335.
- The digital reach (code): `PublicationFormatGridHandler`'s
  `editFormatMetadata()` and `updateFormatMetadata()` build the form
  without the format's `getPhysicalFormat()` on `main` (lines 662,
  680), `stable-3_5_0` (658, 676), `stable-3_4_0` (659, 677) and
  `stable-3_3_0` (584, 600), since ce205d583 (2019, 3.2); the form's
  `execute()` (lines 271–275 on `main`) stores the posted codes. The
  digital walk saved "No, not returnable (N)", so the stored `'Y'` of
  an unchanged save is read from the code.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp; the
  form's fallback and the export's condition read at the lines the
  Backport bullet names.
- Introduced: blame on the form's line 190 and the export's lines
  883–888 gives 01088072a8 (the 2021 PSR-12 reformat) and dca0635
  (2024, the ONIX schema update, which only re-indented them).
  `git log -S": 'Y',"` and `-S"getReturnableIndicatorCode() != ''"`
  lead to 80bc049 (`*6975*`, the old bug tracker); 4a1a31f (2012) and
  d349f61 (2013) carried both over. `git show 5e0d3c7` adds the
  export's `'20'` fallback.
- Not driven: the ONIX 3.0 tool's own file.
- Fix: `fix-a18-tab.diff` applies to today's `main` at an offset of five
  lines (`git apply --check`); tried 2026-10-03, not again.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  and 2026-10-06 by returnable indicator, ONIX returns,
  `ReturnsConditions`, product availability and ONIX import: nothing
  about this fault.
