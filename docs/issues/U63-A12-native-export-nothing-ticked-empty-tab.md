# Pressing export with nothing ticked in the Native XML or ONIX tool opens an empty results tab

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#7064` for `pkp/pkp-lib#5328` · [1f48f6e414](https://github.com/pkp/pkp-lib/commit/1f48f6e4148b410d9e5b731e17e54a751f5ca3b4) · 2021-06-03 · Nate Wright (NateWr); for "Export Issues", `pkp/ojs#3162` for `pkp/pkp-lib#7129` · [88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7) · 2021-07-14 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a12) · spec U74 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The server fails when a manager presses "Export Articles" ("Export
Submissions" on a press, "Export Preprints" on a preprint server) in
the Native XML Plugin with no submission ticked: it answers the request
with an error and writes the error to its log. The same happens with
"Export Issues" on a journal and with "Export Submissions" in a press's
ONIX 3.0 tool. The manager expects to be told to tick something.
Instead a new results tab opens inside the page, with no text and no
button.

The empty tab gives no reason, so the tool can look broken. Once
something is ticked, the export works as usual.

## Impact

- **Lost.** No data. The manager is not told what went wrong, each
  press adds one more empty tab to the page, and each press leaves an
  error in the server's log.
- **Who.** A journal, press or server manager using Tools ›
  "Import/Export", who presses an export button before ticking
  anything. It happens in any setup.
- **Way round.** Tick at least one submission or issue first. An empty
  tab goes away with its own "Close".

Low: no data is lost and the export works once something is ticked.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP, OPS).

Native XML Plugin, submissions:

1. Sign in as `dbarnes`.
2. Go to Tools › "Import/Export" › "Native XML Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin`).
3. Open the tab "Export Articles" ("Export" on OMP, "Export Preprints"
   on OPS). Leave every box unticked.
