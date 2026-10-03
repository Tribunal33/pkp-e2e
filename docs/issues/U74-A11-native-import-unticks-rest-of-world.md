# A book imported from a press's Native XML file loses its "Rest of World?" sales-rights tick

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
- **Tracked in** spec U74 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a11)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor exports a book from Tools › "Native XML Plugin" and
imports the file again, into the same press or another one. A
publication format's sales-rights entry that had "Rest of World?"
ticked comes back as an ordinary entry: the box is unticked and
"World (WORLD)" is chosen under the included regions. The import says
"The import completed successfully." and nothing tells the editor.

"Rest of World?" means everywhere the format's other entries do not
name. The imported entry means the whole world instead. A format sold
with exclusive rights in Canada and non-exclusive rights in the rest of
the world comes back stating non-exclusive rights everywhere, Canada
included, beside the exclusive Canada entry: on the "Metadata" tab, and
in the book's next ONIX product, which no longer names a rest-of-world
type.

## Impact

- **Lost**: the "Rest of World?" setting of every imported format that
  had one. Where the format has other entries, the imported rights
  contradict them.
- **Who**: press managers and editors who move or restore books with
  the Native XML Plugin, for formats with a rest-of-world entry.
- **Way round**: on each imported format's "Metadata" tab, edit the
  entry, clear "World (WORLD)" and tick "Rest of World?" again.

Medium: the import silently turns a remainder into the whole world, so
a format with more than one entry states contradicting rights on screen
and to the trade; there is a way round on screen, one format at a time.
A format whose only entry is the rest-of-world one keeps the same
meaning, and alone would be low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- Sign in as `dbarnes`.
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
3. "Paperback u74ir8" › arrow › "Edit" › "Metadata" › "Sales Rights" ›
   "Add Sales Rights": "Type" "For sale with exclusive rights in the
   specified countries or territories (01)", "Countries Included"
   "Canada (CA)"; "OK".
4. "Add Sales Rights" again: "Type" "For sale with non-exclusive rights
   in the specified countries or territories (02)", tick "Rest of
   World?", no country or region; "OK". The list shows the tick in the
   "(02)" row. Each "OK" saves its entry; close the format's "Edit"
   window with its "Cancel", which leaves both entries saved.
5. Tools › "Import/Export" › "Native XML Plugin" › "Export": tick
   submission 4, "Export Submissions", "Download Exported File".
6. "Import": upload that file, "Import". The results read "The import
   completed successfully. The following items were imported:
   Submission "19" - "How Canadians Communicate: Contexts of Canadian
   Popular Culture"".
7. Open submission 19 › "Publication Formats" › "Paperback u74ir8" ›
   "Edit" › "Metadata": the "Sales Rights" rows, and each row's arrow ›
   "Edit".
8. Export submission 19 as in step 5, ticking submission 19 (the list
   shows the title twice).

**Expected**: the "(02)" entry is a "Rest of World?" entry as exported:
the box ticked, no country or region chosen. The file of step 5 says
so, naming the type again under `PublishingDetail`:

```xml
<onix:SalesRights><onix:SalesRightsType>01</onix:SalesRightsType><onix:Territory><onix:CountriesIncluded>CA</onix:CountriesIncluded></onix:Territory></onix:SalesRights>
<onix:SalesRights><onix:SalesRightsType>02</onix:SalesRightsType><onix:Territory><onix:RegionsIncluded>WORLD</onix:RegionsIncluded></onix:Territory></onix:SalesRights>
<onix:ROWSalesRightsType>02</onix:ROWSalesRightsType>
```

**Observed**: the "(01)" entry is as exported. The "(02)" row shows no
tick, and its "Edit" shows "Rest of World?" unticked, no country, and
"World (WORLD)" as the one included region. The file of step 8 has the
same two `SalesRights` elements and no `ROWSalesRightsType`.

## Cause

`NativeXmlPublicationFormatFilter::_processProductNode()` (OMP
`plugins/importexport/native/filter/NativeXmlPublicationFormatFilter.php`,
line 237) looks for `ROWSalesRightsType` inside each `SalesRights`
element:

```php
$salesRightsROW = $this->_extractTextFromNode($salesRightsNode, $onixDeployment, 'ROWSalesRightsType');
```

ONIX 3.0 places `ROWSalesRightsType` in `PublishingDetail`, beside the
`SalesRights` composites. `MonographONIX30XmlFilter::createProductNode()`
(lines 678–711) has always written it there: it writes the
"Rest of World?" entry as a `SalesRights` of its type whose `Territory`
is `RegionsIncluded` `WORLD` alone, then appends `ROWSalesRightsType`
to `PublishingDetail`. The lookup never finds it, so every entry takes
the `else` branch: `ROWSetting` false and the territory as written,
`WORLD` included.

The import's sample file, `plugins/importexport/native/sample.xml`
(added in a0cd37aa1, its ONIX block written by 2c06909, deleted by
015051ac2 in 2025), also placed `ROWSalesRightsType` under
`PublishingDetail`; it can be read with
`git show 2c06909:plugins/importexport/native/sample.xml`.

Reach:

- Every format with a "Rest of World?" entry, walked into the same
  press; an import into another press runs the same code (read).
