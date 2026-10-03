# An opened library file's "Edit"/"Delete" strip closes by itself two seconds after a download

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [b6e896ab6d](https://github.com/pkp/pkp-lib/commit/b6e896ab6d7f0f5e5b3392292809f236a3920808) for pkp's old tracker's bug 9043, no pull request · 2014-12-08 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-03)
- **Tracked in** U39 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U39-submission-and-publisher-libraries.md#a9), [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U39-submission-and-publisher-libraries.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

Each file row in a library list starts with an arrow, which opens a
strip with "Edit" and "Delete" under the row. When a person downloads a
file by pressing its name and opens a strip within two seconds, the
strip closes by itself, because two seconds after the download the
whole list is drawn again. In some cases the page's script also fails
in the browser. No screen shows this error, and it does not harm the
work.

The script fails when something else draws the list again before those
two seconds end. Pressing a second file's name does that, for example.
The browser's console then reads "There is no handler bound to this
element!". Nothing is lost, and the list keeps working.

It happens in every library list:

- Settings › Workflow › "Publisher Library" ("Press Library", "Preprint
  Server Library").
- The "Submission Library" window that a submission's "Library" button
  opens.
- The window that this window's "View Document Library" button opens.

## Impact

- **Lost**: nothing. Downloads and saves complete.
- **Who**: anyone who downloads a library file and then uses the list
  straight away, at an ordinary pace. The strip closes on a manager on
  the Settings tab, on anyone working on the submission in the
  "Submission Library" window, and on a manager in "View Document
  Library", where only managers are offered the arrows. Two downloads
  in a row raise the console error in any of these lists. That includes
  the read-only "View Document Library", which every workflow
  participant can open.
- **Way round**: press the arrow again. Nothing gets worse over time.

Low: nothing is lost, the task gets done, and the error shows only in
the browser's console.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- The dataset's Publisher Library holds no files, so add two: sign in
  as `dbarnes`, open Settings › Workflow › "Publisher Library" ("Press
  Library" on OMP, "Preprint Server Library" on OPS), press "Add a
  file", type "Name" `u39c guide`, choose "Type" "Other", upload any
  small file and press "OK"; then the same with "Name" `u39c contract`.
- The browser's developer console open.

The strip, signed in as `dbarnes` on that tab:

1. Press the name "u39c guide". The file downloads and the page stays.
2. Within two seconds, press the arrow at the start of the "u39c guide"
   row. The strip with "Edit" and "Delete" opens under the row.
3. Wait three seconds without touching anything.

Two downloads in a row:

4. Press "u39c guide", then within two seconds press "u39c contract".
5. Wait three seconds.

**Expected**: the strip stays open until its arrow is pressed again.
Both files download, and the console stays clean.

**Observed**: about two seconds after step 1 the page asks for the
whole list again (`…/grid/settings/library/library-file-admin-grid/fetch-grid`).
When the list comes back, the strip is closed and the arrow reads
closed. Three seconds after the arrow was pressed, "Edit" no longer
shows. In steps 4–5 both files download, and two seconds after the
second press the page's script fails. The screen shows nothing; the
browser records an uncaught error:

```
There is no handler bound to this element!
```

Control: when a name is pressed and nothing else is done for three and
a half seconds, no error is raised.

## Cause

When a library file's name is pressed,
`LinkActionHandler.activateAction()` disables the link (`disableLink()`).
`$.pkp.classes.linkAction.PostAndRedirectRequest`
(`lib/pkp/js/classes/linkAction/PostAndRedirectRequest.js`) then posts
`enable-link-action`. When the post answers, `handleResponse_()` points
the page at the download once no other request is running. It also
schedules `finishCallback_()` with `setTimeout(finishCallback, 2000)`,
so that a download which starts slowly is not started twice. The two
seconds therefore run from the post's answer, not from the press.

Two seconds later, `finishCallback_()` uses two things kept from the
press: the link element and the post's answer. Each use can go wrong.

First, it looks up the link's handler with
`$.pkp.classes.Handler.getHandler($linkActionElement)`, which throws
when the element holds none. The list can be drawn again in those two
seconds by another download link's timer (the next paragraph) or by a
save. `LibraryFileGridHandler`'s `saveFile()`, `updateFile()` and
`deleteFile()` all answer with a data changed event. Either way,
`GridHandler.replaceGridResponseHandler_()` replaces the grid through
jQuery's `replaceWith()`. That strips the old link's data, its handler
included, so the lookup throws. The new list carries new links, so
nothing else breaks.

Second, it hands the post's answer to `handleJson()`.
`FileApiHandler::enableLinkAction()` answers
`DAO::getDataChangedEvent()` with no element id. The event bubbles from
the link to its grid, and `GridHandler.refreshGridHandler()` fetches the
whole grid again and replaces it, which closes every strip. The redraw
does nothing else, because `this.finish()` has already re-enabled the
link through `LinkActionHandler.enableLink()`. The redraw once made the
rows show the files as viewed, but `recordDownload()` stopped recording
views in `pkp/pkp-lib#6359` (3.3). Library files never recorded views.

b6e896ab6d moved both the handler lookup and `handleJson()` from the
post's answer into the two-second timer. The purpose was to keep the
redraw from putting back an enabled link before the download had
started. Before that commit, both ran as soon as the post answered,
while the link was surely still in the page.

Reach:

- Every library list. The Settings tab is `LibraryFileAdminGridHandler`.
  The "Submission Library" window is `SubmissionDocumentsFilesGridHandler`.
  Its "View Document Library" (`viewLibrary()`) loads
  `LibraryFileAdminGridHandler` again, in a modal. All of them render
  names through `LibraryFileGridCellProvider` and
  `DownloadLibraryFileLinkAction` (walked on the tab, the rest in code).
- A save inside the two seconds, such as "OK" in "Edit" pressed within
  two seconds of a download, also makes the lookup throw. This was
  walked at machine pace, because a person cannot press the arrow,
  press "Edit", wait for the window to load and press "OK" inside two
  seconds. A developer can widen the window by raising the `2000` in
  `PostAndRedirectRequest.js`, with `enable_minified` off.
- Every other link built on `PostAndRedirectAction`:
  `DownloadFileLinkAction` (submission file names in the legacy file
  lists through `FileNameGridColumn`, file links in the History list's
  `EventLogGridRow`, OJS's `ArticleGalleyGridCellProvider` and OPS's
  `PreprintGalleyGridCellProvider`) and `DownloadAllLinkAction`. They
  post `record-download`, which answers through `enableLinkAction()`,
  so they have the same timer and the same redraw (code, not walked).
- No other timer in `lib/pkp/js` looks up a handler with `getHandler()`
  (code).

## Proposed fix

Proposed, for the team to decide: in pkp-lib, let the timer stop when
its link is gone, and answer the download's post without an event. The
fix
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-download-redraws-list/fix.diff))
applies to `main` as it stands:

```diff
--- a/lib/pkp/js/classes/linkAction/PostAndRedirectRequest.js
+++ b/lib/pkp/js/classes/linkAction/PostAndRedirectRequest.js
 		var $linkActionElement = this.getLinkActionElement(),
-				// Get the link action handler to handle the json response.
-				linkActionHandler = $.pkp.classes.Handler.getHandler($linkActionElement);
+				linkActionHandler;
 
+		// The list holding the link may have been drawn again since the
+		// press (a save, another download): the link is gone, so there is
+		// nothing left to re-enable and the post answer is stale.
+		if (!$.pkp.classes.Handler.hasHandler($linkActionElement)) {
+			return;
+		}
+
+		// Get the link action handler to handle the json response.
+		linkActionHandler = $.pkp.classes.Handler.getHandler($linkActionElement);
 		this.finish();
 		linkActionHandler.handleJson(this.postJsonData_);
--- a/lib/pkp/controllers/api/file/FileApiHandler.php
+++ b/lib/pkp/controllers/api/file/FileApiHandler.php
     public function enableLinkAction($args, $request)
     {
-        return \PKP\db\DAO::getDataChangedEvent();
+        return new JSONMessage(true);
     }
```

The check uses `Handler.hasHandler()`, which `Handler.js` already uses
for the same question. Its early return also skips `finish()`. That
call re-enables the link and triggers `actionStop` on it, and neither
matters for a link that is no longer in the page: nothing in
`lib/pkp/js` listens for `actionStop`. `new JSONMessage(true)` is the
plain answer that other handlers give when there is nothing to update.

The two-second delay stays, so a second press inside it still
downloads nothing more (the delay's purpose, `pkp/pkp-lib#247`). Both
changes are needed. With only the answer changed, a save inside the two
seconds still removes the link before its timer runs. With only the
check, every download still redraws its list.

Tried on all three apps on `main`. The Steps now show the Expected: the
strip stays open, nothing fails in the page, and the list is not
fetched again. The save path raises no error either. With the fix in
and out, the link is disabled right after the press and ready again
after the two seconds. A second press inside that time downloads
nothing. An "Edit" that renames a file still draws the list again with
the new name, and that file then downloads.

**Alternatives**:

- Redraw only the link's row, with a data changed event naming the row.
  That still closes that row's strip and still fetches the row again
  although nothing in it changed.
- Drop `handleJson()` from `finishCallback_()`. That breaks the class's
  promise that an event in the post's answer is handled, which a
  plugin's `PostAndRedirectAction` may rely on.
- Handle the answer as soon as the post returns, undoing b6e896ab6d's
  move. That brings back the early-enabled link the delay prevents.

**What goes with it**:

- A rebuilt `js/pkp.min.js`, which `lib/pkp/tools/buildjs.sh` writes at
  each app's root. It is committed in ojs, omp and ops, so the
  JavaScript change needs a rebuild committed in each of the three app
  repos, on every branch the fix reaches.
- `recordDownload()`'s comment ("return js event to update grid rows")
  is out of date since `pkp/pkp-lib#6359` and can say what the method
  does now.
- Backport: the same two files on 3.5 and 3.4. On 3.3,
  `FileApiHandler.inc.php` takes the same one-line change (it already
  imports `JSONMessage`).
- The guard: an e2e scenario in pkp-e2e's U39 spec. It presses a
  library file's name, opens a row's strip within two seconds, and
  reads the strip still open three seconds later. It then presses two
  names in a row and reads no page error.

Medium: the code change is a three-line check in one JavaScript method
and a one-line answer in one PHP method, tried as written. But it
spans pkp-lib and a `js/pkp.min.js` rebuild committed in each of the
three app repos, and it needs the e2e guard.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-download-redraws-list/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-download-redraws-list/lib.js).
  It ran on installs freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL). Each install used the
  dataset's own config, so `enable_minified` was off and the
  unminified scripts were served. The command
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/library-download-redraws-list/walk.js`
  takes the Steps and then the save path. With `nb` as the last
  argument, it runs only the checks that the fix must leave unchanged:
  the link's disable and re-enable timing, and a rename that draws the
  list again. The script presses at machine pace: the arrow 1 s
  after the name and the second name under 1 s after the first, both
  within a person's reach. For the save path, "OK" came about 0.25 s
  after the name.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS: the same
  outcome on every app and line. Every request answered 200.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` lib/pkp 767353f4fe; `stable-3_3_0` lib/pkp
  ac3fa73402. The two files are the same in the three `main` checkouts.
