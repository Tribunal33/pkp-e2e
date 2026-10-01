# A press's format files get URNs without their format number, or none when the files pattern uses "%f"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#300` for `pkp/pkp-lib#1527` · [773825db](https://github.com/pkp/omp/commit/773825db3b472cab3e764c170414d832de2a73c0) · 2016-06-20 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Under "Use default patterns." the URN plugin's settings window lists
"%p.%m.%f.%s for files": press initials, book, publication format,
file. A format file's "Identifiers" tab instead previews, and "Save"
assigns, `urn:nbn:de:0000-jpk.14.113`: press "jpk", book 14, file 113,
with the format's number (3) missing.

Under "Use the pattern entered below…", a files pattern with "%f", as
the window's own help offers it, makes the file's URN
`urn:nbn:de:0000-jpk.14.%f.113`. The tab refuses to assign it, so no
file gets a URN until the press drops "%f" from the files pattern, and
with it the format's number.

## Impact

- **Lost.** Under the default patterns, the announced shape: file URNs
  are assigned without the format's number, silently. Under a files
  pattern with "%f", every file URN: the tab says only "The URN cannot
  be assigned because it contains an unresolved pattern."
- **Who.** A press that turns on the URN plugin (off by default) with
  "Files" ticked: every file of every format. A file's URN is assigned
  only by a person, on the file's "Identifiers" tab or in the window
  shown when a proof file is approved, and both show the URN first;
  publishing assigns none. It leaves OMP only in the press's own native
  XML export and the REST API's file data; the book page, ONIX and
  OAI-PMH carry no file URN, and OMP registers no URN anywhere.
- **Way round.** A files pattern without "%f" (`%p.%m.%s`), which gives
  the default's shape without the format. The announced shape is
  reachable only by "Enter an individual URN suffix for each published
  item", which switches books, chapters and formats to hand-typed
  suffixes too.

Medium: under a files pattern with "%f", assigning a file's URN cannot
be done at all, and the way round gives up the format's number. Under
the default patterns alone it would be low: the URN is valid and
unique, and nothing outside the press reads the format from it.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. Press `publicknowledge`, acronym
  "JPK". Submission 14, "From Bricks to Brains: The Embodied Cognitive
  Science of LEGO Robots", has one publication format, "PDF" (format 3),
  holding "chapter1.pdf" (file 113) among its files. The URN plugin is
  off in the dataset; turning it on is part of the steps.

Default patterns:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Website, tab "Plugins". In the "URN" row, tick the
   box to enable the plugin.
3. Open the row's "Settings". Under "Press Content", tick "Publication
   Formats" and "Files".
4. "URN Prefix": `urn:nbn:de:0000-`. "URN Suffix": leave "Use default
   patterns." selected; it reads "%p.%m for monographs %p.%m.c%c for
   chapters %p.%m.%f for publication formats %p.%m.%f.%s for files."
   "Namespace": "urn:nbn:de"; "Resolver URL": `https://nbn-resolving.de/`.
   "Save".
5. Sign in as `dbarnes` (Press editor). Open submission 14.
6. Publication › "Publication Formats". In the row "PDF", open the
   arrow, then "Edit", tab "Identifiers". Under "URN" it previews
   `urn:nbn:de:0000-jpk.14.3`. Close the window.
7. In the file row "chapter1.pdf", open the arrow, then "Edit", tab
   "Identifiers". Read the URN under "URN".
8. Leave "Assign the URN to this file" ticked and press "Save". Open the
   file's "Edit" › "Identifiers" again.

**Expected:** at step 7 the preview `urn:nbn:de:0000-jpk.14.3.113`
(press, book, format, file, as step 4 announces), and at step 8 the
same URN assigned.

**Observed:** step 7 previews

```
URN
urn:nbn:de:0000-jpk.14.113
What you see is a preview of the URN. Select the checkbox and save the form to assign the URN.
```

and after step 8 the reopened tab reads `urn:nbn:de:0000-jpk.14.113`
"The URN is assigned to this file."