- The export's own file already lists `WORLD` for the rest-of-world
  entry beside the other entries' countries, and leaves
  `ROWSalesRightsType` to say it is the remainder. That is how the
  export has always written it, outside this report; the import drops
  the one element that told the two apart.
- No other code reads `ROWSalesRightsType`.

## Proposed fix

Read `ROWSalesRightsType` from the product, and tick the `SalesRights`
of that type whose territory is `WORLD` alone, the shape the export
gives the entry
([fix-a11.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-a11.diff)):

```php
$salesRightsROW = $this->_extractTextFromNode($node, $onixDeployment, 'ROWSalesRightsType');
...
$salesRights->setType($this->_extractTextFromNode($salesRightsNode, $onixDeployment, 'SalesRightsType'));
$salesRights->setROWSetting(false);
$territoryNodeList = $salesRightsNode->getElementsByTagNameNS($onixDeployment->getNamespace(), 'Territory');
if ($salesRightsROW !== null && $salesRights->getType() == $salesRightsROW && $territoryNodeList->length == 1
    && trim($territoryNodeList->item(0)->textContent) == 'WORLD') {
    // The "Rest of World" entry: one per format, no territory of its own.
    $salesRights->setROWSetting(true);
    $salesRightsROW = null;
} else {
    // parse the Territory as today
}
```

`$node` is the `Product` element, so the lookup reaches
`PublishingDetail`. An ordinary entry that includes "World (WORLD)"
with exclusions is not taken for the rest-of-world entry, and at most
one entry is ticked, as `SalesRightsForm` allows.

A file that names a `ROWSalesRightsType` but holds no `WORLD` entry of
that type gets no "Rest of World?" entry from this fix. That is left
out on purpose: OMP's export always writes the `WORLD` entry, and a
Native XML file comes from an OMP export. If the team wants to accept
the shorter ONIX form too, a few more lines after the loop create a
ticked entry of that type with no territory when `$salesRightsROW` is
still set; that was not tried.

Tried on `main` within the combined
[fix-trial.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-trial.diff),
which carries this fix and the four sibling ones; only this one touches
the sales rights. With it, a format with the rest-of-world entry alone
came back with "Rest of World?" ticked and no territory, and the
copy's export carried `<onix:ROWSalesRightsType>01</onix:ROWSalesRightsType>`
again. In a second book, an ordinary "(02)" entry including "World
(WORLD)" and excluding "Germany (DE)", beside a "Rest of World?" entry
"(01)", came back unticked with its territory, while the "(01)" entry
came back ticked.

**Alternatives**:

- Have the export write `ROWSalesRightsType` alone, without the `WORLD`
  `SalesRights`, which ONIX allows: it changes the file every trade
  partner receives, and the import would still need the fix above.
- Tick on the `WORLD` territory alone, without the type: an ordinary
  entry that includes only "World (WORLD)" would come back ticked.

**What goes with it**:

- Books imported before the fix keep the unticked entry. OMP keeps no
  copy of the imported file, so nothing records which entries were
  rest-of-world ones, and no repair is proposed.
- Backport: the line is the same on `stable-3_5_0` (237),
  `stable-3_4_0` (236) and `stable-3_3_0` (197). The diff applies as it
  stands to `stable-3_5_0` and `stable-3_4_0`; `stable-3_3_0` has the
  same code indented with tabs (`NativeXmlPublicationFormatFilter.inc.php`),
  so the change is re-made there by hand.
- Guard: no test of the native import filters exists in OMP or
  pkp-lib, so a unit test of `NativeXmlPublicationFormatFilter` needs
  its own setup; an end-to-end export-and-import test with a
  rest-of-world entry beside another entry is the lighter guard.

Small: a few lines in one method of the import, and a test.

The sibling reports, same import, other causes:

- [U74-A18-unsaved-format-states-no-returns-condition.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-unsaved-format-states-no-returns-condition.md)
- [U74-A18-native-import-resets-returns-and-availability.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-native-import-resets-returns-and-availability.md)
- [U74-A19-native-import-adds-press-as-supplier.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-adds-press-as-supplier.md)
- [U74-A19-native-import-changes-supplier-websites.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-changes-supplier-websites.md)

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/walk.js),
  run as
  `MODE=overlap PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/native-import-loses-trade-details/walk.js`
  for these Steps.
- Walked on PostgreSQL with pkp/datasets e8dafbc (2026-10-02). The
  rest-of-world entry alone was walked on `main` and 3.5, with the same
  result; the Steps' second entry beside it was walked on `main`. Tips:
  OMP `main` 3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6; OMP
  `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib cf3f984335.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp; the
  import's lookup at the lines the Backport bullet names, and the
  export's `ROWSalesRightsType` under `PublishingDetail` (lines 630 and
  617), the same as on `main`.
- Introduced: blame on line 237 gives 01088072a8 (the 2021 PSR-12
  reformat); `git log -S"'ROWSalesRightsType'"` on the import filter
  gives 2c06909 (`*8445*`, the old bug tracker), which wrote the lookup.
  The export already wrote the element under `PublishingDetail`
  (d349f61, 2013-11-19, also Jason Nugent).
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by "rest of world", native import sales rights, `ROWSalesRightsType`
  and `NativeXmlPublicationFormatFilter`. `pkp/pkp-lib#8830` (the sales
  rights window's "Rest of World?" scripting) is another fault.
