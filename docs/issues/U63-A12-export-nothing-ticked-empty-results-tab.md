# Export with nothing ticked opens an empty results tab instead of saying nothing is selected

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#7064` for `pkp/pkp-lib#5328` · [1f48f6e414](https://github.com/pkp/pkp-lib/commit/1f48f6e4148b410d9e5b731e17e54a751f5ca3b4) · 2021-06-03 · Nate Wright (NateWr); "Export Issues": `pkp/ojs#3162` for `pkp/pkp-lib#7129` · [88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7) · 2021-07-14 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a12), spec U74 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a16)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

When a manager clicks "Export Articles" in Tools › "Native XML Plugin"
with no line ticked, the server answers with an error, and the new
"Export Submissions Results" tab stays empty: no text, no file, and
nothing says that no line was ticked. The button is "Export
Submissions" on a press and "Export Preprints" on a preprint server.

"Export Issues" on a journal fails the same way. So does "Export
Submissions" in a press's "ONIX 3.0 Monograph Export Plugin", with its
"Validate XML" box ticked or not.

Nothing is lost. Ticking at least one line and clicking the button
again exports as usual.

## Impact

- **Lost.** No data or work. The tab gives no reason, and each click
  writes an error to the server log.
- **Who.** A manager who clicks an export button on these tools before
  ticking anything, every time they do.
- **Way round.** Tick at least one line, then click the button again.

Low: what the manager meets is an unexplained empty tab and nothing
more. It would be medium if managers gave up exporting because of it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main` (or
  `stable-3_5_0`), with its journal, press or preprint server
  `publicknowledge`.
- Press, for the ONIX tool only: the dataset's press has its publisher
  details blank, and the ONIX tool then shows only a reminder. As
  `rvaca`: Settings › "Press" › "Masthead", under "Publisher Identity"
  type "Public Knowledge Press" in "Press Publisher Name" and
  "Vancouver" in "Geographical Location", choose "ARK (35)" in
  "Publisher Code Type", type any value in "Publisher Code" (the walk
  used "u63a12"), click "Save".

Native XML tool:

1. Sign in as `rvaca` (the manager).
2. In the side menu click "Tools"; on the "Import/Export" tab click
   "Native XML Plugin".
3. Open the "Export Articles" tab ("Export" on a press, "Export
   Preprints" on a preprint server). Leave every line unticked.
4. Click "Export Articles" ("Export Submissions", "Export Preprints")
   under the list.

Journal, issues:

5. Open the "Export Issues" tab. Leave both issues unticked.
6. Click "Export Issues".

Press, ONIX tool:

7. "Tools" › "ONIX 3.0 Monograph Export Plugin". On its "Export" tab
   leave every book unticked; "Validate XML before the export and
   registration." is ticked as the page opens.
8. Click "Export Submissions". Untick the validation box and click
   "Export Submissions" again.

**Expected:** the tool says that nothing is selected and adds no tab,
as a journal's DOI export tools do ("No objects selected.").

**Observed:** each click adds a tab "Export Submissions Results"
("Export Issues Results" at step 6) and opens it. The tab holds no text
and no button, and no file downloads. The tab's request answers 500:

```
GET /index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin/exportSubmissions?selectedSubmissions=&csrfToken=…   500
GET /index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin/exportIssues?selectedIssues=&csrfToken=…              500
GET /index.php/publicknowledge/en/management/importexport/plugin/Onix30ExportPlugin/exportSubmissions?selectedSubmissions=&validation=on&csrfToken=…   500
```

The server log:

```
PHP Fatal error:  Uncaught TypeError: PKP\submission\Repository::get(): Argument #1 ($id) must be of type int, string given, called in …/lib/pkp/classes/plugins/ImportExportPlugin.php on line 283
PHP Fatal error:  Uncaught TypeError: APP\issue\Repository::get(): Argument #1 ($id) must be of type int, string given, called in …/plugins/importexport/native/NativeImportExportPlugin.php on line 73
```

Control: with any one line ticked, the same click opens "The export
completed successfully. Download the exported file from the button
below." and "Download Exported File". On the ONIX tool, a book ticked
gives a different failure: "The process failed. Check below for
errors/warnings." with "Filter (ONIX 3.0 XML monograph export) supports
input classes.submission.Submission[] - array given", tracked as U74
[A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a1).

## Cause

The export button posts its form to a "bounce" operation that adds the
results tab. In lib/pkp
`plugins/importexport/native/PKPNativeImportExportPlugin.php`,
`display()` case `exportSubmissionsBounce` (lines 189–195) passes
`$request->getUserVar('selectedSubmissions')` to
`ImportExportPlugin::getBounceTab()`, which writes it into the tab's
address. With nothing ticked the form sends no `selectedSubmissions[]`,
so the value is null and the address carries `selectedSubmissions=`.
Nothing on the way checks that anything was selected.

The tab then loads `exportSubmissions` (lines 213–216).
`(array) $request->getUserVar('selectedSubmissions')` turns the empty
string into `['']`. `ImportExportPlugin::getExportSubmissionsDeployment()`
(lib/pkp `classes/plugins/ImportExportPlugin.php`, line 283) passes
`''` to `Repo::submission()->get(int $id)`, which throws a TypeError.
The error is thrown before `PKPImportExportDeployment::export()` and its
try/catch are reached, so the request fails with 500 and the tab stays
empty.

OJS's `NativeImportExportPlugin::display()` does the same with
`selectedIssues` (cases `exportIssuesBounce` and `exportIssues`, lines
43–55), and `getExportIssuesDeployment()` (line 73) passes `''` to
`Repo::issue()->get(int $id)`. OMP's `Onix30ExportPlugin::display()`
(lines 131–145) forwards `selectedSubmissions` the same way into the
shared `getExportSubmissionsDeployment()`.

The empty `selectedSubmissions=` has been sent since the results tabs
arrived with `pkp/pkp-lib#6490`. At first the lookup went through a DAO
that cast the id to an integer, so `''` found no submission. The
changes named under Introduced replaced that lookup with the typed
repositories, for submissions and then for issues, and from then on
the empty id was fatal.