- Code reads: on 3.5, 3.4 and 3.3, `PostAndRedirectRequest.js`
  (`finishCallback_()`, `handleResponse_()`), `Handler.getHandler()`,
  the grid's `dataChanged` binding and `replaceWith()` in
  `GridHandler.js`, and `FileApiHandler::enableLinkAction()`. The code
  is the same on all three (3.3's handler is in
  `FileApiHandler.inc.php`). The library lists sit on the same grid
  classes on every version.
- Introduced: `git blame` on `finishCallback_()`'s handler lookup and
  `handleJson()` call, and on the `setTimeout` in `handleResponse_()`,
  gives b6e896ab6d ("Avoid redirecting while ajax requests are still
  running, fix the finish callback"). Its diff moves both calls from
  `handleResponse_()` into `finishCallback_()`. GitHub lists no pull
  request for it. `enableLinkAction()`'s data changed answer dates from
  669d0aba9b (2013). `recordDownload()` lost its view recording in
  1ed21fba6c (`pkp/pkp-lib#6359`, 2020).
- Upstream searched in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, by "There is no handler bound to this element",
  `PostAndRedirectRequest`, `enableLinkAction`, `recordDownload` and
  library file download grid refresh. `pkp/pkp-lib#247` (closed 2021)
  is the delay's own issue and covers another fault: the link can come
  back before a slow download starts.
- Not walked: the "Submission Library" window, "View Document Library"
  and the other `PostAndRedirectAction` links (code only); 3.4 and 3.3
  (code).
