# Editing a data citation, its identifier cannot be removed and a cleared Repository, Year or URL is kept

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no Data Citations table)
  - 3.4: none (code; no Data Citations table)
  - 3.3: none (code; no Data Citations table)
- **Introduced** the type list without an empty entry: `pkp/pkp-lib#12079` for `pkp/pkp-lib#6278` · [bd6bebd1fa](https://github.com/pkp/pkp-lib/commit/bd6bebd1faa00435910c67ee46fb1d7eb7298f00) · 2026-02-13 · Antti-Jussi Nygård (ajnyga); the rule that refuses a cleared identifier: `pkp/pkp-lib#12455` for `pkp/pkp-lib#12354` · [6be6b501c1](https://github.com/pkp/pkp-lib/commit/6be6b501c1817cec29efdd1e4aa072f3e4340ae2) · 2026-04-01 · the same author; the save that keeps a cleared field: `pkp/pkp-lib#10542` for `pkp/pkp-lib#10292` · [88ab86bb99](https://github.com/pkp/pkp-lib/commit/88ab86bb9930b4f3872dcb8f0d523b5d75c50c96) · 2024-11-12 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12658` (closed): the same fault, a cleared setting kept on save, fixed in the shared code for settings stored per language only; a field with one value, like these, is still kept
- **Tracked in** spec U42 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a15)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor who wants to drop a data citation's identifier finds no way to
do it on "Edit Data Citation": "Identifier type" has no empty entry, and
clearing "Identifier" is refused with "This field is required when
identifier type is present.". Replacing the identifier with another one
works; only removing it is blocked.

Emptying "Repository", "Year" or "URL" on the same panel looks like it
worked: "Save" closes the panel without a message. But the old value is
still there when "Edit" opens again, and it stays in the publication's
metadata.

It needs data citations turned on ("Enable data citation metadata", off
by default). A kept repository, year or URL shows in "View Data
Citation" and in a journal's JATS export. A kept URL also goes out in a
journal's Crossref and DataCite deposits and a preprint server's
Crossref deposit, for a data citation without an identifier.

## Impact

- **Lost**: the editor's correction. An identifier cannot be taken off,
  and an emptied repository, year or URL is kept without anyone being
  told; the URL can reach registered deposits.
- **Who**: editors and managers (and authors, wherever they may edit the
  publication) who correct a saved data citation, on the publication's
  "Data" page or in the wizard's "Data" section.
- **Way round**: delete the data citation and add it again without the
  field. If the editor had put the data citations in an order ("Order",
  "Save Order"), the new one loses its place. Only someone who reopens
  "Edit" learns that a cleared field was kept and that the way round is
  needed.

Medium: clearing a field of a saved data citation is a rare correction,
and the identifier half is refused openly; the silent keep and its reach
into registered deposits are what lift it above low. It would be high if
a field were kept on an ordinary edit, without the editor emptying it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Data
  citations are off in the dataset, so step 2 turns them on.

Setup:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open "Settings" › "Workflow" › "Submission" › "Metadata", tick
   "Enable data citation metadata" and press "Save".
