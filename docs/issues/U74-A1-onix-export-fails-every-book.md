# On a freshly installed press, the ONIX 3.0 tool's "Export Submissions" ends in "The process failed" for every book

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP (on a press installed fresh; an install upgraded from 3.5 or earlier is not affected)
  - 3.5: none (3.5 still defines the old class name as an alias, unless `strict` is turned on)
  - 3.4: none (code; the same)
  - 3.3: none (code)
- **Introduced** `pkp/omp#2186` for `pkp/pkp-lib#11583` · [6f57d1d09](https://github.com/pkp/omp/commit/6f57d1d097dd89c63c17c2e9ac896d0c41a12cf0) · 2025-12-04 · Touhidur Rahman (touhidurabir)
- **Upstream** `pkp/omp#2372` (open since 2026-06-17, not yet in main) carries this one line inside a larger change for `pkp/pkp-lib#7527`
- **Tracked in** spec U74 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press installed fresh from `main`, a manager who ticks one book
or more in Tools › "ONIX 3.0 Monograph Export Plugin" and presses
"Export Submissions" always gets "The process failed. Check below for
errors/warnings." and "Filter (ONIX 3.0 XML monograph export) supports
input classes.submission.Submission[] - array given", with no file to
download, whatever the book. They expect "The export completed
successfully." and an ONIX file.

The press cannot produce its ONIX feed, and there is no way round on
screen.

Only presses on a new install are affected. An install upgraded from
3.5 or earlier still exports.

## Impact

- **Lost.** The ONIX 3.0 file that a press sends to distributors and
  retailers. The tool says the export failed, but its reason names a
  class, not anything the press can change.
- **Who.** Every press manager or editor who uses the ONIX tool, on an
  install made fresh from `main` (once released, every new 3.6 install,
  and PKP's own test installs today).
- **Way round.** None that gives an ONIX file. The Native XML export
  carries each format's ONIX product, but inside a Native XML file,
  which the book trade does not take.

Medium: a secondary task fails every time with no way round, but only
on fresh installs. It would be high if upgraded installs failed too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`.

Steps:

1. Sign in as `dbarnes`.
2. Go to Settings › Press › "Masthead". Under "Publisher Identity" type
   Public Knowledge Press in "Press Publisher Name" and Vancouver in
   "Geographical Location", choose "Proprietary (01)" in "Publisher Code
   Type", type u74ir1 in "Publisher Code", and press "Save". The ONIX
   tool shows its "Export" tab only once these four are filled; the
   dataset leaves them empty.
3. Go to Tools › "Import/Export" › "ONIX 3.0 Monograph Export Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/Onix30ExportPlugin`).
4. In the "Export" tab tick "From Bricks to Brains: The Embodied
   Cognitive Science of LEGO Robots" (submission 14, published, one
   format). Leave "Validate XML before the export and registration."
   ticked.
5. Press "Export Submissions".
6. Press "Close" on the "Export Submissions Results" tab, untick
   "Validate XML before the export and registration.", and press
   "Export Submissions" again.

**Expected:** after steps 5 and 6, "The export completed successfully.
Download the exported file from the button below." and a "Download
Exported File" button that downloads an ONIX file (`ONIXMessage`, one
`Product` for the book's format).

**Observed:** after steps 5 and 6 a tab "Export Submissions Results"
opens with this text, and no button:

```
The process failed. Check below for errors/warnings.
Errors occured:
Generic Items
Filter (ONIX 3.0 XML monograph export) supports input classes.submission.Submission[] - array given
```

The same steps on the 3.5 dataset give the Expected text and an ONIX
file with validation ticked and unticked. On `main` with the 3.5 dataset
loaded and upgraded to `main`, step 5 gives the Expected text and file
too.

## Cause

The ONIX tool runs the filter group `monographs=>onix30-xml`, whose
input type is read from the `filter_groups` table. A fresh install
writes that row from OMP's
`plugins/importexport/onix30/filter/filterConfig.xml`, line 19:

```xml
inputType="class::classes.submission.Submission[]"
```