"Use the pattern entered below…" (file 113 must have no URN: reload
the dataset, or press "Clear" on the file's tab after step 8):

9. As `rvaca`, open the URN row's "Settings" again. Tick all four boxes
   under "Press Content". Choose "Use the pattern entered below…" and
   fill "for monographs" `%p.%m`, "for chapters" `%p.%m.c%c`, "for
   publication formats" `%p.%m.%f`, "for files" `%p.%m.%f.%s`. "Save".
10. As `dbarnes`, open submission 14, Publication › "Chapters", the
    chapter "Chapter 1: Mind Control—Internal or External?", tab
    "Identifiers"; then the format "PDF" and the file "chapter1.pdf" as
    in steps 6 and 7.

**Expected:** the file previews `urn:nbn:de:0000-jpk.14.3.113` with
"Assign the URN to this file".

**Observed:** the chapter previews `urn:nbn:de:0000-jpk.14.c54` and the
format `urn:nbn:de:0000-jpk.14.3`, each with its assign box. The file
shows no assign box:

```
URN
urn:nbn:de:0000-jpk.14.%f.113
The URN cannot be assigned because it contains an unresolved pattern.
```

## Cause

`PubIdPlugin::getPubId()` in OMP (`classes/plugins/PubIdPlugin.php`,
line 72) sets the format it hands to the suffix patterns only when the
object is itself a format:

```php
$representation = ($pubObjectType == 'Representation' ? $pubObject : null);
$submissionFile = ($pubObjectType == 'SubmissionFile' ? $pubObject : null);
```

For a file, `$representation` stays null, although every file on a
format's tab belongs to that format (its `assocType` is
`ASSOC_TYPE_REPRESENTATION` and its `assocId` the format's ID). So
`generateDefaultPattern()` (line 141) skips the format's part, and
`generateCustomPattern()` (line 173) leaves "%f" in place; both test
`if ($representation)` (lines 158 and 200). lib/pkp's
`PKPPubIdPlugin::canBeAssigned()` then refuses any URN holding "%",
which is the refusal under a "%f" pattern.

The file identifiers came in 773825db for `pkp/pkp-lib#1527` (public
identifiers for OMP), with the DOI plugin's "%p.%m.%f.%s for files";
the URN plugin (825986f4, `pkp/omp#306`) copied that description and
uses the same `getPubId()`.

Reach:

- OMP's DOIs: `Repository::mintSubmissionFileDoi()` (OMP
  `classes/doi/Repository.php`, line 109) calls `generateSuffixPattern()`
  with no format, which calls `PubIdPlugin::generateCustomPattern()`
  (line 252). So a custom files pattern with "%f" mints a file DOI with
  "%f" in it, and `mintAndStoreDoi()` stores it without a "%" check.
  The DOIs' default suffix is a random string and is not affected
  (checked in the code, not driven).
- OJS: its `PubIdPlugin::getPubId()` has the same shape for a file (no
  galley passed), but OJS offers no file identifiers on any screen, so
  nothing reaches it (checked in the code).
- 3.3: the DOI plugin there extends the same `PubIdPlugin`, so a file's
  default DOI lacks the format number too (checked in the code).

## Proposed fix

Look the file's format up inside the two pattern generators, so that
every caller gets it (tried on `main`):
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-urn-default-pattern-no-format/fix.diff).

```diff
+    public static function getSubmissionFileRepresentation(SubmissionFile $submissionFile): ?Representation
+    {
+        if ($submissionFile->getData('assocType') != Application::ASSOC_TYPE_REPRESENTATION || !$submissionFile->getData('assocId')) {
+            return null;
+        }
+        return Application::getRepresentationDAO()->getById((int) $submissionFile->getData('assocId'));
+    }
```

and, first in both `generateDefaultPattern()` and
`generateCustomPattern()`:

```diff
+        $representation ??= $submissionFile ? static::getSubmissionFileRepresentation($submissionFile) : null;
```

The URN plugin and the DOI repository both fill their patterns there,
so the one lookup covers the URN default and "%f" patterns and the DOI
custom pattern. It reads the format the way OMP's other file code does
(`assocType`/`assocId`, as `PublicationFormatGridHandler` and
`CatalogBookHandler` do). `PublicationFormatDAO::getById()` is declared
non-null and would throw on a missing row, but a file's format cannot
be missing: `PublicationFormatService::deleteFormat()` deletes the
format's files with it. Tried: the file tab then previews and assigns
`urn:nbn:de:0000-jpk.14.3.113`, under both pattern choices, while the
chapter's and the format's previews do not change.