3. Open submission 1 from "Submissions" ("Signalling Theory Dividends"
   on OJS, "The influence of lactation on the quantity and quality of
   cashmere production" on OPS; on OMP submission 4, "How Canadians
   Communicate: Contexts of Canadian Popular Culture"). In the side menu
   under "Publication" ("Preprint" on OPS), choose "Data".
4. Press "Add Data Citation". Type "u42r6 Dataset with DOI" as the
   Title, choose "DOI" as the Identifier type, type "10.1234/u42r6" as
   the Identifier, choose "Supporting data without specifying whether
   they were generated or analyzed (supporting)." as the Relationship
   type, type "u42r6 Repository" as the Repository, and press "Save".
   The row shows "10.1234/u42r6" above the title.

Removing the identifier:

5. Open the row's "More Actions" menu and choose "Edit".
6. Open the "Identifier type" list.
7. Choose its empty entry, if there is one. Clear the "Identifier" box
   and press "Save".

Clearing the repository:

8. Press "Close", reload the page and open "Data" again. Open the row's
   "More Actions" menu, choose "Edit", clear the "Repository" box and
   press "Save".
9. Open "Edit" again.

**Expected.** Step 6 offers an empty entry; with it chosen and
"Identifier" cleared, step 7 saves and the row shows the title alone.
After step 8 the "Repository" box is empty in step 9.

**Observed.** The same on the three apps:

- Step 6: "DOI", "Accession", "PURL", "ARK", "URI", "ARXIV", "ECLI",
  "Handle", "ISSN", "ISBN", "PMID", "PMCID", "UUID"; no empty entry.
- Step 7: "This field is required when identifier type is present."
  under "Identifier"; the panel stays open. The request answers 400:
  ```
  {"identifier":["This field is required when identifier type is present."]}
  ```
- Step 8: the panel closes with no message. The request answers 200,
  and its answer already carries the old value:
  `"repository":"u42r6 Repository"`.
- Step 9: "Repository" reads "u42r6 Repository"; "Identifier type" and
  "Identifier" still read "DOI" and "10.1234/u42r6".

## Cause

Two layers stop the removal.

**The form.** `DataCitationEditForm`
(`lib/pkp/classes/components/forms/dataCitation/DataCitationEditForm.php`,
line 40) builds the "Identifier type" options from the thirteen types
alone, so the select has no empty entry and a type once chosen can only
be changed. The schema then ties the two fields together
(`lib/pkp/schemas/dataCitation.json`, lines 51 and 62:
`required_with:identifierType` and `required_with:identifier`), so
"Identifier" cannot be cleared while a type is set. `ContributorForm`
(line 64) puts `['value' => '', 'label' => '']` first in its country
list so that a country can be unset; this list does not.

**The save.** A cleared box reaches the server as an empty string,
which `PKPBaseController::convertStringsToSchema()` turns into `null`
(line 459), and `DataCitation::update()` hands it to
`SettingsBuilder::update()`, which writes settings through
`EntityUpdate::updateSettings()`
(`lib/pkp/classes/core/traits/EntityUpdate.php`). There a `null` is
skipped by the write loop (line 79) and, on the `SettingsBuilder` path,
deleted only for a multilingual setting (line 164): a setting with one
value, like `repository`, `year`, `url`, `identifier` or
`identifierType`, keeps its row. 88ab86bb99 stopped that path from
deleting settings the caller left out, which was its aim, and with them
the ones it set to `null`; 8d88b035c6 (`pkp/pkp-lib#12683` for
`pkp/pkp-lib#12658`) brought the delete back for multilingual settings
only. So even with an empty type entry, removing the identifier would
answer 200 and keep it, as the repository is kept.

Reach:

- "Edit Data Citation" on the publication's "Data" page (walked, three
  apps; "Year" and "URL" walked cleared outside the Steps) and in the
  wizard's "Data" section, which opens the same panel (code).
- The REST API's `PUT …/dataCitations/{id}` (the same controller)
  (code).
- The exports that read the kept fields (code): OJS's JATS
  (`jatsTemplate` `ArticleBack`), OJS's Crossref deposit
  (`ArticleCrossrefXmlFilter`, lines 925, 952), OJS's DataCite deposit
  (`DataciteXmlFilter`, lines 791, 940) and OPS's Crossref deposit
  (`PreprintCrossrefXmlFilter`, line 503). The deposits send the
  identifier, or the URL when there is none.
- The other models on `SettingsBuilder` with a setting of one value
  (code):
  - `UserComment`: unapproving a comment sets `approvedAt` and
    `approvedByUserId` to `null`, and both are kept.
  - `Announcement`: removing a picture sets `image` to `null`;
    `save()` deletes the row itself (line 140).
  - `UserGroup` (`nameLocaleKey`, `abbrevLocaleKey`, `recommendOnly`)
    and `Funder` (`grants`, sent as `[]`): written as values, never
    cleared with `null`.
  - `ControlledVocabEntry` and `ReviewerRecommendation`: their settings
    of one value are never updated with `null`, so they are not
    affected.
  - No plugin bundled with the three apps defines such a model.
