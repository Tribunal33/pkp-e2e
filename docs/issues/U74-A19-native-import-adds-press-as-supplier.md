# A book imported from a press's Native XML file names the exporting press as supplier of every market that had none

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
- **Tracked in** spec U74 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a19)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor exports a book from Tools › "Native XML Plugin" and
imports the file into another press. Every market that named no
supplier comes back naming a new supplier: the exporting press itself,
as "Publisher to end-customers (09)", with that press's contact email
address and home page. The imported book's "Representatives" page lists
the exporting press under "Suppliers", even for a book that had no
representative.

The moved book's markets keep naming the old press as their supplier,
so the ONIX products the new press sends out for the book (the ONIX 3.0
tool's file, and the Native XML file) point buyers to the old press.
Nothing on screen points this out.

## Impact

- **Lost**: the empty supplier of each such market, replaced by the old
  press with its email address and home page.
- **Who**: press managers and editors who move books to another press
  with the Native XML Plugin, for every market left without a supplier,
  which is how a press that sells its own books fills in its markets.
  Imported back into the same press, the book gets the press itself as
  a stored supplier: its trade data still names the press, but keeps
  the contact email of the day of the import (read in the code: the
  stand-in reads the press's settings at each export, a supplier its
  own record).
- **Way round**: on each imported book, edit each market to choose no
  supplier (and empty the "Taxation Type" that the market's edit window
  fills in), then delete the representative on "Representatives".

Medium: moving a book gives a wrong supplier on every such market,
silently, and the new press's trade data points buyers to another
press; there is a way round on screen, one market at a time.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- A second press, made on screen in step 6, since the dataset holds
  one.
- A Native XML file carries a format's ONIX product only when the
  press's contact name and email (the dataset has them) and its four
  "Publisher Identity" details (the dataset leaves them blank) are set.
  Step 2 sets them.

Steps:

1. Sign in as `dbarnes`.
2. Settings › Press › "Masthead" › "Publisher Identity": "Press
   Publisher Name" "Public Knowledge Press", "Geographical Location"
   "Vancouver", "Publisher Code Type" "Proprietary (01)", "Publisher
   Code" "PKP-01"; "Save".
3. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture" › "Publication Formats" › "Add publication format":
   name "Paperback u74ir8", "Paperback / softback (BC)", tick "This is a
   physical (non-digital) format."; "OK".
4. "Paperback u74ir8" › arrow › "Edit" › "Metadata" › "Market
   Territories" › "Add Market": "Countries Included" "Canada (CA)",
   "Date" "20261001", "Price" "25", "Supplier" left empty; "OK". The
   market's "Representatives" cell is empty. Close the format's "Edit"
   window with its "Cancel".
5. Tools › "Import/Export" › "Native XML Plugin" › "Export": tick
   submission 4, "Export Submissions", "Download Exported File".
6. Sign in as `admin`. Administration › "Hosted Presses" › "Create
   Press": name "u74ir8 Second Press", acronym "U74IR8", contact name
   "u74ir8 Second Press", contact email "u74ir8@mailinator.com",
   country "Canada", path `u74ir8`, English as the primary language;
   "Save".
7. In `u74ir8`: Tools › "Import/Export" › "Native XML Plugin" ›
   "Import": upload the file, "Import". The results name the new
   submission ("Submission "19" - "How Canadians Communicate: …"").
8. Open submission 19 in `u74ir8` › "Marketing" › "Representatives";
   then "Publication Formats" › "Paperback u74ir8" › "Edit" ›
   "Metadata" › "Market Territories".

**Expected**: no representative, and the market without a supplier, as
exported.

**Observed**: "Suppliers" lists "Public Knowledge Press" "Publisher to
end-customers (09)"; its "Edit" shows the email address
`rvaca@mailinator.com` (publicknowledge's principal contact) and the
website `http://<host>/index.php/publicknowledge`. The market's row
reads "Included: CA, Excluded:", "Public Knowledge Press", "25CAD".
The file of step 5 holds that supplier in place of none:

```xml
<onix:Supplier><onix:SupplierRole>09</onix:SupplierRole><onix:SupplierName>Public Knowledge Press</onix:SupplierName>
  <onix:EmailAddress>rvaca@mailinator.com</onix:EmailAddress>
  <onix:Website><onix:WebsiteRole>18</onix:WebsiteRole><onix:WebsiteLink>http://<host>/index.php/publicknowledge</onix:WebsiteLink></onix:Website></onix:Supplier>
```

Imported into `publicknowledge` itself instead (step 6 left out, step
7 taken there as `dbarnes`), the copy gets the same supplier. Its next
Native XML export writes that supplier with the press's name, email and
home page, as the stand-in did, and adds the copy's book page as a
second website.

## Cause

ONIX 3.0 requires a `Supplier` in every `SupplyDetail`, so
`MonographONIX30XmlFilter::createProductNode()` (OMP
`plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`,
lines 861–874) writes the press in place of a missing one: role `09`,
the press's "Press Publisher Name", its contact email and its home
page. The trade file needs it.

`NativeXmlPublicationFormatFilter::_processProductNode()` (OMP
`plugins/importexport/native/filter/NativeXmlPublicationFormatFilter.php`,
lines 336–364) then treats every `Supplier` as a representative of the
book: it builds one from the element and, unless the book already has
a supplier with the same role, name, website, phone and email, inserts
it and sets the market's supplier to it. Nothing tells the stand-in
from a supplier the press chose, so the import adds what the export
made up.

The stand-in can be told apart. Its name is the product's publisher
name (`PublishingDetail` › `Publisher` with `PublishingRole` `01`,
written from the same setting and kept in the Native XML file), and it
carries no book page, while every chosen supplier gets one (a `Website`
with `WebsiteRole` `29`, since `pkp/pkp-lib#9926` in 2024).

Reach:

- Every market without a supplier, in every format, into another press
  (walked) or the same one (walked).
- Agents are not reached: a market without an agent has no
  `PublisherRepresentative` in the file.

## Proposed fix

Leave the market without a supplier when its `Supplier` is the press's
stand-in: role `09`, named as the product's publisher, and without a
role-29 website
([fix-a19-press.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-a19-press.diff)):

```php
$supplierNode = $supplierNodeList->item(0);
// A market exported without a supplier names the press itself in its place, since ONIX
// requires one: it comes back as a market without a supplier.
if (!$this->_isPressInPlaceOfSupplier($node, $supplierNode, $onixDeployment)) {
    // build, match or insert the representative, as today
}
// the price and the rest as today

public function _isPressInPlaceOfSupplier($productNode, $supplierNode, $onixDeployment): bool
{
    if ($this->_extractTextFromNode($supplierNode, $onixDeployment, 'SupplierRole') !== '09') {
        return false;
    }
    foreach ($supplierNode->getElementsByTagNameNS($onixDeployment->getNamespace(), 'WebsiteRole') as $roleNode) {
        if ($roleNode->textContent === '29') {
            return false;
        }
    }
    $supplierName = $this->_extractTextFromNode($supplierNode, $onixDeployment, 'SupplierName');
    foreach ($productNode->getElementsByTagNameNS($onixDeployment->getNamespace(), 'Publisher') as $publisherNode) {
        if ($this->_extractTextFromNode($publisherNode, $onixDeployment, 'PublishingRole') === '01'
            && $this->_extractTextFromNode($publisherNode, $onixDeployment, 'PublisherName') === $supplierName) {
            return true;
        }
    }
    return false;
}
```

The fix lives in the import, which owns the mapping from file to
records; the export's stand-in stays. On the new press, the market
without a supplier then exports the new press as its stand-in, as a
book made there would. Both names are written as plain text nodes and
read back with `textContent`, so the exact comparison holds.

Tried on `main` within the combined
[fix-trial.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/fix-trial.diff),
which carries this fix and the four sibling ones; only this one decides
whether a supplier is created. With it, imported into the same press,
the copy's market without a supplier came back without one, no
"Public Knowledge Press" supplier was added, and the copy's export
wrote the press as stand-in again. Two suppliers the press chooses
itself, each made on "Representatives" › "Add Representative" with the
role "Publisher to end-customers (09)" and the website
`https://shop.example.org/`, and named on a market of "Paperback
u74ir8", came back as they were:

- "u74ir8 Press Shop", a name other than the press's;
- "Public Knowledge Press", exactly the "Press Publisher Name", which
  only the role-29 website tells apart from the stand-in.

The second-press walk was not repeated with the fix.

**Alternatives**:

- Mark the stand-in in the Native XML file (an attribute on the
  `publication_format`, or a list of markets without a supplier): an
  explicit signal, but a schema change for a fact the product already
  shows.
- Drop every role-09 supplier on import: a supplier a press chose with
  that role would be lost.

**What goes with it**:

- A file from before `pkp/pkp-lib#9926` (2024) has no role-29 website
  on any supplier. From such a file, a supplier the press chose with
  role 09 and named exactly as the press would be dropped too, losing
  its own phone, email and website; its market would then export the
  press's contact email and home page instead.
- Books imported before the fix keep the extra supplier; the press can
  clear it on screen. No repair is proposed, since a chosen supplier of
  the same shape cannot be told apart in the database.
- Backport: the supplier block is the same on `stable-3_5_0`,
  `stable-3_4_0` (lines 327–354) and `stable-3_3_0` (271–298), and the
  role-29 website is on all three (`pkp/pkp-lib#9926` was backported).
  The diff applies as it stands to `stable-3_5_0` and `stable-3_4_0`;
  `stable-3_3_0` has the same code indented with tabs
  (`NativeXmlPublicationFormatFilter.inc.php`), so the change is re-made
  there by hand.
- Guard: no test of the native import filters exists in OMP or
  pkp-lib, so a unit test of `NativeXmlPublicationFormatFilter` needs
  its own setup; an end-to-end export-and-import test with a market
  without a supplier and one with a chosen role-09 supplier is the
  lighter guard.

Small: one condition and a helper in the import, and a test.

The sibling reports, same round trip, other causes:

- [U74-A19-native-import-changes-supplier-websites.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A19-native-import-changes-supplier-websites.md)
  (the same supplier block, the websites)
- [U74-A11-native-import-unticks-rest-of-world.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A11-native-import-unticks-rest-of-world.md)
- [U74-A18-unsaved-format-states-no-returns-condition.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-unsaved-format-states-no-returns-condition.md)
- [U74-A18-native-import-resets-returns-and-availability.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A18-native-import-resets-returns-and-availability.md)

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-loses-trade-details/walk.js),
  run as
  `MODE=reach PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/native-import-loses-trade-details/walk.js`
  for these Steps (without `MODE=` for the same-press import,
  `MODE=pressname` for the supplier named as the press).
- Walked on PostgreSQL with pkp/datasets e8dafbc (2026-10-02): the
  same-press import on `main` and 3.5, with the same result, and the
  second-press import on `main`. Tips: OMP `main` 3b0ecf794
  (2026-09-29), its pkp-lib 3dc90c81a6; OMP `stable-3_5_0` 9c5e24246
  (2026-10-01), its pkp-lib cf3f984335.
- Not driven: an export from the second press, which has no "Publisher
  Identity". That an imported market's supplier goes out as the
  market's `Supplier` was walked on the same press.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp; the
  import's supplier block at the lines the Backport bullet names, and
  the export's stand-in (lines 781 and 758), the same as on `main`.
- Introduced: blame on lines 336–364 gives 01088072a8 (the 2021 PSR-12
  reformat); `git log -S` on `SupplierName` in the import filter gives
  2c06909 (`*8445*`, the old bug tracker), which wrote the supplier
  block. The export's stand-in is older (80bc049, 2012-01-25, also
  Jason Nugent).
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by onix import supplier, native import representatives, supplier, and
  `NativeXmlPublicationFormatFilter`: `pkp/pkp-lib#9926` (the download
  address in the ONIX export) added the role-29 website and is not this
  fault.
