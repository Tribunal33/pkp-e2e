# With strict mode on, deleting a Submission Library file, dashboard search and the reviewer's file list stop working

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (branch tip, not yet released)
  - 3.4: OJS, OMP, OPS (code; released in 3.4.0-11)
  - 3.3: none (code; 3.3 has no strict mode)
- **Introduced** [9ca884fc29](https://github.com/pkp/pkp-lib/commit/9ca884fc29aaac656f8e35c4b7e59d2e1a97b3fd) for `pkp/pkp-lib#13294`, no pull request (a forward-port of the 3.3 pull request `pkp/pkp-lib#13295`) · 2026-09-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** U39 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U39-submission-and-publisher-libraries.md#a5) · spec U28 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a17)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On an install whose configuration file has the "strict" option On, a
workflow participant who presses "OK" in a Submission Library file's
"Delete" dialog gets a server error instead of a deletion. The dialog
stays open and says nothing, and the file stays in the list. The
Publisher Library's "Delete" works on the same install.

Under the same setting, every search in the dashboard's "Search
submissions" box answers a server error and lists "Search Results (0)",
and a reviewer's "Reviewer Files" list stays on "Loading" with no way
to upload a file.

Nothing is lost, and installs with strict mode Off work normally. The
configuration template ships it Off, and no screen offers it. On
`main`, a configuration file with no "strict" line also runs in strict
mode. Files first written for 3.3 or earlier have no such line.

## Impact

- **Lost**: nothing; the file the participant meant to delete stays.
- **Who**: anyone who may delete Submission Library files (the editors,
  assistants and author on the submission, from its "Library" button),
  on an install whose configuration file has `strict = On`. On `main`,
  also an install whose configuration file has no `strict` line.
- **Way round**: none on screen while strict mode is on. Adding
  `strict = Off` to the configuration file makes "Delete" work again.

Low: strict mode is a developer setting that ships Off, so although the
dashboard search then fails for everyone, no ordinary install meets
any of the three. It would be medium at least if a release reads a
missing `strict` line as On, since installs upgraded with a
configuration file written for 3.3 or earlier would then meet all
three without turning anything on.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`.
- In the install's `config.inc.php`, under `[general]`, `strict = On`.

1. Sign in as `dbarnes`.
2. Open the workflow of OJS submission 4 "Computer Skill Requirements
   for New and Existing Teachers: Implications for Policy and
   Practice" (OMP: submission 8 "Editorial"; OPS: submission 1 "The
   influence of lactation on the quantity and quality of cashmere
   production").
3. Press "Library" in the workflow header. The "Submission Library"
   window opens.
4. Press "Add a file", type "u39f contract" in "Name", choose "Other" in
   "Type", upload any small file and press "OK". The row "u39f
   contract" shows under "Other".
5. Press the row's arrow, then "Delete". The "Delete" dialog reads "Are
   you sure you wish to delete this item? This action cannot be
   undone."
6. Press "OK".

**Expected**: the dialog closes, the row goes, and the "Other" group
reads "No Items".

**Observed**: the dialog stays open with the same text, the row stays,
and no message shows. The request answers 500 with an empty body, and
the server log reads:

```
POST /index.php/publicknowledge/$$$call$$$/grid/files/submission-documents/submission-documents-files-grid/delete-file?fileId=1&submissionId=4  [500]
PHP Fatal error:  Uncaught Error: Undefined constant "PKP\controllers\grid\files\submissionDocuments\ASSOC_TYPE_SUBMISSION" in lib/pkp/controllers/grid/files/submissionDocuments/SubmissionDocumentsFilesGridHandler.php:183
```

Control: on the same install, Settings › Workflow › "Publisher Library"
("Press Library", "Preprint Server Library"), a file added and deleted
the same way goes at once.

## Cause

`SubmissionDocumentsFilesGridHandler::deleteFile()`
(`lib/pkp/controllers/grid/files/submissionDocuments/SubmissionDocumentsFilesGridHandler.php`,
line 183) asks for the submission with the bare constant
`ASSOC_TYPE_SUBMISSION`:

```php
$submission = $this->getAuthorizedContextObject(ASSOC_TYPE_SUBMISSION);
```

On 3.4 and later the `ASSOC_TYPE_*` values are class constants of
`PKPApplication`. The global names are only aliases, which
`PKPApplication::__construct()` registers when
`!app()->getApplicationStrictModeStatus()` (on 3.5 and 3.4,
`!PKP_STRICT_MODE`). With `strict = On` the global name is undefined,
and PHP throws `Error` before the method reaches its check or
`parent::deleteFile()`. Four of the class's six other methods read
`Application::ASSOC_TYPE_SUBMISSION`.

On `main`, `PKPContainer::__construct()` reads the option as
`Config::getVar('general', 'strict', true)`, so a configuration file
without the key runs in strict mode. That default came with
[cb32f21f94](https://github.com/pkp/pkp-lib/commit/cb32f21f942cdef34bd6c817b42a83986b4b369e)
(`pkp/pkp-lib#11583`). This report does not decide whether it is
intended; it is raised separately. 3.5 and 3.4 read a missing key as
Off (`(bool) Config::getVar('general', 'strict')`).

The method came with 9ca884fc29, the `main` forward-port of a 3.3 fix
that makes add, edit and delete check that a library file belongs to
the submission in the address (`pkp/pkp-lib#13294`). On `stable-3_3_0`
the constant is always global, so the original (15361174372b, the
3.3 pull request `pkp/pkp-lib#13295`) is correct there. The
forward-ports to `stable-3_4_0` (38b8669b23), `stable-3_5_0`
(39bb7963cc) and `main` kept the 3.3 spelling. The 3.4 port is in the
3.4.0-11 release; the 3.5 port is on the branch tip only, with no
3.5.0-6 release yet.

The same mistake, a global alias that strict mode removes read in
code, appears in two more places on `main`. A search of OJS, OMP and
OPS `main`, their `lib/pkp` and plugins for `ASSOC_TYPE_*` not preceded
by `::`, and for `$smarty.const.ASSOC_TYPE_` in templates, found these
and no others:

- `PKP\submission\Collector::getQueryBuilder()`
  (`lib/pkp/classes/submission/Collector.php`, line 692) reads bare
  `ASSOC_TYPE_PUBLICATION` in the keyword search. With strict mode on,
  every search typed in the dashboard's "Search submissions" box
  answers 500 (`Undefined constant
  "PKP\submission\ASSOC_TYPE_PUBLICATION"`), and the list shows "Search
  Results (0)" and "No Items" with no message (on screen, OJS, OMP and
  OPS `main`). The bare constant came with 0789f18150 (2026-06-12); 3.5
  and 3.4 do not have it.