**Alternatives:**

- Set `$representation` for a file in `getPubId()` only: it fixes the
  URNs but leaves `mintSubmissionFileDoi()` and any other plugin that
  calls the static generators with the same gap.
- Change the window's text to "%p.%m.%s for files": it describes what
  the default does today, but "%f" would still be refused in a files
  pattern, and the 2016 change meant file URNs to sit under their
  format.

**What goes with it:**

- URNs already assigned in the short shape keep it: a URN may already be
  registered outside OMP, so no upgrade should rewrite it, and the fix
  changes only URNs assigned after it. A press that wants one shape can
  list its file URNs and "Clear" and reassign those not yet registered:

  ```sql
  SELECT submission_file_id, setting_value
  FROM submission_file_settings
  WHERE setting_name = 'pub-id::other::urn';
  ```

  Since no repair is part of the fix, the effort stays small.
- The diff applies as written to `stable-3_5_0`. On `stable-3_4_0` all
  four hunks go in, the `use APP\core\Application;` import included,
  with `PKPString::regexp_replace()` in the context lines. On
  `stable-3_3_0` the lookup goes in `getPubId()`
  (`PubIdPlugin.inc.php`, line 58), where it also fixes the DOI
  plugin's file DOIs.
- A guard: a unit test in OMP for `generateDefaultPattern()` and
  `generateCustomPattern()` with a file on a format (OMP has no test of
  `PubIdPlugin` yet).

Small: one helper and two lines in one class, with a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-urn-default-pattern-no-format/walk.js)
  takes steps 1–8 on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/press-file-urn-default-pattern-no-format/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With `PHASE=neighbour`
  in front, on a fresh load, it ticks all four kinds and reads the
  chapter's, the format's and the file's previews under the default
  patterns and then steps 9–10, without saving a tab; it was run with
  the fix in and out.
- The fix was tried with `node bin/try-fix.js apply
  shared/playwright/checks/issues/press-file-urn-default-pattern-no-format/fix.diff omp`,
  then both runs of the script, each on a fresh load, then
  `node bin/try-fix.js revert omp`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): OMP `main`, steps 1–10, and
  `stable-3_5_0`, steps 1–8, the same URNs on both. The fault is in how
  the suffix is built, so the database plays no part.
- 3.4 and 3.3 were read in the code: OMP's `PubIdPlugin` on
  `stable-3_4_0` (`.php`: line 72, `generateDefaultPattern()` at 141 and
  `generateCustomPattern()` at 173, their `if ($representation)` at 158
  and 200, no `Application` import) and `stable-3_3_0` (`.inc.php`,
  `getPubId()` line 58, the patterns inline), and the URN plugin's
  "%p.%m.%f.%s for files" on both; on 3.3 also `DOIPubIdPlugin.inc.php`,
  which extends `PubIdPlugin` and announces the same line.
- Where a file's URN goes, read in the code on `main`: assigned only by
  `PKPPubIdPluginHelper` from the file's "Identifiers" tab and by
  `PublicationFormatGridHandler::setProofFileCompletion()` (the approval
  window, which uses `canBeAssigned()` too: "The URN {$pubId} cannot be
  assigned because it contains an unresolved pattern."); the URN plugin
  has no publish hook. Out of OMP: `SubmissionFileNativeXmlFilter` (native
  export) and the submission file schema (REST API). The ONIX 3.0 filter
  and the OAI-PMH Dublin Core format read no file pub IDs.
  `DublinCoreMetaPlugin::monographFileView()` (line 293) is meant to put
  a file's URN in the file page's tags, but its condition prints the
  chapter's DOI instead; that is a separate fault, not driven.
- Tips: `main` OMP 3b0ecf794 (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  3081c9b00 (lib/pkp a9c76aed62); `stable-3_4_0` OMP 0aec65441;
  `stable-3_3_0` OMP 8e72fc883.
- Not driven: the DOI reach (a custom files pattern on Settings ›
  Distribution › "DOIs"), and the approval window's refusal, read in the
  code only.