4. Press "Export Articles" ("Export Submissions" on OMP, "Export
   Preprints" on OPS).

Native XML Plugin, issues (OJS):

5. Open the tab "Export Issues". Leave every box unticked.
6. Press "Export Issues".

ONIX 3.0 (OMP):

7. Go to Settings › Press › "Masthead". Under "Publisher Identity" type
   Public Knowledge Press in "Press Publisher Name" and Vancouver in
   "Geographical Location", choose "Proprietary (01)" in "Publisher Code
   Type", type u63ir7 in "Publisher Code", and press "Save". The ONIX
   tool shows its "Export" tab only once these four are filled; the
   dataset leaves them empty.
8. Go to Tools › "Import/Export" › "ONIX 3.0 Monograph Export Plugin".
   Leave every submission unticked; leave "Validate XML before the
   export and registration." as it is.
9. Press "Export Submissions".

**Expected:** the tool says that nothing was ticked, in the words the
journal's other export tools use ("No objects selected."), and no
results tab opens.

**Observed:** after steps 4 and 9 a tab "Export Submissions Results" is
added and opened; after step 6 a tab "Export Issues Results". Each tab
is empty, with no text and no "Download Exported File" button, and
nothing else on the page changes. The tab's own request fails:

```
GET …/plugin/NativeImportExportPlugin/exportSubmissions?selectedSubmissions=&csrfToken=…   500
GET …/plugin/NativeImportExportPlugin/exportIssues?selectedIssues=&csrfToken=…             500
GET …/plugin/Onix30ExportPlugin/exportSubmissions?selectedSubmissions=&validation=on&csrfToken=…   500
```

The server log, for the submissions tabs and the issues tab:

```
PHP Fatal error:  Uncaught TypeError: PKP\submission\Repository::get(): Argument #1 ($id) must be of type int, string given, called in lib/pkp/classes/plugins/ImportExportPlugin.php on line 283
PHP Fatal error:  Uncaught TypeError: APP\issue\Repository::get(): Argument #1 ($id) must be of type int, string given, called in plugins/importexport/native/NativeImportExportPlugin.php on line 73
```

With one submission ticked (OJS 4, OMP 3, OPS 1) or one issue ticked,
the Native XML buttons give "The export completed successfully.
Download the exported file from the button below." and the button
downloads the file. There is no such control for the ONIX tool here:
with "The Political Economy of Workplace Injury in Canada" ticked, its
export fails on its own with "The process failed. Check below for
errors/warnings.", a separate fault.

## Cause

Each export form posts to a "bounce" operation, which only opens the
results tab: `PKPNativeImportExportPlugin::display()` case
`exportSubmissionsBounce` (pkp-lib, all three apps), OJS
`NativeImportExportPlugin::display()` case `exportIssuesBounce`, and OMP
`Onix30ExportPlugin::display()` case `exportSubmissionsBounce`. None of
them checks that anything was ticked. Each copies
`$request->getUserVar('selectedSubmissions')` (or `selectedIssues`),
which is null when no box is ticked, into the new tab's address through
`ImportExportPlugin::getBounceTab()`. The address then carries
`selectedSubmissions=`, an empty string.

The tab loads the export operation, which reads the selection as
`(array) $request->getUserVar('selectedSubmissions')`, that is `['']`.
`ImportExportPlugin::getExportSubmissionsDeployment()` (line 283) passes
each value to `Repo::submission()->get(int $id)`, and the empty string
throws a `TypeError`. The call sits before
`PKPImportExportDeployment::export()`, whose try/catch would have turned
the error into a message, so the request ends in a 500 and the tab gets
no content. OJS's `getExportIssuesDeployment()` (line 73) does the same
with `Repo::issue()->get()`.

The rule broken is that an export with nothing selected is refused with
a message before any export runs. OJS's `PubObjectsExportPlugin::prepareAndExportPubObjects()`
does this with "No objects selected." for the DOAJ, PubMed Central and
other deposit tools. The crash itself came with the typed lookups:
1f48f6e414 replaced `Services::get('submission')->get()`, whose
`SchemaDAO::getById()` cast the id with `(int)` and returned null, and
88aaa6b49f did the same for issues. The bounce with no check came
earlier, with PR `pkp/pkp-lib#6960` for `pkp/pkp-lib#6490` (the tabbed
Native XML export, 2021-04-19).

Reach:

- Native XML Plugin, "Export Articles" / "Export Submissions" /
  "Export Preprints": OJS, OMP, OPS (walked).
- Native XML Plugin, "Export Issues": OJS (walked).
- ONIX 3.0 "Export Submissions": OMP (walked). It reaches the same
  `getExportSubmissionsDeployment()`, before the "Validate XML…" box is
  read, so the box makes no difference.
- `getExportIssuesDeployment()` also calls `getJournalId()` on the null
  that `Repo::issue()->get()` returns for an unknown issue id (code); no
  screen sends one.

## Proposed fix

Refuse an empty selection in each bounce operation, before the tab is
built, with the message the other export tools use. The forms are bound to
`$.pkp.controllers.form.AjaxFormHandler`, whose `Handler.handleJson()`
shows the `content` of a `status: false` answer as an alert; the form is
then enabled again and no tab opens. The same `display()` already
refuses an import with no file this way (`importBounce` returns
`JSONMessage(false)`). In `PKPNativeImportExportPlugin::display()`:

```diff
             case 'exportSubmissionsBounce':
+                if (empty($request->getUserVar('selectedSubmissions'))) {
+                    $this->result = (new JSONMessage(false, __('plugins.importexport.common.error.noObjectsSelected')))->getString();
+                    $this->isResultManaged = true;
+                    break;
+                }
+
                 $tab = $this->getBounceTab(
```

OJS's `exportIssuesBounce` and OMP's ONIX `exportSubmissionsBounce` get
the same check, returning the message (and a `use PKP\core\JSONMessage;`).
The diffs, one per app root:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/fix-ops.diff).
The key `plugins.importexport.common.error.noObjectsSelected` ("No
objects selected.") is in each app's `locale/en/manager.po`.

Tried on `main`: with the fix in, steps 4, 6 and 9 showed the alert "No
objects selected.", opened no tab and sent no export request. With one
item ticked, the exports gave the same results with the fix in and out.

The early return sits before `getBounceTab()`'s `checkCSRF()`, so the
refusal is sent without a CSRF check. That is fine: it writes nothing
and answers only a fixed message. The check can also move below a
`checkCSRF()` call if the team prefers every answer behind it.

The check belongs in the bounce because that is where the manager's
selection arrives. `getBounceTab()` is shared with the import, and its
parameters do not say which one is required, so it is the wrong place.
The fix keeps the type hints that 1f48f6e414 and 88aaa6b49f added. It
changes only the answer to a bounce with nothing ticked: no REST API,
plugin hook or stored data is involved, and the command-line export
(`exportSubmissions()`, `exportIssues()`) is untouched.

**Alternatives:**

- Cast the ids in the export operations (`array_map('intval', …)`) or
  catch the error there. That alone stops the 500, but the tab would then
  show an empty export or an error list, and the manager is still not
  told to tick something. Added beside the recommended fix, it would
  also stop the 500 for an export address typed by hand.
- Send the refusal as a page notice: a trivial notification, as
  `pkp/pkp-lib#12627` sends in `PubObjectsExportPlugin`, then
  `JSONMessage(false)` with no text. #12627 redirects after its
  notification because the deposit forms are plain posts; these forms
  post by AJAX, and `AjaxFormHandler` asks for pending notifications
  after each answer, so the notice would show. It costs a few more lines
  in each file; which of the two to use is a choice for the team.
- Disable the export buttons in the templates until something is
  ticked. This would cover the Vue lists but not the OJS issues grid's
  form button, and it leaves the server's failure in place.

**What goes with it:**

- Other instances, left out: OPS's own `PubObjectsExportPlugin::prepareAndExportPubObjects()`
  still throws an exception with "No objects selected." where OJS's copy
  sends a notification since `pkp/pkp-lib#12627` (code; not walked). The
  Users XML tool's "Export Users" also fails with nothing ticked, but by
  another path (a direct post to `export`, with no bounce), which this
  fix does not reach.
- Backport: the same code is on `stable-3_5_0` and `stable-3_4_0`. The
  diffs apply cleanly to both, and the message key is in each app's 3.4
  `manager.po`; the fix was not driven on either branch.
- Guard: an end-to-end check that presses each of the three buttons with
  nothing ticked and expects "No objects selected.".

Medium, by the rule that a change across two or more repositories is
medium: it is the same few lines in three bounce handlers, in pkp-lib,
OJS and OMP, with no data repair and no API change. In one repository it
would be small.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/lib.js)
  and
  [the A9 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/walk.js`
  after `npm run fleet-prep -- --feature <feature> --dataset 1 --reset`.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/fix-<app>.diff <app>`
  for each app, then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/neighbour.js)
  (each after a reset), then `node bin/try-fix.js revert …` the same
  way. neighbour.js ticks one item and exports, with the fix in and
  out: the same success text and the same files both times (roots
  `article`, `monograph`, `preprint`, `issue`). On OMP the ONIX export
  of "The Political Economy of Workplace Injury in Canada" answered
  "The process failed. … Generic Items Filter (ONIX 3.0 XML monograph
  export) supports input classes.submission.Submission[] - array given"
  both times, a separate failure that U74 tracks.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). The same tabs and the same 500s as on `main`.
  - No page script error was logged. MySQL not checked; the failure is a
    PHP type error before any query.