- `lib/pkp/templates/reviewer/review/step3.tpl`, line 58, passes
  `assocType=$smarty.const.ASSOC_TYPE_REVIEW_ASSIGNMENT`. Smarty renders
  an undefined constant as null, so with strict mode on the "Reviewer
  Files" list is requested with an empty `assocType` and stays on
  "Loading", with no "Upload File" (on screen, OJS and OMP `main`; 3.5
  and 3.4 by code). A preprint server has no review.

## Proposed fix

Read the class constants, as the rest of each file already does. One
line in each of the three places, all in pkp-lib
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-delete-strict-mode-error/fix.diff),
written against the app root; in pkp-lib the paths drop `lib/pkp/`):

```diff
--- a/lib/pkp/controllers/grid/files/submissionDocuments/SubmissionDocumentsFilesGridHandler.php
+++ b/lib/pkp/controllers/grid/files/submissionDocuments/SubmissionDocumentsFilesGridHandler.php
-        $submission = $this->getAuthorizedContextObject(ASSOC_TYPE_SUBMISSION);
+        $submission = $this->getAuthorizedContextObject(Application::ASSOC_TYPE_SUBMISSION);
--- a/lib/pkp/classes/submission/Collector.php
+++ b/lib/pkp/classes/submission/Collector.php
-                                        ->where('cv.assoc_type', ASSOC_TYPE_PUBLICATION)
+                                        ->where('cv.assoc_type', Application::ASSOC_TYPE_PUBLICATION)
--- a/lib/pkp/templates/reviewer/review/step3.tpl
+++ b/lib/pkp/templates/reviewer/review/step3.tpl
-…op="fetchGrid" assocType=$smarty.const.ASSOC_TYPE_REVIEW_ASSIGNMENT assocId=…
+…op="fetchGrid" assocType=PKP\core\PKPApplication::ASSOC_TYPE_REVIEW_ASSIGNMENT assocId=…
```

Both PHP files already import `APP\core\Application`, and the template
already names `PKP\core\PKPApplication::ROUTE_COMPONENT` in the same
tag.

