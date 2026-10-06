# A press file's URN leaves out its format number, and file patterns leave "%f" unfilled

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; there file DOIs also lose the format under the default pattern)
- **Introduced** `pkp/omp#300` for `pkp/pkp-lib#1527` · [773825db3b](https://github.com/pkp/omp/commit/773825db3b472cab3e764c170414d832de2a73c0) · 2016-06-20 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press that gives URNs to files and keeps "Use default patterns." is
told by the URN settings window that a file's URN is "%p.%m.%f.%s":
press initials, book, publication format, file. A format file's
"Identifiers" tab instead previews and assigns
"urn:nbn:de:0000-{press initials}.{book}.{file}", with no format number.
Formats and chapters get the URNs the window lists for them.

A press that writes its own file pattern with "%f", which the window
describes as "the publication format id", gets the "%f" left in. The
file's URN tab then refuses to assign it ("The URN cannot be assigned
because it contains an unresolved pattern."). A file DOI made from a
custom pattern with "%f" is assigned with "%f" in it
("10.1234/jpk.5.%f.41"), under "Items successfully assigned new DOIs".
File DOIs under the "Default" DOI format are not affected.

## Impact

- **Lost**: the shape the press chose for its file identifiers. Nothing
  leaves OMP by itself: OMP ships no DOI deposit plugin, the book page
  does not show file DOIs, and URNs are registered by the press outside
  OMP. A wrong file URN or DOI can be cleared and assigned again until
  the press registers it.
- **Who**: a press manager or editor who gives URNs or DOIs to format
  files. Under default URN patterns every file's URN lacks the format;
  under an own file pattern or a custom DOI pattern that names "%f",
  every file's identifier keeps "%f".
- **Way round**: leave "%f" out of the file patterns, or type each
  file's URN suffix by hand (the individual suffix choice in the URN
  settings). Only typing gives the shape the press chose, file by file.

Medium: a press cannot get file URNs in the shape its own pattern asks
for, and gets file DOIs with "%f" in them without a warning. It is not
high because the wrong identifiers stay inside OMP, where they can be
cleared, and only presses that give identifiers to files meet it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP. The "URN" plugin is off
  in the dataset. Book 5, "Bomb Canada and Other Unkind Remarks in the
  American Media", is published with one publication format, "PDF",
  holding one file, "epilogue.pdf" (listed as "41 epilogue.pdf").

Default URN patterns:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins". Under "Public Identifier
   Plugins", tick "Enabled" on the "URN" row.
3. Click the "URN" row's arrow, then "Settings". Under "Press Content",
   tick "Publication Formats" and "Files". Fill "URN Prefix" with
   `urn:nbn:de:0000-`. Leave "Use default patterns." chosen; under it
   the window reads "%p.%m for monographs %p.%m.c%c for chapters
   %p.%m.%f for publication formats %p.%m.%f.%s for files." Choose
   `urn:nbn:de` as "Namespace", fill "Resolver URL" with
   `https://nbn-resolving.de/`, and click "Save".
4. Open book 5 › Publication › "Publication Formats".
5. Click the "PDF" row's arrow, then "Edit", then the "Identifiers" tab.
   Read the "URN" area, then click "Close".
6. Under "PDF", click the "epilogue.pdf" row's arrow, then "Edit"
   ("Edit a file"), then the "Identifiers" tab. Read the "URN" area,
   then click "Close".

Own URN pattern:

7. Open Settings › Website › "Plugins", click the "URN" row's arrow,
   then "Settings". Choose "Use the pattern entered below to generate
   URN suffixes. …", fill "for
   publication formats" with `%p.%m.%f` and "for files" with
   `%p.%m.%f.%s`, and click "Save".
8. Repeat step 6.

Custom DOI pattern:

9. Open Settings › Distribution › "DOIs" › "Setup". Fill "DOI Prefix"
   with `10.1234`, tick "Files" ("Monographs" stays ticked), choose
   "Custom pattern - (not recommended)" under "DOI Format", fill
   "Submissions" with `%p.%m` and "Files" with `%p.%m.%f.%s`, and click
   "Save".
10. Open "DOIs". Tick book 5, open "Bulk Actions", choose "Assign DOIs"
    and confirm. Expand book 5 and read the "PDF / epilogue.pdf" row.

**Expected**: step 5 previews `urn:nbn:de:0000-jpk.5.2` (press initials,
book 5, format 2). Steps 6 and 8 preview `urn:nbn:de:0000-jpk.5.2.41`
(format 2, file 41), as "%p.%m.%f.%s" says. Step 10's file row reads
`10.1234/jpk.5.2.41`.