Reach:

- OJS's DOI and registration export tools (`PubObjectsExportPlugin`)
  already refuse an empty selection with "No objects selected.", since
  `pkp/pkp-lib#12627` (checked in the code).
- OPS has its own `PubObjectsExportPlugin`, and its
  `prepareAndExportPubObjects()` still throws an exception on an empty
  selection, as OJS's did before that fix. Its one concrete subclass is
  the Crossref plugin, through `DOIPubIdExportPlugin`. Whether a screen
  reaches it was not checked, and this fix leaves it out.
- The Users XML tool's "Export Users" has no empty-selection check
  either (`PKPUserImportExportPlugin::display()`, case `export`). It
  posts straight to the export, with no results tab, and its failure is
  tracked separately as U63
  [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a14);
  this fix does not cover it.
- `getExportIssuesDeployment()` calls `$issue->getJournalId()` without
  checking for null, so an issue id that does not exist also fails. No
  screen sends one (checked in the code).

## Proposed fix

A proposal, tried on `main`
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/fix-ops.diff):
one diff per app root, each holding the same pkp-lib part).

Recommended: refuse an empty selection in the bounce, before a tab is
added. One helper goes in pkp-lib's `ImportExportPlugin`, and each of
the three bounces calls it:

```diff
+use APP\notification\NotificationManager;
+use PKP\notification\Notification;
 …
+    public function getNothingSelectedResult($request)
+    {
+        if (!$request->checkCSRF()) {
+            throw new Exception('CSRF mismatch!');
+        }
+        $notificationManager = new NotificationManager();
+        $notificationManager->createTrivialNotification(
+            $request->getUser()->getId(),
+            Notification::NOTIFICATION_TYPE_ERROR,
+            ['contents' => __('plugins.importexport.common.error.noObjectsSelected')]
+        );
+        header('Content-Type: application/json');
+        return (new JSONMessage(false))->getString();
+    }
```

```diff
             case 'exportSubmissionsBounce':
+                if (empty($request->getUserVar('selectedSubmissions'))) {
+                    $this->result = $this->getNothingSelectedResult($request);
+                    $this->isResultManaged = true;
+                    break;
+                }
```

OJS's `exportIssuesBounce` (with `selectedIssues`) and OMP's ONIX
`exportSubmissionsBounce` get the same check, each returning the
helper's result.