- Code reads for 3.4 and 3.3:
  - stable-3_4_0 (OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b, lib/pkp
    df13621c2d): `PKPNativeImportExportPlugin` `exportSubmissionsBounce`
    and `exportSubmissions`, `ImportExportPlugin::getExportSubmissionsDeployment()`
    and `Submission\Repository::get(int $id, …)` are as on `main`; so are
    OJS `exportIssuesBounce` and `Issue\Repository::get(int $id, …)`, and
    OMP's ONIX `exportSubmissionsBounce`.
  - stable-3_3_0 (OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161, lib/pkp
    d446601ebe): the Native XML forms post straight to `exportSubmissions`
    and `exportIssues` (OJS `NativeImportExportPlugin.inc.php`), and the
    OMP ONIX bounce opens `export`. Each looks the ids up through
    `SchemaDAO::getById()` or `IssueDAO::getById()`, which cast them with
    `(int)`, so an empty selection finds nothing rather than failing.
    What 3.3 does instead with nothing ticked was not driven.
- Introduced: the bounce lines blame to the PSR-12 reformat e3f570bc37
  and, before it, to
  [049f5f85f3](https://github.com/pkp/pkp-lib/commit/049f5f85f34c602d0feeabd7e5de72ad00a095a5)
  ("pkp/pkp-lib#6490 Cumulative Feature Commit (rebase fixes)", defstat),
  merged through PR `pkp/pkp-lib#6960`.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ops for the
  symptom ("native export nothing selected", "empty selection", "must
  be of type int", "string given") and for `exportSubmissions`,
  `selectedSubmissions` and `getExportSubmissionsDeployment`. The
  nearest, `pkp/pkp-lib#9414` and `pkp/pkp-lib#10269`, are type errors
  on a file's uploader in an export with items ticked; `pkp/pkp-lib#12627`
  is the deposit tools' nothing-selected crash, fixed in OJS's
  `PubObjectsExportPlugin` only.
