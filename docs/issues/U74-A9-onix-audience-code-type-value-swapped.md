# A book's "Audience" goes out in its ONIX data the wrong way round, so "Children" reads as a proprietary code

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced to a PR; [47eeca3](https://github.com/pkp/omp/commit/47eeca316b08ac6536114d0cd289cfe06ad982c9) · 2012-01-11 · Jason Nugent (jnugent)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor chooses a book's audience on "Marketing" › "Audience",
for example "Children (02)". The book's ONIX data puts the chosen
audience's code in the code-type field, which says which list the code
comes from, and "01" in the field that should hold the audience itself.
So a book for "Children (02)" reaches the trade as audience "01" in a
publisher's own ("proprietary") code scheme. Only "General / adult
(01)" comes out right.

The other audiences name other schemes: "Teenage (03)" reads as an MPAA
film rating of "01", and "Professional and scholarly (06)" as a code in
the French-language BTLF scheme. Nothing on screen warns the press. The
press's own Native XML import reads the value back the same wrong way,
so moving a book between two presses restores the right audience and
hides the fault. The ONIX 3.0 tool and the Native XML export both carry
it.

The stored audience is right; only the output is wrong. So a fix changes
the export and the Native XML import, needs no repair of stored data,
and files exported before it still import correctly.

## Impact

- **Lost**: the book's audience in the ONIX data sent to the trade. A
  recipient that reads ONIX audience codes finds none; one that reads
  the scheme the code-type field names finds a wrong value.
- **Who**: presses that set "Audience" and send ONIX data to
  distributors, retailers or aggregators. "Professional and scholarly
  (06)", the natural choice for a scholarly press, is affected.
- **Way round**: none on screen. Files already sent stay wrong until
  they are sent again after a fix.

Medium: a secondary output is wrong in one field, silently, for every
book with an audience other than "General / adult". It would be high if
an ONIX recipient were known to drop or misfile books on it.

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

The steps read the ONIX data inside the Native XML export, because on a
fresh `main` install the ONIX 3.0 tool's own export fails for every book
([U74 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A1-onix-export-fails-every-book.md)).
Both exports build the ONIX data with the same PHP filter.

1. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture" (in Production, one format "PDF"), and choose
   "Marketing" › "Audience" in its side menu.
2. Choose "Children (02)" in "Audience" and press "Save".
3. Go to Tools › "Import/Export" › "Native XML Plugin" and open the
   "Export" tab. Tick "How Canadians Communicate: Contexts of Canadian
   Popular Culture", press "Export Submissions", then "Download Exported
   File".
4. In the file, find the `onix:Audience` element of the "PDF" product.
5. Back on "Marketing" › "Audience", choose "Professional and scholarly
   (06)" and press "Save".
6. Export the book again as in step 3 and find `onix:Audience`.

**Expected**: "01" as the code type (ONIX list 29, "ONIX audience
codes") and the chosen audience as the value (list 28):

```xml
<onix:Audience><onix:AudienceCodeType>01</onix:AudienceCodeType><onix:AudienceCodeValue>02</onix:AudienceCodeValue></onix:Audience>
```

and `01` with `06` after step 6.

**Observed**: both exports read "The export completed successfully.",
and the code type and value are swapped. Step 4:

```xml
<onix:Audience><onix:AudienceCodeType>02</onix:AudienceCodeType><onix:AudienceCodeValue>01</onix:AudienceCodeValue></onix:Audience>
```

Step 6: `<onix:AudienceCodeType>06</onix:AudienceCodeType><onix:AudienceCodeValue>01</onix:AudienceCodeValue>`.
In list 29, "02" is "Proprietary" and "06" is "BTLF audience code".

## Cause

`MonographONIX30XmlFilter::createProductNode()`
(`plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`,
lines 491–492) writes the stored `audience` as `AudienceCodeType` and the
constant '01' as `AudienceCodeValue`:

```php
$audienceNode->appendChild($this->buildTextNode($doc, 'AudienceCodeType', $submission->getData('audience')));
$audienceNode->appendChild($this->buildTextNode($doc, 'AudienceCodeValue', '01'));
```

The "Audience" page offers ONIX list 28 (`AudienceForm` reads
`getCodes('28')`), so `audience` holds a list 28 code. In ONIX 3.0,
`AudienceCodeType` takes a list 29 code, which says which scheme the
value comes from, and `AudienceCodeValue` a value in that scheme. Type
"01", "ONIX audience codes", means the value is a list 28 code. The two
arguments are swapped. The commit that wrote these
lines, 47eeca3, carried the comment "01 -> ONIX List 29 - ONIX Audience
Codes using List 28 in previous field": the intent was type 01 and the
list 28 code as the value. Before it, the export wrote the list 28 code
in an `AudienceCode` element, which carried the right value (ONIX 3.0
has since deprecated that element).

The schema check the export runs does not catch it. Every list 28 code
(01 to 09 and 11 to 14) is also a valid list 29 code, and `AudienceCodeValue` is any
non-empty text to the schema.

`NativeXmlPublicationFormatFilter::_processProductNode()`
(`plugins/importexport/native/filter/NativeXmlPublicationFormatFilter.php`,
line 159), added in 2c06909, reads `audience` back from
`AudienceCodeType` and ignores `AudienceCodeValue`, mirroring the
export's mistake.

Reach:

- Both exports run the same filter class: the ONIX 3.0 tool through the
  filter group `monographs=>onix30-xml` (`Onix30ExportPlugin`, code), and
  the Native XML export through `monograph=>onix30-xml`
  (`PublicationFormatNativeXmlFilter` line 58, walked).
- "Children (02)" and "Professional and scholarly (06)" walked; the
  other audiences follow from list 28 against list 29 (code).
- `AudienceRange` is written correctly (walked).
- Stored data is right: after step 2, `submission_settings` holds the
  row for submission 4 with `setting_name` `audience` and
  `setting_value` `02`.

## Proposed fix

Swap the two values in the export, and make the Native XML import read
both the corrected files and the files earlier versions wrote:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/onix-audience-code-type-value-swapped/fix.diff).

```diff
-            $audienceNode->appendChild($this->buildTextNode($doc, 'AudienceCodeType', $submission->getData('audience')));
-            $audienceNode->appendChild($this->buildTextNode($doc, 'AudienceCodeValue', '01'));
+            $audienceNode->appendChild($this->buildTextNode($doc, 'AudienceCodeType', '01')); // List 29: ONIX audience codes, so the value is from List 28
+            $audienceNode->appendChild($this->buildTextNode($doc, 'AudienceCodeValue', $submission->getData('audience')));
```

```diff
-            $submission->setData('audience', $this->_extractTextFromNode($node, $onixDeployment, 'AudienceCodeType'));
+            // AudienceCodeType 01 (List 29) carries a List 28 audience in AudienceCodeValue. Files from
+            // OMP before that was fixed carry the List 28 code as the type and 01 as the value. An
+            // audience in any other scheme has no OMP equivalent.
+            $audienceCodeType = $this->_extractTextFromNode($node, $onixDeployment, 'AudienceCodeType');
+            $audienceCodeValue = $this->_extractTextFromNode($node, $onixDeployment, 'AudienceCodeValue');
+            if ($audienceCodeType === '01') {
+                $audience = $audienceCodeValue;
+            } elseif ($audienceCodeValue === '01') {
+                $audience = $audienceCodeType;
+            } else {
+                $audience = null;
+            }
+            $submission->setData('audience', $audience);
```

The fix goes in the filter that writes the product, the one place both
exports build it. The import takes the value when the type is `01`, as
ONIX means it. Every file an earlier OMP wrote has the value `01`, so a
value of `01` under another type marks such a file, and the import takes
the type. Any other pair is an audience in a scheme OMP does not offer,
such as an MPAA rating, and stores no audience rather than a wrong one.

Tried on `main`: steps 4 and 6 gave `01`/`02` and `01`/`06`. With the
fix in and out alike, "General / adult (01)" exported as `01`/`01`, a
book with no audience had no `Audience`, and the grade range "(from)"
"Ninth Grade (9)" "(to)" "Twelfth Grade (12)" exported the same. With
the fix in, three imports into the same press gave:

- the file the fixed export wrote: books on "Children (02)" with the
  grade range kept, and on "General / adult (01)";
- a file exported before the fix (`02`/`01`): a book on "Children (02)";
- that file edited by hand to type `03` (MPAA rating) and value `PG`: a
  book with no audience.

**Alternatives**:

- Write the deprecated `AudienceCode` element (list 28) instead, as
  before 47eeca3. ONIX 3.0 marks it "Deprecated – use <Audience>
  instead", so recipients may drop it.
- Fix the export alone. A file exported after the fix would then import
  as "General / adult (01)" on any book, since the import would read the
  type `01` as the audience.
- Take the type whenever it is not `01`. That also reads old files, but
  it stores an audience from another scheme as an OMP audience: an MPAA
  type `03` would import as "Teenage (03)".

**What goes with it**:

- No data repair: the stored audience is right.
- Presses that sent ONIX data with an audience may want to send it
  again; a release note can say so.
- Backport: the same two lines are on 3.5, 3.4 and 3.3 (on 3.4 and 3.3
  with `_buildTextNode()`, on 3.3 in the `.inc.php` files). The diff
  applies to 3.5 as it stands, and to the older lines with those names
  changed.
- Guard: in OMP, a new case in `MonographONIX30XmlFilterTest`, whose
  monograph sets no audience today: give it an audience of "02" and
  assert
  `//onix:Audience[onix:AudienceCodeType='01']/onix:AudienceCodeValue`
  is "02". In this repository, a U74 scenario that reads the product's
  `Audience` (a Planned item).

Small: two lines swapped in one filter and a three-way rule in the
import, with a new case in an existing unit test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/onix-audience-code-type-value-swapped/walk.js),
  which takes the Steps on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/onix-audience-code-type-value-swapped/walk.js`.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02); both gave the same results, with no server error. Tips: OMP `main` 3b0ecf794 (2026-09-29), its pkp-lib
  3dc90c81a6. OMP `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib
  cf3f984335. The checks around the fix (below) were walked on `main`
  only. Each import also listed "Warnings encountered:
  Publication Unknown element sequence", with the fix in and out; that
  is not this fault.