The bounce is the one step that decides whether a results tab opens,
so refusing there adds no empty tab. The manager sees the same message
the DOI tools show, "No objects selected."
(`plugins.importexport.common.error.noObjectsSelected`, already in each
app's `locale/en/manager.po`). The DOI tools deliver it with a redirect
(`_sendNotification()`, then `$request->redirect()`). Here the bounce
is an AJAX form post, so the helper stores the notice and answers
`JSONMessage(false)`. The form's handler then fetches the notice
through its own `notifyUser` event, so no JavaScript changes.

The same switch already refuses an empty `importBounce` with a bare
`new JSONMessage(false)` (lines 170–177). The fix does not copy that,
because that answer tells the manager nothing, which is what this
report is about.

Tried on all three apps: with the fix, every click with nothing ticked
showed the notice "No objects selected." and added no tab, and the
server logged no error. With one line ticked, the exports went on as
without the fix: a file from the Native XML tool, and the ONIX tool's
own "The process failed." failure.

**Alternatives:**

- Skip empty and non-numeric ids in `getExportSubmissionsDeployment()`
  and `getExportIssuesDeployment()` (an `(int)` cast or a filter), with
  a null check on the issue. That stops the 500 in one pkp-lib place
  for submissions, but the tab still opens on an export of nothing, and
  the manager is still not told to tick something. So it is not a
  replacement, and it is not part of the recommended fix: it is a
  follow-up hardening, not in the diffs. Without it, opening the tab's
  address directly with an empty selection, or with an issue id that
  does not exist, still answers 500. After the fix no screen sends
  either.
- Disable the export buttons while nothing is ticked. The Vue lists
  know their selection, but the issues list is a legacy grid, and the
  server would still accept an empty post.

**What goes with it:**

- No stored data, API or hook changes. The command-line exports
  (`exportSubmissions()`, `exportIssues()`) never go through a bounce and
  are unchanged.
- Backport: the three diffs apply unchanged to `stable-3_5_0` (a patch
  dry run). On 3.4 the same bounces and lookups are in place, and the
  message key is there too. pkp-lib `stable-3_4_0` has no
  `PKP\notification\Notification`, so the helper imports
  `PKP\notification\PKPNotification` there, which has the same
  `NOTIFICATION_TYPE_ERROR`.
- Guard: an e2e scenario that clicks each export button with nothing
  ticked and checks for the notice and that no tab is added.

Medium: the check itself is a few lines, but it goes into three
handlers in three plugins across three repositories. They are pkp-lib's
Native XML plugin (shared by all three apps), OJS's own Native XML
plugin (for "Export Issues") and OMP's ONIX plugin, so three changes
must be reviewed and merged together.

## Evidence

- Script that takes the Steps in a browser on a fresh load of the
  default dataset, with the one-line-ticked control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/walk.js),
  run with
  `PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63a12 node bin/probe.js all shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front).
- The fix, tried 2026-09-30 on the main tips below:
  `node bin/try-fix.js apply …/fix-<app>.diff <app>` for each app, the
  dataset reloaded, the same command, then
  `node bin/try-fix.js revert ojs omp ops`. The clicks with one line
  ticked were also run without the fix, with the same results.
- Walked 2026-09-30 on PostgreSQL, each install loaded from pkp/datasets
  38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`: main OJS bade233f73 (lib/pkp 2e377d27fc),
  OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6); stable-3_5_0
  OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp a9c76aed62).
  All six showed the Observed above. The fault does not depend on the
  database (a PHP type check), so MySQL was not checked.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d has the same
  `exportSubmissionsBounce`, `(array)` cast and
  `Repo::submission()->get(int $id)`; OJS `stable-3_4_0` at 9571d8fde7
  the same `exportIssuesBounce` and `Repo::issue()->get(int $id)`; OMP
  `stable-3_4_0` at 0aec65441 the same ONIX bounce; OPS at acd8ae704b
  uses the shared code.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe, OJS at 9fdb9bcf9a,
  OMP at 8e72fc883, OPS at c5532e2161. OJS's Native XML forms post
  straight to `exportSubmissions` and `exportIssues`, with no results
  tab. OMP's ONIX tool has a bounce that forwards `selectedSubmissions=`,
  but it reads the ids through `SubmissionDAO::getById()`, which casts
  them to integers, so there is no TypeError. What 3.3 shows with nothing
  ticked was not established.
- Introduced: `git blame` on line 283 of `ImportExportPlugin.php` stops
  at 1f48f6e414, which replaced `Services::get('submission')->get()`
  (through `SchemaDAO::getById()`, `(int) $objectId`). On OJS, line 73
  of `NativeImportExportPlugin.php` blames to 88aaa6b49f. The bounce
  lines blame through a PSR-12 reformat (e3f570bc37,
  `pkp/pkp-lib#5678`) to
  [049f5f85f3](https://github.com/pkp/pkp-lib/commit/049f5f85f34c602d0feeabd7e5de72ad00a095a5)
  (`pkp/pkp-lib#6960` for `pkp/pkp-lib#6490`, 2021-04-19, defstat).
- Upstream searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by the symptom and by the method names in the
  Cause.
- Not tried: the fix on 3.5, and opening the tab's address directly.