- `EntityDAO`'s path (publications, authors, galleys …) deletes a
  setting left out of an update, so it is not affected (code).

## Proposed fix

Recommended (a proposal; the team decides): give "Identifier type" an
empty entry; let a `null` delete a setting of one value on the
`SettingsBuilder` path, as it already does a multilingual one; check an
edit's identifier and type as a pair against what is stored; and have
`Announcement::save()` read its stored picture before saving
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/data-citation-identifier-cannot-be-removed/fix.diff),
four files in `lib/pkp`; excerpts):

```diff
--- a/lib/pkp/classes/components/forms/dataCitation/DataCitationEditForm.php
         $identifierTypes = array_map(fn($type) => ['value' => $type, 'label' => $type], $types);
+        // An empty entry, so that a saved identifier can be removed
+        array_unshift($identifierTypes, ['value' => '', 'label' => '']);
--- a/lib/pkp/classes/core/traits/EntityUpdate.php
-                if (!$this->isMultilingual($propName)) {
+                if (!$this->isMultilingual($propName) && $value !== null) {
--- a/lib/pkp/classes/dataCitation/Repository.php
+        // On every edit, check the identifier and its type as a pair: a half the request leaves out comes from the stored record
+        if ($dataCitation) {
+            foreach (['identifier', 'identifierType'] as $prop) {
+                if (!array_key_exists($prop, $props)) {
+                    $props[$prop] = $dataCitation->getAttribute($prop);
+                }
+            }
+        }
--- a/lib/pkp/classes/announcement/Announcement.php
+        $storedImage = $newlyCreated ? null : $this->getOriginal('image');
         $saved = parent::save($options);
…
-        if (!$hasNewImage && !$this?->image && $this->fresh()->image) {
-            $this->deleteImage();
+        if (!$hasNewImage && !$this?->image && $storedImage) {
+            $this->deleteImage($storedImage);
…
-    protected function deleteImage(): void
+    protected function deleteImage(?object $image = null): void
     {
-        $image = $this->fresh()->image;
+        $image ??= $this->fresh()->image;
```

- The empty entry follows `ContributorForm`'s country list. An empty
  type and an empty identifier both arrive as `null`, which `nullable`
  and `required_with` accept, while a type without an identifier, or an
  identifier without a type, is still refused.
- The delete belongs in the shared trait, where `pkp/pkp-lib#12658` put
  the multilingual one: an Eloquent attribute set to `null` means "no
  value", and the `EntityDAO` path already deletes such a setting.
  `SettingsBuilderTest` keeps its rule that an empty array given to a
  setting of one value is stored as a value.
- The pair check: validation reads only the fields a request carries,
  so a REST `PUT` with `identifier: null` alone would pass and, with the
  delete, remove half of the pair. Filling in the stored other half
  before validating keeps the pair whole. It runs on every edit, not
  only when one half is sent; the panel always sends both, so for the
  screens nothing changes. Two effects for API callers and plugins:
  - A `PUT` that changes only the type now has the stored identifier
    checked against the new type, and is refused when it does not fit
    (`"{identifier}" is not a valid {type} identifier.`). That is
    intended: the pair the save would store is the pair checked.
  - The `DataCitation::validate` hook now receives in `$props` the
    stored identifier and type when the request did not send them.