- Introduced: blame on lines 491–492 gives dca0635 (2024, a rename of
  `_buildTextNode()`) and 01088072a8 (2021 reformatting). `git log -S`
  on `'AudienceCodeValue', '01'` leads to d349f61 (2013, the move to
  PHP DOM, the same two values) and to 47eeca3 (2012-01-11, "*6975*
  further ONIX export plugin enhancements", pkp's old bug tracker), which
  replaced `AudienceCode` with the swapped `Audience`. GitHub lists no
  PR for it. It precedes OMP's first release tag, `omp-0_9_9-0`. The
  import's reading came with
  [2c06909](https://github.com/pkp/omp/commit/2c06909d05067deadcd289386a58604bfebd83fa)
  (2013-12-03, Jason Nugent, "*8445* import publication format ONIX data
  for native imports").
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp. Read on
  each: the filter's two `Audience` lines (3.4 lines 462–463, 3.3
  `MonographONIX30XmlFilter.inc.php` lines 456–457, the same swap), the
  import's `AudienceCodeType` read (3.4 line 158, 3.3 line 134) and
  `AudienceForm`, which offers list 28 on both.
- ONIX lists read from the checkout's
  `plugins/importexport/onix30/ONIX_BookProduct_CodeLists.xsd` (List28,
  List29) and `ONIX_BookProduct_3.0_reference.xsd` (`Audience`,
  `AudienceCodeValue` as `dt.NonEmptyString`, `AudienceCode`
  deprecated).
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words (ONIX audience, onix audience code, audience)
  and by `AudienceCodeType`, `AudienceCodeValue` and
  `MonographONIX30XmlFilter`; the one hit, `pkp/pkp-lib#6609` (the
  ONIX export keeping only the last book), is another fault.
- Not driven: the ONIX 3.0 tool on 3.5 (code only; it runs the same
  filter). The "Teenage (03)" mapping is read from the lists, not walked.
- Unverified: how a given ONIX recipient treats the swapped element.
  MySQL not checked; the fault does not depend on the database.