Tried on OJS, OMP and OPS `main` with strict mode on: "Delete" › "OK"
removed the row with a 200, the dashboard search listed its matches,
and the reviewer's "Reviewer Files" list loaded with "Upload File".

**Alternatives**

- Register the global aliases in strict mode too: that undoes what
  strict mode is for (finding code that still leans on the aliases).
- Fix only the handler line: leaves the dashboard search and the
  reviewer's file list broken under the same setting.

**What goes with it**

- Backport: the handler line applies as written to `stable-3_5_0`
  (line 183) and `stable-3_4_0` (line 185). The template line is 58 on
  3.5 and 56 on 3.4, where the same tag spells the router
  `\PKP\core\PKPApplication::ROUTE_COMPONENT`; the changed token is the
  same. The `Collector` line exists on `main` only. A backport can ride
  along with another fix.
- Guard: PHPUnit already runs pkp-lib in strict mode
  (`PKP_PHPUNIT_STRICT_MODE`, `StrictModeTest`), but no test reaches
  these grid handlers or the template. A lint step in pkp-lib's CI
  that rejects `ASSOC_TYPE_` not preceded by `::` in PHP, and
  `$smarty.const.ASSOC_TYPE_` in templates, would have caught all
  three. On the e2e side, a **Planned** item in spec U39 for a "Delete"
  in the Submission Library on an install running in strict mode.

Small: three one-line changes in pkp-lib that follow the code around
them, tried on the three apps, and no data repair. This is a proposal;
the team decides.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-delete-strict-mode-error/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-delete-strict-mode-error/lib.js).
  It runs on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL), with `strict = On`
  set in the install's configuration file by hand before the run; the
  script records the `strict` value it read. `PROBE_FEATURE=<feature>
  PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/library-delete-strict-mode-error/walk.js`
  takes the Steps and the Publisher Library control. With `nb` as the
  last argument, it runs only the Publisher Library "Delete", the
  dashboard search ("cashmere" on OJS and OPS, "Canada" on OMP) and
  `jjanssen`'s step 3 after "Accept Review" (OJS submission 12, OMP
  submission 17).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS: the same
  outcome on every app and line, the same log line. The fix and the
  `nb` checks ran on `main` only, with the fix in and out.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441, OPS
  acd8ae704b, lib/pkp 767353f4fe; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, lib/pkp ac3fa73402. The three changed
  files are the same in the three `main` checkouts.
- Releases: pkp-lib tag `3_4_0-11` contains 38b8669b23. pkp-lib's
  tags stop at `3_5_0-5`, and none contains 39bb7963cc; the
  `pkp/pkp-lib#13294` comment that names "3.5.0-6" says "for release
  in".
- Code reads: `deleteFile()` and the alias registration on 3.5 and 3.4
  (`PKP_STRICT_MODE` in `PKPApplication`, `ASSOC_TYPE_SUBMISSION` in
  the aliased list); on 3.3, `SubmissionDocumentsFilesGridHandler.inc.php`
  and `PKPApplication.inc.php`, which always `define()`s the constants,
  and a config template with no `strict` key. `Collector.php` and
  `step3.tpl` on 3.5 and 3.4 (`git show origin/stable-3_4_0:…` in
  `lib/pkp`).
- The missing-key default: OJS `main` bootstrapped from the command line
  (`lib/pkp/includes/bootstrap.php`) with the walked configuration file
  minus its `strict` line reported
  `getApplicationStrictModeStatus()` true and `ASSOC_TYPE_SUBMISSION`
  undefined; with `strict = Off`, false and defined. The Steps were not
  walked with the line removed.
- Introduced: GitHub lists no pull request for 9ca884fc29, nor for
  the 3.4 and 3.5 ports. For the Collector line, `git blame` gives
  4155f5be39 (`pkp/pkp-lib#13080`, 2026-07-30), which only re-indented
  it; `git log -S` gives 0789f18150 as the commit that added the bare
  constant.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for the symptom (library file delete, strict mode,
  undefined constant) and for `SubmissionDocumentsFilesGridHandler`,
  `ASSOC_TYPE_SUBMISSION` and `ASSOC_TYPE_PUBLICATION`; only
  `pkp/pkp-lib#13294` itself came up.
- Not checked: MySQL (the fault does not depend on the database); 3.4
  and 3.3 not walked; the reviewer's list on 3.5 not walked. What the
  reviewer list's request answered with an empty `assocType` is
  unverified: it answered 200 and the list stayed on "Loading".