lib/pkp `ClassTypeDescription::splitClassName()` still accepts this old
dot notation and keeps only the last part, so the type checks for the
global class `Submission` (`checkType()`, line 73). OMP defined that
name only as an alias of `APP\submission\Submission`, in
`classes/submission/Submission.php`, while `PKP_STRICT_MODE` was off.
6f57d1d09 (`pkp/omp#2186`, the OMP side of `pkp/pkp-lib#11583`) removed
the alias with `PKP_STRICT_MODE`. It rewrote every type in the Native
XML plugin's `filterConfig.xml` to namespaced names but missed this
file. So `Filter::execute()` (lib/pkp `classes/filter/Filter.php`, line
445) finds the submissions are not of the declared type. It throws
`filter.input.error.notSupported`, and
`PKPImportExportDeployment::export()` catches that into the error the
results tab shows.

The rule broken is the one `pkp/pkp-lib#11583` set: class types are
namespaced names, because the global aliases are gone. Its upgrade
migration, lib/pkp
`I11583_ClassNamespaceFromDotNotationClassPath`, rewrites every stored
dot-notation type to a namespaced name, so an upgraded install's row
becomes `class::APP\submission\Submission[]`. A fresh install runs no
upgrade migration, so its row keeps the XML's old name.

Reach:

- ONIX tool, "Export Submissions": every book and every selection, with
  validation ticked or not (walked).
- No command-line route: `Onix30ExportPlugin::executeCLI()` throws
  `BadMethodCallException` (code).
- The ONIX product in each format of a Native XML export uses another
  group, `monograph=>onix30-xml`, which the Native XML plugin's
  `filterConfig.xml` already declares as `class::APP\submission\Submission`
  (code; walked on the upgraded install).
- No other instance: this is the only dot-notation `class::` type left
  in the `filterConfig.xml` files of OJS, OMP, OPS and lib/pkp on
  `main`. It is also the only one stored in a fresh install of the
  three apps (read in the `filter_groups` table of each `main` dataset).
- 3.4 and 3.5 with `strict = On` in `config.inc.php`: the alias is not
  defined there either, so the export would fail the same way (code,
  not walked).

## Proposed fix

Declare the type by its namespaced name in OMP's
`plugins/importexport/onix30/filter/filterConfig.xml`. This is the form
6f57d1d09 gave every type in the Native XML plugin's file, and the value
the 3.6.0.0 migration already writes for upgraded installs:

```diff
-			inputType="class::classes.submission.Submission[]"
+			inputType="class::APP\submission\Submission[]"
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/onix-export-fails-every-book/fix.diff).
Merging this line on its own fixes the export without waiting for
`pkp/omp#2372`.

Tried on `main`: on a fresh install of the patched code, steps 5 and 6
gave "The export completed successfully." and an ONIX file. On an
upgraded install, both exports gave the same files with the fix in and
out.

**Alternatives:**

- Restore the `\Submission` alias. That undoes what
  `pkp/pkp-lib#11583` was for.
- Have `ClassTypeDescription` turn `classes.…` names into `APP\…` names,
  as the migration does. That keeps the deprecated notation working for
  the sake of one file, and every later mistake would still fail only at
  run time.

**What goes with it:**