- `Announcement`: after the trait deletes a removed picture's row,
  `fresh()->image` reads `null`, and the picture's file would stay on
  disk. Reading the image as loaded (`getOriginal()`) before
  `parent::save()` keeps the file delete working. The fix for
  [pkp-e2e#771](https://github.com/jardakotesovec/pkp-e2e/issues/771)
  ([U12-A12-announcement-image-files-left-behind.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U12-A12-announcement-image-files-left-behind.md))
  makes the same change and more, with another `deleteImage()`
  signature; the two diffs conflict in `save()` and `deleteImage()`, and
  neither applies on top of the other. If that fix lands first, this one
  needs no `Announcement` change; otherwise it carries its own, as
  here.

Tried on `main` on the three apps, and the revised fix again on OJS: the
walk showed Expected. A type without an identifier, and an identifier
with the empty type, are still refused; changing the identifier saves
and keeps the other fields; a data citation added without an identifier
saves; and "Year" and "URL" cleared are gone on the next "Edit" (kept
without the fix). An announcement's picture removed with "Remove" and
"Save" is gone from the public files folder and its row deleted, with
the fix in and out; a title-only edit keeps it.

**Alternatives**

- Delete the cleared settings in `DataCitation` (a `saved` hook, as
  `Announcement` does for its image): fixes this panel, but leaves every
  other model on `SettingsBuilder`, `UserComment` among them, with the
  same trap.
- Store an empty string instead of deleting: the controller turns empty
  strings into `null` for every field, and readers of the settings
  table would have to tell "" from a missing row.
- Accept a partial `PUT` as it is: today it changes nothing, but with
  the delete it would store a type without an identifier (or the
  reverse), which the panel's own rules refuse.

**What goes with it**

- Behaviour change: a `SettingsBuilder` update that passes `null` for a
  setting of one value now deletes it. `UserComment` then forgets who
  approved a comment once it is unapproved, which is what unapproving
  means.
- No data repair: values the panels failed to clear cannot be told from
  values meant to be kept.
- 3.5 has the same `EntityUpdate` branch (backported as
  `pkp/pkp-lib#12834`) but no data citations; the trait and
  `Announcement` changes apply there as written if the team wants them
  for the other models.
- Guard: a `SettingsBuilderTest` case that updates a schema-backed
  setting of one value to `null` and expects its row gone; a
  `DataCitation` repository test for a `PUT` with half of the pair; and
  an e2e walk in spec U42 that removes an identifier and a repository on
  "Edit Data Citation" (a Planned item).

Medium: four files in pkp-lib, and the shared trait's new meaning of
`null` is a change every model on `SettingsBuilder` inherits.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/data-citation-identifier-cannot-be-removed/walk.js),
  with the helpers of
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/data-citation-added-after-order-goes-first/lib.js).
  It takes the Steps as `dbarnes` on PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03), reads the panel's fields, the save's answer and
  the stored settings for reference; between steps 7 and 8 it also
  reopens "Edit" once to read the stored values. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/data-citation-identifier-cannot-be-removed/walk.js`;
  the argument `nb` instead checks what the fix must keep (the refusals,
  an identifier change, an add without an identifier) and clears "Year"
  and "URL". The announcement check is the U12 A12 report's
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-image-files-left-behind/walk.js)
  with `MODE=neighbour`, which lists the public files folder after each
  step.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database): OJS ff004d0973 (pkp-lib 987776cd04), OMP 3b0ecf794 and OPS
  c8af945bb7 (pkp-lib 3dc90c81a6); the four files of fix.diff, the
  controller and `dataCitation.json` are identical in both pkp-lib
  commits.
- Code reads:
  - 3.5 (OJS c1cee76b95, OMP 9c5e24246, OPS 38b61882d3; pkp-lib
    771474347e and cf3f984335): no data citations (bd6bebd1fa is not on
    `stable-3_5_0`); `EntityUpdate.php` has the same multilingual-only
    branch (line 156).
  - 3.4 (pkp-lib 767353f4fe) and 3.3 (pkp-lib ac3fa73402): no data
    citations and no `SettingsBuilder`.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched (2026-10-04). `pkp/pkp-lib#12705` (open, "SettingsBuilder
  gotchas") lists other faults of the same builder, not this one;
  `pkp/pkp-lib#10562` (closed) is the older multilingual case.
- Unverified: a `PUT` with half of the pair was read in the code, not
  sent, since no screen sends one. The revised fix (pair check and
  `Announcement`) was walked on OJS only; OMP and OPS walked the first
  version (the form and the trait).
