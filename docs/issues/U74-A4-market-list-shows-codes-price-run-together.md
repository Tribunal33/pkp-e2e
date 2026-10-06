# A book format's "Market Territories" list shows country codes and runs the price into its currency

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; [5e0d3c7](https://github.com/pkp/omp/commit/5e0d3c7ff97d3a777956ec3368f72d1694a170b6) · 2012-01-29 · Jason Nugent (jnugent), PKP bug 6975 ("Add multiple Markets, Agents, more ONIX fields")
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press editor adds a market to a book's format and chooses its
countries and regions by name in the window ("Canada (CA)", "Quebec
(CA-QC)"). The format's "Market Territories" list then shows only the
codes, "Included: CA, US, Excluded: GB, CA-QC", and its "Price" column
runs the amount into the currency code: "25CAD", "12.50USD".

Nothing is saved wrong, and the book's ONIX data and public page are
not affected: the list is shown only in the editorial back end, so
readers never see it. Only presses that record markets for their
formats meet it.

## Impact

- **Lost**: legibility. A region's code ("CA-QC", "IT-AG") means little
  to most editors, and "25CAD" reads as one token.
- **Who**: a press manager or editor working in a format's "Metadata"
  tab, every time a market is listed there.
- **Way round**: the market's "Edit" window names every country and
  region and shows the currency apart from the price.

Low: a back-end list that reads poorly, with nothing lost.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. Submission 4, "How
  Canadians Communicate: Contexts of Canadian Popular Culture", has one
  format, "PDF", with no market.

Steps:

1. Sign in as `dbarnes`.
2. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture", and go to Publication › "Publication Formats".
3. Press the arrow before "PDF", then "Edit"; in the window open the
   "Metadata" tab.
4. Under "Market Territories" press "Add Market".
5. Type 20261001 in "Date". Under "Countries", choose "Canada (CA)" and
   "United States (US)" in "Included", and "United Kingdom (GB)" in
   "Excluded". Under "Regions", choose "Quebec (CA-QC)" in "Excluded".
   Type 25 in "Price" (the currency stays "Canadian Dollar (CAD)").
   Press "OK".
6. Read the new row of the "Market Territories" list.
7. Press the arrow before the row, then "Edit", and read what the
   window shows chosen.

**Expected**: the row names the territories the way the window does,
"Included: Canada (CA), United States (US), Excluded: United Kingdom
(GB), Quebec (CA-QC)", and shows the price apart from its currency,
such as "25 (CAD)".

**Observed**: the row reads, under "Territory", "Representatives" and
"Price":

```
Included: CA, US, Excluded: GB, CA-QC |  | 25CAD
```

It reads the same after the tab is opened again. The "Edit" window
shows "Canada (CA)" and "United States (US)" chosen in "Included",
"United Kingdom (GB)" and "Quebec (CA-QC)" in "Excluded", "25" in
"Price" and "Canadian Dollar (CAD)" in the currency list.

## Cause

Both cells are built in `MarketsGridCellProvider::getTemplateVarsFromRowColumn()`
(`controllers/grid/catalogEntry/MarketsGridCellProvider.php`):

- "Territory" calls `Market::getTerritoriesAsString()`
  (`classes/publicationFormat/Market.php`, lines 351-359). It joins the
  stored code arrays (`getCountriesIncluded()`, `getRegionsIncluded()`
  and the excluded pair) as they are, with no lookup in their ONIX code
  lists.
- "Price" is `$element->getPrice() . $element->getCurrencyCode()`
  (line 51), with nothing between the two.

The window names the same codes through
`ONIXCodelistItemDAO::getCodes('91')` (countries) and `getCodes('49')`
(regions) in `MarketForm::fetch()`. Those return "Canada (CA)" and
"Quebec (CA-QC)": `lib/pkp/xml/onixFilter.xsl` builds each label as the
description followed by the code in brackets. Every other ONIX code on
this tab is shown by name: `getNameForONIXCode()` on
`IdentificationCode`, `PublicationDate` and `SalesRights` looks the
code up in its list. The market's territories are the one column that
skips the lookup.

Reach:

- `getTerritoriesAsString()` has no other caller in OMP, its pkp-lib or
  its plugins (code).
- No other screen shows a market: the catalog's book page lists none
  (code). The "Sales Rights" list has no territory column.

## Proposed fix

Name the territories in `Market::getTerritoriesAsString()` through
their code lists, as the window and the sibling `getNameForONIXCode()`
methods do, and format the price cell with OMP's existing
`payment.directSales.amount` string, "{$amount} ({$currency})":
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-list-shows-codes-price-run-together/fix.diff).

```diff
     public function getTerritoriesAsString()
     {
+        $onixCodelistItemDao = DAORegistry::getDAO('ONIXCodelistItemDAO'); /** @var ONIXCodelistItemDAO $onixCodelistItemDao */
+        $countryNames = $onixCodelistItemDao->getCodes('91'); // List 91 is for countries
+        $regionNames = $onixCodelistItemDao->getCodes('49'); // List 49 is for regions
+        $names = fn (array $codes, array $codeNames) => array_map(fn ($code) => $codeNames[$code] ?? $code, $codes);
+
         $territories = __('grid.catalogEntry.included');
-        $territories .= ': ' . join(', ', array_merge($this->getCountriesIncluded(), $this->getRegionsIncluded()));
+        $territories .= ': ' . join(', ', array_merge($names($this->getCountriesIncluded(), $countryNames), $names($this->getRegionsIncluded(), $regionNames)));
         $territories .= ', ' . __('grid.catalogEntry.excluded');
-        $territories .= ': ' . join(', ', array_merge($this->getCountriesExcluded(), $this->getRegionsExcluded()));
+        $territories .= ': ' . join(', ', array_merge($names($this->getCountriesExcluded(), $countryNames), $names($this->getRegionsExcluded(), $regionNames)));
```

```diff
             case 'price':
-                return ['label' => $element->getPrice() . $element->getCurrencyCode()];
+                return ['label' => $element->getCurrencyCode() ? __('payment.directSales.amount', ['amount' => $element->getPrice(), 'currency' => $element->getCurrencyCode()]) : $element->getPrice()];
```

A code missing from the list (one dropped from a later code list) is
shown as the code, as today. `payment.directSales.amount` is used
nowhere else today. It is translated in 30 of OMP's 34 locales; `vi` and
`ar` have it with an empty translation and `ckb` and `ky` lack it, so
those four show the English form, "25 (CAD)".

Tried on `main`: the row read "Included: Canada (CA), United States
(US), Excluded: United Kingdom (GB), Quebec (CA-QC)" and "25 (CAD)",
also after the tab was opened again.

A second market was also tried with the fix and without it: no country
or region chosen, and 12.50 in US dollars. Its "Territory" read
"Included: , Excluded:" both times. Its price changed from "12.50USD"
to "12.50 (USD)". Its "Edit" window and its stored codes did not
change.

**Alternatives**:

- The lookup in `MarketsGridCellProvider` instead of `Market`. It works,
  but the siblings keep their code-to-name lookup on the entity
  (`getNameForONIXCode()`), and the method exists only to give this
  label.
- A new locale key for the price. It would need translating, while the
  existing string already has the wanted form.
- The currency's name or symbol (`Locale::getCurrencies()`). That makes
  a longer cell for no gain, since the window's own currency list leads
  with the name and ends with the code.

**What goes with it**:

- What changes: `getTerritoriesAsString()` returns names instead of
  codes. No caller in pkp's code relies on the codes; a third-party
  plugin calling it would get names.
- The empty case ("Included: , Excluded:" for a market with no
  territory) is left as it reads today.
- Backport: the same lines on 3.5 and 3.4 take the diff as it stands.
  On 3.3 the files are `Market.inc.php` and
  `MarketsGridCellProvider.inc.php`, and 3.3 still supports PHP 7.3
  (its pkp-lib's `composer.json` platform), so the arrow functions
  become closures.
- Guard: an end-to-end check that the list names the territories and
  shows "25 (CAD)" (planned in pkp-e2e's U74 spec).

Small: two methods in one app, no data to repair.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-list-shows-codes-price-run-together/walk.js),
  with its helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/market-list-shows-codes-price-run-together/lib.js).
  It takes the Steps on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/market-list-shows-codes-price-run-together/walk.js`.
  With the argument `neighbour` it takes the second market of
  "Tried on `main`" instead.
  After step 5 the `markets` row held `a:2:{i:0;s:2:"CA";i:1;s:2:"US";}`,
  `a:1:{i:0;s:2:"GB";}`, `a:0:{}`, `a:1:{i:0;s:5:"CA-QC";}`, `25`,
  `CAD`.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02), with no failed request or page script. Tips: OMP
  `main` 3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6. OMP
  `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib cf3f984335. The
  3.5 walk showed the same row and window as `main`. MySQL not checked
  (nothing here depends on the database).
- Introduced: blame gives the PSR-12 reformat 01088072a; blame at its
  parent gives 5e0d3c7 for both lines.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp, and
  their pkp-lib. Read on each:
  - `getTerritoriesAsString()` and the price cell: identical to `main`
    (on 3.3 in the `.inc.php` files).
  - `ONIXCodelistItemDAO::getCodes()`: present, its labels ending in
    the code in brackets (on 3.3 built by pkp-lib's
    `xml/onixFilter.xsl`).
  - `payment.directSales.amount`: present, "{$amount} ({$currency})".
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words ("market territories", "market price
  currency", "market territory", "country codes") and the names
  `getTerritoriesAsString` and `MarketsGridCellProvider`. The only
  market hit, `pkp/pkp-lib#10105` (tax fields for markets), is a
  different matter.