**Observed**: step 5 previews `urn:nbn:de:0000-jpk.5.2`, as expected.
Step 6 previews the file's URN without the format:

```
URN
urn:nbn:de:0000-jpk.5.41
What you see is a preview of the URN. Select the checkbox and save the form to assign the URN.
Assign the URN to this file
```

Step 8 shows the "%f" unfilled, and no box to assign it:

```
URN
urn:nbn:de:0000-jpk.5.%f.41
The URN cannot be assigned because it contains an unresolved pattern.
```

Step 10 reports "Items successfully assigned new DOIs"; the file row
reads `10.1234/jpk.5.%f.41`, the book's row `10.1234/jpk.5`.

## Cause

OMP's `PubIdPlugin::getPubId()` (`classes/plugins/PubIdPlugin.php`)
makes every press item's URN that is not yet stored. It sets the item's
parents from its type and passes them to `generateDefaultPattern()` or
`generateCustomPattern()`:

```php
$representation = ($pubObjectType == 'Representation' ? $pubObject : null);
$submissionFile = ($pubObjectType == 'SubmissionFile' ? $pubObject : null);
```

For a chapter or a format it then looks up the publication and the
book. For a file it looks up the book only, never the format the file
belongs to, although a format file holds it in `assocType`/`assocId`
(`ASSOC_TYPE_REPRESENTATION`). So `$representation` stays null for a
file: the default pattern appends no format, and "%f" in an own pattern
is never replaced.

OMP's DOI code has the same gap. `Repository::mintSubmissionFileDoi()`
(`classes/doi/Repository.php`) passes `null` for the format to
`generateSuffixPattern()`, which hands it to the same
`generateCustomPattern()`. Under the "Default" DOI format it makes a
random eight-character suffix instead, so only "Custom pattern" is hit.

