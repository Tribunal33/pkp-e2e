# A book imported from a press's Native XML file loses its suppliers' websites, and a supplier without one gets the original book's page as its website

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#1598` for `pkp/pkp-lib#9926` · [9eabb4a](https://github.com/pkp/omp/commit/9eabb4afb22a5117046199d2b3094e13026d5e23) · 2024-06-18 · Kaitlin Newson (kaitlinnewson); backported to 3.4 by `pkp/omp#1597` and to 3.3 by `pkp/omp#1593`
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a19)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press editor exports a book from Tools › "Native XML Plugin" and
imports the file again, into the same press or another one. A supplier
that had a "Website" comes back with none. A supplier that had no
website comes back with one: the address of the original book's page
on the exporting press. The import says "The import completed
successfully." and nothing shows the change.

The imported book's ONIX data then gives the first supplier no website,
and points trade partners to the original book's page as the second
supplier's own website. The editor can correct each supplier's
"Website" on the imported book's "Representatives" page, if they know
the original.

Until June 2024 a supplier's website came through the round trip
intact, on every version.

## Impact

- **Lost**: the website of every supplier that had one; every supplier
  that had none gets a wrong one. Both go out in the imported book's
  ONIX product as the supplier's own website.
- **Who**: press managers and editors who move or restore books with
  the Native XML Plugin, for every supplier named on a format's market.
- **Way round**: edit each supplier's "Website" back to the original,
  one supplier at a time.

Medium: an export-and-import task gives a wrong value in a field of
every supplier, silently, and it goes out in the trade data; there is
a way round on screen while the original is at hand.

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
   Popular Culture" › "Marketing" › "Representatives" › "Add
   Representative": click "Agent", then "Supplier" (the window opens on
   "Supplier" but refuses the save until the type is clicked); "Role"
   "Wholesaler to retailers (04)", "Name" "u74ir8 Supply", "Website"
   `https://supply.example.org/`; "OK". The supplier is saved, but the
   list shows it only after the page is loaded again.
3. The same for "u74ir8 Depot", same role, no website. The list then
   shows both.
4. "Publication Formats" › "PDF" › arrow › "Edit" › "Metadata" ›
   "Market Territories" › "Add Market": "Countries Included" "Canada
   (CA)", "Date" "20261001", "Price" "25", "Supplier" "u74ir8 Supply";
   "OK". "Add Market" again: "United States (US)", "20261001", "30",
   "Supplier" "u74ir8 Depot"; "OK". Close the format's "Edit" window
   with its "Cancel".
5. Tools › "Import/Export" › "Native XML Plugin" › "Export": tick
   submission 4, "Export Submissions", "Download Exported File".
6. "Import": upload that file, "Import". The results read "The import
   completed successfully. The following items were imported:
   Submission "19" - "How Canadians Communicate: Contexts of Canadian
   Popular Culture"".
7. Open submission 19 › "Marketing" › "Representatives": each supplier's
   arrow › "Edit".
8. Export submission 19 as in step 5, ticking submission 19 (the list
   shows the title twice).

**Expected**: "u74ir8 Supply" with the website
`https://supply.example.org/`, "u74ir8 Depot" with none, and the file
of step 8 giving each supplier the same website as the file of step 5.

**Observed**: "u74ir8 Supply" has an empty "Website". "u74ir8 Depot" has
the website `http://<host>/index.php/publicknowledge/en/catalog/book/4`,
the original book's page. The file of step 5 holds both suppliers with
that page as a second website:

```xml
<onix:Supplier><onix:SupplierRole>04</onix:SupplierRole><onix:SupplierName>u74ir8 Supply</onix:SupplierName>
  <onix:Website><onix:WebsiteRole>18</onix:WebsiteRole><onix:WebsiteLink>https://supply.example.org/</onix:WebsiteLink></onix:Website>
  <onix:Website><onix:WebsiteRole>29</onix:WebsiteRole><onix:WebsiteLink>http://<host>/index.php/publicknowledge/en/catalog/book/4</onix:WebsiteLink></onix:Website></onix:Supplier>
<onix:Supplier><onix:SupplierRole>04</onix:SupplierRole><onix:SupplierName>u74ir8 Depot</onix:SupplierName>
  <onix:Website><onix:WebsiteRole>29</onix:WebsiteRole><onix:WebsiteLink>http://<host>/index.php/publicknowledge/en/catalog/book/4</onix:WebsiteLink></onix:Website></onix:Supplier>
```

In the file of step 8, "u74ir8 Supply" has only the new book's page
(`WebsiteRole` 29, `…/catalog/book/19`), and "u74ir8 Depot" has the
original book's page as its own website (`WebsiteRole` 18,
`…/catalog/book/4`) beside the new one.

## Cause

`NativeXmlPublicationFormatFilter::_processProductNode()` (OMP
`plugins/importexport/native/filter/NativeXmlPublicationFormatFilter.php`,
line 346) takes the supplier's website as the only `WebsiteLink` inside
the `Supplier` element:

```php
$representative->setUrl($this->_extractTextFromNode($supplierNode, $onixDeployment, 'WebsiteLink'));
```

`_extractTextFromNode()` returns the text when exactly one element
matches and null otherwise. Until 2024 the export wrote at most one
`Website` in a `Supplier`, the supplier's own (`WebsiteRole` 18), so
the website came back as it was. 9eabb4a (`pkp/pkp-lib#9926`, the
download address in the ONIX export) added a second `Website` to every
chosen supplier in `MonographONIX30XmlFilter::createProductNode()`
(lines 856–860): the book's page, `WebsiteRole` 29. Since then a
supplier with a website has two `WebsiteLink`s and comes back with
none, and a supplier without one has the book's page alone and comes
back with it. The change was right for the trade file; the import was
not updated to read the website by its role.

