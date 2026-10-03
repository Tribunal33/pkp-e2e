# An e-book's "Metadata" tab asks for page counts and dimensions, never for its file size or DRM

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#700` for `pkp/pkp-lib#2072` · [ce205d5](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) · 2019-08-21 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a6)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press editor opens the "Metadata" tab of a digital publication
format, such as a PDF or an e-book whose "Physical format" box is
unticked. The tab asks for "Page Counts", "Returnable Indicator" and
"Physical Dimensions", as it does for a paperback. It never shows
"Digital Information", where the press would enter the e-book's own
file size and its "Digital Technical Protection" (DRM). A format hosted
at another website should show neither the physical groups nor
"Digital Information", but it gets the physical groups too.

So no press can enter an e-book's own file size or its DRM. The
book's ONIX product carries the file size OMP works out from the
format's files, and no DRM statement; a remotely hosted format with
no files gets "0.3" megabytes.

A digital format whose tab has been saved also stores the tab's
preselected physical values, "Canada (CA)" as country of manufacture
and "Yes, returnable, full copies only (Y)". Its ONIX product states
the country, and the returns code for each market it is sold in.

## Impact

- **Lost**: an e-book's own file size and DRM statement, in the
  format's stored metadata and in the ONIX product sent to trade
  partners. Once its tab is saved, the e-book's ONIX product also
  names Canada as country of manufacture and, in its markets, states
  it returnable.
  Nobody is told.
- **Who**: press managers and editors who catalog digital formats,
  which in many presses are all the formats a book has.
- **Way round**: none on screen.

Low: the ONIX product lacks two optional statements, the file size
falls back to a computed one, and the cataloguing itself gets done. It
would be medium if a trade partner needed an e-book's own file size or
DRM statement, or acted on the stray "Canada" and "returnable" codes
in its e-book products.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- Book 4, "How Canadians Communicate: Contexts of Canadian Popular
  Culture", is in Production. Its one format, "PDF", has "Physical
  format" unticked and is hosted at another website.
- The dataset has no digital format held by the press on a book that
  can still be edited, and no physical format, so steps 2 and 6 add
  one of each.

Digital format:

1. Sign in as `dbarnes`. Open submission 4, then Publication ›
   "Publication Formats".
2. Press "Add publication format". Name "E-book u73b", "Format"
   "Digital (on physical carrier) (DA)" (the code the dataset's PDF
   uses; the fault depends only on "Physical format"), leave
   "Physical format" and "This format will be available at a separate
   website" unticked. Press "OK".
3. On "E-book u73b" press the arrow, then "Edit", then the "Metadata"
   tab.

Remotely hosted format:

4. Press the tab's "Cancel". On "PDF" press the arrow, then "Edit": the
   "Edit" tab shows "Physical format" unticked and "This format will be
   available at a separate website" ticked, with the file's address.
5. Press the "Metadata" tab.

A physical format (the control):

6. Press the tab's "Cancel", then "Add publication format". Name
   "Paperback u73b", "Format" "Paperback / softback (BC)", "Physical
   format" ticked. Press "OK".
7. On "Paperback u73b" press the arrow, then "Edit", then "Metadata".

**Expected**: after "Imprint (Brand Name)", step 3's tab shows
"Digital Information" with "File Size in Mbytes", "Digital Technical
Protection" and "Enter your own file size value?", and none of the
physical groups. Step 5's tab shows neither the physical groups nor
"Digital Information", since the press does not hold the file. Step
7's tab shows the physical groups.

**Observed**: all three tabs end the same way, read top to bottom
after "Imprint (Brand Name)":

```
Page Counts | Front Matter | Back Matter | Returnable Indicator |
Physical Dimensions | Height | Width | Thickness | Weight |
Country of Manufacture | Cancel | Save
```

None of the tabs shows "Digital Information", "File Size in Mbytes",
"Digital Technical Protection" or "Enter your own file size value?".

## Cause

`PublicationFormatGridHandler::editFormatMetadata()` (OMP
`controllers/grid/catalogEntry/PublicationFormatGridHandler.php`, line
662) builds the tab's form with three arguments:

```php
$publicationFormatForm = new PublicationFormatMetadataForm($this->getSubmission(), $this->getPublication(), $representation);
```

The form's constructor
(`controllers/grid/catalogEntry/form/PublicationFormatMetadataForm.php`,
line 75) takes the format's kind as two more arguments,
`$isPhysicalFormat = true` and `$remoteURL = null`, and never reads it
from the format it was given. So every format is treated as a physical
one held by the press. `fetch()` hands both values to
`templates/controllers/tab/catalogEntry/form/publicationMetadataFormFields.tpl`,
whose lines 90–94 choose the groups: `{if $isPhysicalFormat}` the
physical template, `{elseif !$remoteURL}` the digital one, otherwise
neither. The first branch always wins.

ce205d5 (2019, the versioning rework that split publications from
submissions) moved the tab from the catalog entry window to the formats
list and added these two handler methods. The code it replaced, in
`CatalogEntryTabHandler`, passed the format's own values,
`getPhysicalFormat()` and `getRemoteURL()`, on both paths: loading the
tab (`publicationMetadata()`) and saving it
(`_getFormFromCurrentTab()`). The new calls left them out, so the
template's choice, which worked up to 3.1, has been dead since 3.2.

Reach:

- `updateFormatMetadata()` (line 680) builds the form the same way.
  Every save of a digital format's tab stores the physical groups'
  values and clears its file size and protection, since the form posts
  neither (code).
- So digital formats saved since 3.2 hold physical values: the tab's
  preselected "Canada (CA)" country and "Yes, returnable, full copies
  only (Y)" among them, which the ONIX filter writes for any format
  (`CountryOfManufacture`, and `ReturnsConditions` in each market's
  supply details) (code).
- `MonographONIX30XmlFilter` writes `EpubTechnicalProtection` only for
  a non-physical format whose protection code is stored. No screen can
  store that code (code).
- The same filter writes a non-physical format's file size `Extent`
  from the stored size, which no screen can store either, so it falls
  back to `PublicationFormat::getCalculatedFileSize()` (code).
- Measurements are written for physical formats only, so dimensions
  typed for an e-book are kept but go nowhere; the book's page shows
  them for physical formats only (code).
- No other code builds this form: OMP, its pkp-lib and its plugins
  searched.

## Proposed fix

Let the form read the format's kind from the format it is given,
unless a caller passes it, and save only the group it showed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-metadata-tab-always-physical/fix.diff),
OMP `PublicationFormatMetadataForm.php` only):

```php
public function __construct($submission, $publication, $representation, $isPhysicalFormat = null, $remoteURL = null, $stageId = null, $formParams = null)
…
$this->_isPhysicalFormat = $isPhysicalFormat ?? (bool) $representation->getPhysicalFormat();
$this->_remoteURL = $remoteURL ?? $representation->getData('urlRemote');
```

and in `execute()`, the composition, detail, imprint and availability
are set as today, then the physical fields only when
`$this->getPhysicalFormat()`, and the file size and protection only
`elseif (!$this->getRemoteURL())`, the template's own branches. The
fields of the group the tab did not show keep their stored values, so
page counts typed for an e-book since 3.2 still reach its ONIX product
after the next save rather than being cleared silently.

Both handler methods, and any plugin, build the tab through this form,
so the constructor covers every caller. Passing the two values from
`editFormatMetadata()` and `updateFormatMetadata()` instead, as the
code before ce205d5 did, gives the same result today but leaves a
default that is wrong for most formats.

Tried on `main`: with the fix, step 3's tab showed "Digital
Information" and its three fields and no physical group; a file size
of 12 with "Enter your own file size value?" ticked and "Adobe DRM
(03)" were kept after "Save"; step 5's tab showed neither group; step
7's was unchanged. The paperback's tab, with and without the fix,
kept a "Height" of 210 after "Save".

**Alternatives**:

- Leave `execute()` writing every field, as before 3.2: the next save
  of a digital tab would then clear the stale physical values, wrong
  country and returns code included, but also any page counts a press
  entered for its e-books.

**What goes with it**:

- Page counts: the physical template holds "Page Counts", so with the
  fix an e-book's tab no longer offers them, though the ONIX filter
  writes them for every format. If the team wants them on every
  format (`pkp/pkp-lib#9602` discusses page counts for digital
  formats), move that area into `publicationMetadataFormFields.tpl` and
  set `frontMatter` and `backMatter` outside the branch: a product
  choice, not in the diff.
- Stored data: digital formats saved since 3.2 keep the "Canada (CA)"
  and "Yes, returnable" codes they hold, and their ONIX products keep
  stating them. Whether the export should skip those for non-physical
  formats, or an upgrade clear them, is the team's call; a stored value
  cannot tell a press's choice from the preselected one.
- The computed file size: with the fix, every digital tab without a
  stored size shows `PublicationFormat::getCalculatedFileSize()` in
  "File Size in Mbytes", and that method returns
  `sprintf('%d.3', $fileSize / (1024 * 1024))`: whole megabytes
  followed by ".3" ("0.3" for no files, "2.3" for 2.7 MB). The ONIX
  product already carries that value today. `sprintf('%.3f', …)` gives
  "0.000" and "2.700" (checked in PHP). It is a separate fault, not in
  the diff, but it should ship with this fix, since this fix puts it on
  screen.
- Backport: the diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0`; `stable-3_3_0` has the same code in
  `PublicationFormatMetadataForm.inc.php`, indented with tabs, so it is
  re-made by hand there.
- Guard: spec U73's scenario 2 asserts the "Digital Information" group
  on a digital format's tab once fixed (Rule 17b).

Small: two lines in the constructor and a branch in `execute()` of one
OMP form, tried, with an end-to-end check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-metadata-tab-always-physical/walk.js)
  (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-metadata-tab-always-physical/lib.js)),
  run as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/format-metadata-tab-always-physical/walk.js`;
  `MODE=neighbour` runs the paperback check alone. The fix was tried
  with `node bin/try-fix.js apply shared/playwright/checks/issues/format-metadata-tab-always-physical/fix.diff omp`,
  the walk and the neighbour run, then `revert`.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets 566bb1f
  (2026-10-03); both gave the Observed above, and no request failed.
  Tips: OMP `main` 3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6;
  OMP `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib cf3f984335;
  the 3.5 code is the same (handler lines 658 and 676, template lines
  90–94).
- 3.4 and 3.3 (code): pkp/omp `upstream/stable-3_4_0` 0aec65441
  (2026-09-25), handler lines 659 and 677, form constructor line 71;
  `upstream/stable-3_3_0` 8e72fc883 (2026-09-18),
  `PublicationFormatGridHandler.inc.php` lines 584 and 600, form
  constructor line 55. Both build the form with three arguments over a
  `$isPhysicalFormat = true` default, and both templates carry the
  same branches.
- Introduced: `git log -S'new PublicationFormatMetadataForm('`
  gives ce205d5 alone, whose diff removes the
  `CatalogEntryFormatMetadataForm` calls that passed
  `getPhysicalFormat()` and `getRemoteURL()`. `commits/<sha>/pulls`
  names `pkp/omp#700`, merged 2019-09-05.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by "digital information", file size, "physical format",
  "physical dimensions", "technical protection", DRM,
  `PublicationFormatMetadataForm`, `editFormatMetadata` and
  `isPhysicalFormat`. Read and not the same fault: `pkp/pkp-lib#9602`
  (page counts in ONIX; it notes the tab shows front and back matter
  for every format), `pkp/pkp-lib#7550` (the tab missing before the
  first save), `pkp/pkp-lib#8847` and `pkp/pkp-lib#6496` (the tab
  failing to load).
- Read in the code, not driven: the ONIX output of a digital format,
  and the stored values after a save of a digital tab. The "0.3" on
  the fixed tab was seen on "E-book u73b", which has no files.