The settings texts and the code came in the same change, 773825db3b
(identifiers for OMP's formats and files). It added the text
"%p.%m.%f.%s for files" for DOIs, and a `getPubId()` that already set a
file without its format; the URN plugin (825986f471, `pkp/omp#306`)
copied the text. When DOIs moved out of the plugin in 3.4 (440b0394cb,
`pkp/pkp-lib#7014`), `mintSubmissionFileDoi()` was written with `null`
for the format.

Reach:

- Every place a file's URN is shown or stored goes through `getPubId()`:
  the tab's preview (`urnSuffixEdit.tpl`), its assignment
  (`PKPPubIdPluginHelper`) and the assign box of the window a proof
  file's approval opens (`urnAssign.tpl`) (code; the tab walked).
- Under default patterns, a file's URN can equal a format's own URN in
  the same book when the file's number equals the format's number: both
  read "{press}.{book}.{number}" (code; not met in the dataset).
- Where a wrong identifier goes (code): OMP has no DOI registration
  agency plugin on `main`, 3.5, 3.4 or 3.3; `monograph_full.tpl` shows
  the book's, chapters' and formats' DOIs and the formats' URNs, never a
  file's.
- On 3.3, DOIs still came from the plugin through the same
  `getPubId()`, whose default DOI pattern was also "%p.%m.%f.%s for
  files" (code).
- A symbol left in a DOI because the item lacks its value is
  [U45 A2/A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A2-A9-unfinished-doi-assigned.md);
  its fix would refuse a DOI holding "%f" rather than fill it.
- OJS has no file URNs or file DOIs, and OPS has no URN plugin (code).

## Proposed fix

Look up a format file's publication format where the other parents are
looked up: in `getPubId()`, and in the DOI twin
`mintSubmissionFileDoi()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-default-urn-no-format-number/fix.diff)).
`classes/plugins/PubIdPlugin.php`:

```diff
+use APP\core\Application;
 use APP\facades\Repo;
@@
         if (!$submission) {
             return null;
         }
+        // A format's file: its patterns name the format it belongs to.
+        if ($submissionFile && $submissionFile->getData('assocType') == Application::ASSOC_TYPE_REPRESENTATION) {
+            $representation = Application::getRepresentationDAO()->getById((int) $submissionFile->getData('assocId'));
+        }
```

`classes/doi/Repository.php` (it already imports `Application`):

```diff
-            $doiSuffix = $this->generateSuffixPattern($submissionFile, $context, $context->getData(Context::SETTING_DOI_SUFFIX_TYPE), $submission, null, null, $submissionFile);
+            $publicationFormat = $submissionFile->getData('assocType') == Application::ASSOC_TYPE_REPRESENTATION
+                ? Application::getRepresentationDAO()->getById((int) $submissionFile->getData('assocId'))
+                : null;
+            $doiSuffix = $this->generateSuffixPattern($submissionFile, $context, $context->getData(Context::SETTING_DOI_SUFFIX_TYPE), $submission, null, $publicationFormat, $submissionFile);
```

The `assocType` check is the one `PublicationFormatGridHandler` uses
for a format file. Tried on OMP `main`: the file's tab now previews
`urn:nbn:de:0000-jpk.5.2.41` under both default and own patterns, and
step 10's file row reads `10.1234/jpk.5.2.41`. The format's own tab and
a chapter's tab showed the same URNs with and without the fix.

**Alternatives**:

- Change the settings texts to "%p.%m.%s for files": the code stays,
  but "%f" in own file patterns stays broken and file identifiers lose
  the format the scheme was written for.
- Resolve the format inside `generateDefaultPattern()` and
  `generateCustomPattern()`, so the change sits in `PubIdPlugin` alone
  and still reaches the DOI path: but those static helpers take every
  parent as an argument today and look nothing up.

**What goes with it**:

- Identifiers already assigned are not rewritten: `getPubId()` returns
  a stored URN as it is, and a DOI is made once. After the fix, files
  assigned earlier keep the short URN or the "%f" DOI, and new ones get
  the format. A press that has not registered them can clear them (the
  tab's "Clear", the DOIs page's "Edit") and assign them again; no
  upgrade step is needed.
- Backport: the diff applies as it stands on `stable-3_5_0` and
  `stable-3_4_0`. On `stable-3_3_0` the one lookup goes into
  `PubIdPlugin.inc.php`'s `getPubId()` by hand (unnamespaced, with
  `DAORegistry::getDAO('PublicationFormatDAO')`); it covers 3.3's file
  DOIs too.
- Guard: a unit test of `getPubId()` for a format file under both
  pattern choices, and an e2e check of the file tab's preview.

Small: a three-line lookup in two OMP methods, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-default-urn-no-format-number/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp
  shared/playwright/checks/issues/press-file-default-urn-no-format-number/walk.js`
  on an install reset to the default dataset (its header gives the reset
  and the 3.5 commands). It takes Steps 1 to 10; `WALK=neighbour` reads
  the format's and the chapter "Prologue"'s tabs. The fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, the neighbour walked with
  the fix in and out, then reverted.
- Walked on `main` and `stable-3_5_0`, OMP, on PostgreSQL, the default
  dataset from pkp/datasets c657990 (2026-10-01): the same URNs and DOIs
  on both. The page script error that comes with choosing the own
  pattern in step 7 is spec U44's
  [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a11);
  no server error came with any step. MySQL not checked (nothing here
  depends on the database).
- Tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  9c5e24246c (lib/pkp cf3f984335); OMP `stable-3_4_0` 0aec65441f; OMP
  `stable-3_3_0` 8e72fc8836.
- Code reads on the older lines: `stable-3_4_0` has the same lines in
  `classes/plugins/PubIdPlugin.php` (72-73, 141-168) and
  `classes/doi/Repository.php` (109) and the same URN text, and the diff
  applies there (`patch --dry-run`). `stable-3_3_0`'s
  `classes/plugins/PubIdPlugin.inc.php` sets the file without its format
  (line 59) and appends only the file number (line 144); its URN and DOI
  plugins both go through it. No line ships a DOI agency plugin in
  `plugins/generic` or `plugins/importexport`.
- Introduced: `git blame` lands on 928796ee85 (`pkp/pkp-lib#5328`, which
  moved the lines); `git log` leads to 773825db3b, which the GitHub API
  maps to `pkp/omp#300`.
- Upstream search 2026-10-02, pkp/pkp-lib, pkp/omp and pkp/ui-library,
  issues and PRs: "URN file pattern", "URN default pattern", "URN
  files publication format", "OMP file URN", "URN", "unresolved
  pattern URN", "publication format id file", "DOI file suffix pattern
  %f", "DOI file pattern", "OMP file DOI format id", "%f",
  "generateDefaultPattern", "generateCustomPattern",
  "mintSubmissionFileDoi". The nearest, `pkp/pkp-lib#11915` (URN and DOI
  validation patterns) and `pkp/omp#1983` (the press initials in a
  publication's URN), are other faults.
- Unverified: the clash of a file's default URN with a format's URN
  (code only).