The same change reached `stable-3_4_0` as e9744b0 (`pkp/omp#1597`) and
`stable-3_3_0` as e4765da (`pkp/omp#1593`) in June 2024, so all four
lines broke then, and none had the fault before.

Reach:

- Every supplier named on a market, walked into the same press; an
  import into another press runs the same code (read).
- The agent's website (line 319) is read the same way. The export
  writes one `Website` for an agent, so it comes back right today; the
  fix reads it by role too.
- The press the export writes for a market with no supplier is not
  changed by this fix: its home page (`WebsiteRole` 18) still comes back
  as that supplier's website. Whether that supplier should come back at
  all is
  [U74-A19-native-import-adds-press-as-supplier.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-adds-press-as-supplier.md),
  whose fix leaves it out.

## Proposed fix

Read only the `Website` whose role is 18, the one the export writes
from the representative's "Website" field, for suppliers and agents
alike
([fix-a19-website.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-a19-website.diff)):

```php
$representative->setUrl($this->_extractWebsiteLink($supplierNode, $onixDeployment, '18'));
...
public function _extractWebsiteLink($node, $onixDeployment, $role)
{
    foreach ($node->getElementsByTagNameNS($onixDeployment->getNamespace(), 'Website') as $websiteNode) {
        if ($this->_extractTextFromNode($websiteNode, $onixDeployment, 'WebsiteRole') === $role) {
            return $this->_extractTextFromNode($websiteNode, $onixDeployment, 'WebsiteLink');
        }
    }
    return null;
}
```

The book's page is not the supplier's: the next export rebuilds it from
the importing press. Reading role 18 alone, rather than any website
that is not role 29, mirrors what the export writes. A website of
another role can only come from a file OMP did not write, and ONIX list
73 gives other roles other meanings (a publisher's or an author's
site), so storing it as the supplier's own website would be a guess.

Tried on `main` within the combined
[fix-trial.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-trial.diff),
which carries this fix and the four sibling ones; only this one reads
the websites. With it, the copy's "u74ir8 Supply" kept
`https://supply.example.org/` and "u74ir8 Depot" had no website, and
the copy's export gave each the new book's page as `WebsiteRole` 29,
beside Supply's own. Two more suppliers the press chooses itself, role
"Publisher to end-customers (09)" with the website
`https://shop.example.org/` (one named "u74ir8 Press Shop", one named
"Public Knowledge Press"), kept it with the fix and lost it without.

**Alternatives**:

- Take the first `WebsiteLink`: right only while the export keeps its
  order, and wrong for a supplier without a website.
- Keep any website that is not role 29: see above.
- Move the book's page out of `Supplier` in the export: it changes the
  trade file that `pkp/pkp-lib#9926` asked for.

**What goes with it**:

- Books imported since June 2024 keep the wrong websites; the original
  press still has the right ones. No repair is proposed.
- Backport: the import line is the same on `stable-3_5_0`,
  `stable-3_4_0` (337) and `stable-3_3_0` (281), where the role-29
  website is written too (lines 777 and 753). The diff applies as it
  stands to `stable-3_5_0` and `stable-3_4_0`; `stable-3_3_0` has the
  same code indented with tabs (`NativeXmlPublicationFormatFilter.inc.php`),
  so the change is re-made there by hand.
- Guard: no test of the native import filters exists in OMP or
  pkp-lib, so a unit test of `NativeXmlPublicationFormatFilter` needs
  its own setup; an end-to-end export-and-import test with a supplier
  with a website and one without is the lighter guard.

Small: a helper and two changed lines in one class, and a test.

The sibling reports, same round trip, other causes:

- [U74-A19-native-import-adds-press-as-supplier.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-adds-press-as-supplier.md)
  (the same supplier block, the press in place of no supplier)
- [U74-A11-native-import-unticks-rest-of-world.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A11-native-import-unticks-rest-of-world.md)
- [U74-A18-unsaved-format-states-no-returns-condition.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-unsaved-format-states-no-returns-condition.md)
- [U74-A18-native-import-resets-returns-and-availability.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-native-import-resets-returns-and-availability.md)

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/walk.js),
  run as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/native-import-loses-trade-details/walk.js`.
  It takes these Steps and those of three sibling reports in one run.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02); both gave the same results. Tips: OMP `main` 3b0ecf794
  (2026-09-29), its pkp-lib 3dc90c81a6; OMP `stable-3_5_0` 9c5e24246
  (2026-10-01), its pkp-lib cf3f984335.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp; the
  import line and the export's role-29 website at the lines the
  Backport bullet names. Before the backports (read at e9744b0^ and
  e4765da^) each export wrote one `Website` per supplier, and the
  import line was the same.
- Introduced: blame on the import's line 346 gives 01088072a8 (the
  2021 PSR-12 reformat) and, before it, 2c06909 (2013), when one
  `Website` per supplier was all the export wrote. Blame on the
  export's lines 856–860 gives 9eabb4a and dca0635 (the latter only
  renamed `_buildTextNode`). GitHub's `commits/<sha>/pulls` names
  `pkp/omp#1598` for 9eabb4a (merged 2024-06-18), `pkp/omp#1597`
  (`stable-3_4_0`) for e9744b0 and `pkp/omp#1593` (`stable-3_3_0`) for
  e4765da, all by kaitlinnewson.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by supplier website onix, `WebsiteLink`, onix import supplier and
  `NativeXmlPublicationFormatFilter`: only `pkp/pkp-lib#9926` itself,
  closed, which asks for the download address and says nothing of the
  import.