- Installs made from `main` before the fix (developer and test
  installs, and PKP's datasets until they are regenerated) keep the old
  row, because `FilterHelper::installFilterGroups()` skips a group that
  is already stored. No upgrade migration is needed: every released
  install that stores the old row also defines the alias, and the
  3.6.0.0 migration rewrites the row when it upgrades. Installs made
  from `main` before the fix need a reinstall, or this statement:
  - PostgreSQL:
    `UPDATE filter_groups SET input_type = 'class::APP\submission\Submission[]' WHERE symbolic = 'monographs=>onix30-xml';`
  - MySQL and MariaDB (backslashes doubled, as the default SQL mode
    reads them as escapes):
    `UPDATE filter_groups SET input_type = 'class::APP\\submission\\Submission[]' WHERE symbolic = 'monographs=>onix30-xml';`
- Guard: a unit test beside `MonographONIX30XmlFilterTest` that reads
  `filterConfig.xml`, builds the group's input type through
  `TypeDescriptionFactory`, and checks that it accepts an array of
  `APP\submission\Submission`. The existing test builds its filter group
  with `primitive::string` types, so it could not catch this. A wider
  guard in lib/pkp would check that every `class::` type in every
  `filterConfig.xml` names a class that exists. In this repo, the e2e
  scenario for an ONIX export on a fresh install is a **Planned** item
  of spec U74.
- Backport: none needed. 3.5 and 3.4 define the alias while `strict` is
  off, so the old row works there. When those installs upgrade to 3.6,
  the migration rewrites the row.

Small: one line in one file, following the Native XML plugin's file, and
a unit test.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/onix-export-fails-every-book/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/onix-export-fails-every-book/lib.js),
  [the U63 A12 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/lib.js)
  and
  [the U63 A9 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/onix-export-fails-every-book/walk.js`
  after `npm run fleet-prep -- --feature <feature> --dataset 1 --reset --apps omp`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front of both).
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/onix-export-fails-every-book/fix.diff omp`,
  then a reset. The ONIX group was then reinstalled from the patched file
  as a fresh install does: the stored `monographs=>onix30-xml` row was
  deleted and
  `PKP_CONFIG_FILE=<the install's config> php lib/pkp/tools/installPluginVersion.php plugins/importexport/onix30/version.xml`
  was run, which wrote `class::APP\submission\Submission[]`. Then
  walk.js ran, and finally `node bin/try-fix.js revert …`. The neighbour
  check,
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/onix-export-fails-every-book/neighbour.js),
  ran with the fix in and out on `main` with the 3.5 dataset loaded
  (`PKP_E2E_DATASET_BRANCH=stable-3_5_0` in front of the reset, which
  runs `tools/upgrade.php` from 3.5.0.5 to 3.6.0.0). The upgrade had
  stored `class::APP\submission\Submission[]` for the ONIX group. Both
  runs gave the ONIX export (`ONIXMessage`, one `Product`) and the
  Native XML export (`monograph`, with the format's ONIX product) of
  submission 14.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02), `omp/main/pgsql` and `omp/stable-3_5_0/pgsql`:
  - main: OMP 3b0ecf794 (lib/pkp 3dc90c81a6). The fresh dataset stores
    `class::classes.submission.Submission[]` for the group, as does the
    fresh install the e2e suites use.
  - stable-3_5_0: OMP 9c5e24246 (lib/pkp cf3f984335), `strict = Off`.
    The same stored type, with the alias at
    `classes/submission/Submission.php` lines 129–130.
  - On both lines the two requests behind each export answered 200, and
    no page script error and no server log error was recorded. MySQL
    not checked; the fault does not depend on the database.
- Code reads for 3.4 and 3.3:
  - stable-3_4_0 (OMP 0aec65441, lib/pkp 767353f4fe): the same
    `filterConfig.xml` line, the alias under `!PKP_STRICT_MODE` in
    `classes/submission/Submission.php`, `PKP_STRICT_MODE` defined from
    `strict` in `PKPApplication`, and `strict = Off` in
    `config.TEMPLATE.inc.php`.
  - stable-3_3_0 (OMP 8e72fc883, lib/pkp ac3fa73402): the same line, and
    `Submission` a global class (`classes/submission/Submission.inc.php`),
    checked with `is_a()` in `ClassTypeDescription::checkType()`.
- Introduced: the `filterConfig.xml` line blames to 383125ed71
  (2021-01-26, `[]` added for `pkp/pkp-lib#6609`). 6f57d1d09's PR,
  `pkp/omp#2186`, was merged 2026-01-06 with the lib/pkp side,
  `pkp/pkp-lib#12016`
  ([cb32f21f94](https://github.com/pkp/pkp-lib/commit/cb32f21f942cdef34bd6c817b42a83986b4b369e)),
  which added the upgrade migration.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched by the
  symptom's words and by the Cause's class and file names. Only
  `pkp/omp#2372` changes this line (one of 21 files; last updated
  2026-10-02). `pkp/pkp-lib#6604` (OMP 3.3, fixed in 2021) and
  `pkp/pkp-lib#12911` (missing funding data) are other faults.
- Unverified: the failure with `strict = On` on 3.4 and 3.5 was not
  driven. Plugins from the Plugin Gallery that still declare dot-notation
  types were not checked.
