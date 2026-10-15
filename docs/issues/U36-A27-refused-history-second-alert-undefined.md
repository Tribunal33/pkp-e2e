# A refused "History" tab in a file's "More Information" shows a second alert that reads only "undefined"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** bug 7247 of pkp's old Bugzilla tracker (no pull request) · [90c85781c0](https://github.com/pkp/pkp-lib/commit/90c85781c0a557ae398c5b072022d2cc2652e70b) · 2012-04-11 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#11320` (open), covering the refusal in "Upload/Select Files" and naming this "undefined" alert as part of its symptom; this report's fix removes that alert there as well (the fault is in the loader both cases share), while the refusal stays #11320's subject. `pkp/pkp-lib#4074` (closed): a 2019 comment shows the same two alerts on another screen; that refusal was fixed, the second alert was not
- **Tracked in** spec U36 [A27](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a27)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When the app refuses the "History" tab of a file's "More Information"
to the person who opened the window, the browser shows the alert "The
current role does not have access to this operation.", and then a
second alert that says only "undefined". The first alert reports the
refusal; the second tells nothing and has to be dismissed as well.

It follows every such refusal, whatever the refusal's own cause: an
assistant role's (a Copyeditor's) "History" tab, and "More
Information" on another stage's file in "Upload/Select Files".

## Impact

- **Lost** Nothing. The extra alert reads like a fault of the app.
- **Who** Anyone the "History" tab is refused to: every assistant role
  on every opening of "More Information" on their stage's files, and
  editors opening "More Information" on a file listed under another
  stage in "Upload/Select Files". Whether those two refusals are right
  is reported apart:
  [pkp-e2e#531](https://github.com/jardakotesovec/pkp-e2e/issues/531)
  (the assistant roles) and
  [pkp-e2e#526](https://github.com/jardakotesovec/pkp-e2e/issues/526)
  ("Upload/Select Files"). Fixing them removes both alerts in those two
  places; any other refused load keeps the second one.
- **Way round** Press "OK" on both alerts. The window stays open on
  "History", which keeps showing "Loading".

Low: a message with no content; it would stay low however often it
shows.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; for OMP use the names in
  brackets), context `publicknowledge`. Submission 3, "The Facets Of
  Job Satisfaction: A Nine-Nation Comparative Study Of Construct
  Equivalence", is in Copyediting with `mfritz` assigned as Copyeditor
  [OMP: submission 7, "Accessible Elements: Teaching Science Online and
  at a Distance"].
- The dataset has no file on "Copyedited Files", so part B uploads one:
  any small PDF, here named `hkk29-copyedit.pdf`.

A. An editor, in "Upload/Select Files":

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 3 [OMP: 7] and select "Copyediting" in the side menu.
3. Above "Draft Files", press "Upload/Select Files".
4. Tick "Show files from all accessible workflow stages.".
5. Under "Submission", press the arrow before the file's name ("The
   Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
   Construct Equivalence.pdf" [OMP: `intro.pdf`]) and press "More
   Information".

B. A Copyeditor, on a file of their own stage:

6. Sign out, and sign in as `mfritz` (password `mfritzmfritz`).
7. Open submission 3 [OMP: 7] from the dashboard. The workflow opens on
   "Copyediting".
8. Above "Copyedited Files", press "Upload/Select Files", then "Upload
   File" in the window. Choose the component "Article Text" [OMP: "Book
   Manuscript"], pick `hkk29-copyedit.pdf`, press "Continue",
   "Continue", "Complete", then "OK".
9. In the row of `hkk29-copyedit.pdf`, open "More Actions" and choose
   "More Information".

**Expected** At 5 and at 9 the window "Information Center: …" opens on
"History" and, since the tab is refused, the browser says so once:

```
The current role does not have access to this operation.
```

**Observed** At 5 and at 9 the browser shows two alerts, one after the
other:

```
The current role does not have access to this operation.
```

```
undefined
```

The request behind the tab is sent once and answers 200 with the
refusal, at step 5 for example:

```
GET …/$$$call$$$/grid/event-log/submission-file-event-log-grid/fetch-grid?submissionId=3&submissionFileId=15&stageId=4
{"status":false,"content":"The current role does not have access to this operation.", …}
```

After the alerts the tab shows "Loading" for as long as it stays open.

## Cause

The "History" tab is a placeholder that loads the history list on its
own, through the legacy loader `$.pkp.controllers.UrlInDivHandler`
(`lib/pkp/js/controllers/UrlInDivHandler.js`; the template
`templates/common/urlInEl.tpl`, which `TemplateManager::fetchAjax()` and
the Smarty function `{load_url_in_div}` emit).

Its `handleLoadedContent_()` passes the answer to the shared
`Handler.handleJson()` (`lib/pkp/js/classes/Handler.js`). For an answer
with `status: false`, `handleJson()` alerts the answer's `content`
itself and returns `false`. `handleLoadedContent_()` then tests
`handledJsonData.status === true`, which is false on `false`, and its
`else` branch alerts `handledJsonData.content` a second time. On `false`
that is `undefined`, which `alert()` shows as the word "undefined".

The two alerts date from the loader's first version: `handleJson()`
already alerted and returned `false` when commit 90c85781c0 converted
`url_in_div` to the JavaScript framework in 2012, and every later change
to the method kept the `else` branch.

Reach:

- Every refused or failed load through this loader, not only "History":
  about 38 templates use `{load_url_in_div}` (settings grids, review
  and file-selection windows, the author's dashboard) and a few
  handlers return `fetchAjax()`, all read in the code, not driven. An
  answer of `status: false` with no text gives a single alert,
  "undefined" (read in the code).
- No other caller of `handleJson()` alerts a second time (searched
  `lib/pkp/js` for `handleJson(` and for `alert(`). `GridHandler`,
  `AjaxFormHandler`, `ListbuilderHandler`, `TabHandler` and
  `NotificationHandler` test the result against `false` before reading
  it.
- The two refusals the steps meet have causes of their own, each with
  its report:
  [U36-A3-assistant-file-history-keeps-loading.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A3-assistant-file-history-keeps-loading.md)
  and
  [U36-A19-select-files-other-stage-row-actions-refused.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A19-select-files-other-stage-row-actions-refused.md).
  Their fixes lift those two refusals; this report's fix removes the
  second alert from every refusal that remains.

## Proposed fix

A proposal: let `handleJson()` own the message, as every other caller
does, and drop the loader's own alert
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-history-second-alert-undefined/fix.diff)).

```diff
--- a/lib/pkp/js/controllers/UrlInDivHandler.js
+++ b/lib/pkp/js/controllers/UrlInDivHandler.js
@@ -94,7 +94,7 @@
 			function(ajaxContext, jsonData) {
 
 		var handledJsonData = this.handleJson(jsonData), urlInDivHandler = this;
-		if (handledJsonData.status === true) {
+		if (handledJsonData !== false) {
 			if (handledJsonData.content === undefined) {
 				// Request successful, but no data returned.
 				// Hide this div element.
@@ -114,10 +114,9 @@
 							[urlInDivHandler.getHtmlElement().attr('id')]);
 				});
 			}
-		} else {
-			// Alert that loading failed.
-			alert(handledJsonData.content);
 		}
+		// A refused or failed load has already been shown by handleJson(),
+		// which alerts the server's message and returns false.
 
 		return false;
 	};
```

`handleJson()` returns the answer only when its `status` is `true`, so
`!== false` keeps every successful load as it is; the `!== false` check
follows `GridHandler.replaceElementResponseHandler()` and
`AjaxFormHandler.handleResponse()`.

Tried on `main`, OJS and OMP: with the diff applied both parts of the
steps show one alert, the refusal, and no "undefined"; the tab still
shows "Loading". Loads that succeed through the same loader were
checked with the diff applied and without it, and looked the same both
times, with no alert: an editor's "History" on a submission file (OJS,
OMP), and the "Installed Plugins" list of "Settings" > "Website" >
"Plugins" (OJS, OMP, OPS).

**Alternatives**

- Make `handleJson()` stop alerting and leave the message to each
  caller. It would touch every legacy handler for one caller's mistake.
- Keep the `else` branch and alert only when `handledJsonData` is not
  `false`. It keeps a branch that can never run, since `handleJson()`
  returns either the answer with `status: true` or `false`.

**What goes with it**

- No data repair. The diff applies as written to `stable-3_5_0`, where
  the file is identical, and the same lines are on 3.4 and 3.3.
- `main`'s `config.TEMPLATE.inc.php` ships `enable_minified = Off`, so
  `main` serves the changed file directly. The stable branches and the
  releases ship `On`, so there each app's own `js/pkp.min.js` (OJS, OMP,
  OPS) needs rebuilding with the change.
- The endless "Loading" after a refusal stays: the loader leaves its
  placeholder in place. Replacing it with a short message is a separate
  choice for the team.
- A guard: an e2e scenario in which a refused "History" tab raises one
  alert, the refusal's text.

Small: three lines in one pkp-lib file, and an e2e scenario.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-history-second-alert-undefined/walk.js)
  with its `lib.js`. On an install of PKP's default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/refused-history-second-alert-undefined/walk.js`;
  `MODE=neighbour` in front for the successful loads the Proposed fix
  names; `PKP_E2E_LINE=stable-3_5_0` for 3.5. The fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/refused-history-second-alert-undefined/fix.diff ojs omp ops`,
  the walk, `MODE=neighbour`, then `revert` and `MODE=neighbour` again.
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, on PostgreSQL,
  dataset pkp/datasets 7912e09 (2026-10-14). The installs serve the
  unminified JavaScript (`enable_minified = Off`, the dataset's own
  setting). The fault does not depend on the database.
- Tips: `main` OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f (each with
  pkp-lib b17fadae59, ui-library 47b565cb); `stable-3_5_0` OJS
  ca763c91cd, OMP a70bbb9c4 (pkp-lib 4045d9241e); pkp-lib
  `stable-3_4_0` 55c8e406b3, `stable-3_3_0` 5e84acd11b.
- Code reads: `UrlInDivHandler.handleLoadedContent_()` and
  `Handler.handleJson()` on each line. On `stable-3_4_0` and
  `stable-3_3_0` the method has the same `else` branch and `handleJson()`
  the same alert and `return false`. Both refusals the steps meet exist
  on 3.4 and 3.3 (the A3 and A19 reports' code reads).
- Introduced: `git blame` on the `else` branch's `alert()` gives
  90be570b77 (2012-10-11, a lint rename of `jsonData` to
  `handledJsonData`); before it the same `alert(jsonData.content)` stood
  in 90c85781c0, the file's first commit, whose `Handler.handleJson()`
  already alerted and returned `false`. The commit names bug 7247;
  `commits/<sha>/pulls` finds no pull request.
- Upstream search, 2026-10-15, pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, by the symptom's words ("alert undefined", the
  refusal's text with "undefined") and by `UrlInDivHandler`,
  `handleLoadedContent` and `handleJson`. `pkp/pkp-lib#11320` names the
  two alerts in its "Actual Result" for the Review stage's "Upload/Select
  Files" window; its discussion is about the refusal. In
  `pkp/pkp-lib#4074` a 2019 comment describes "Access denied" followed
  by "undefined" on a plugin settings tab; the answer pointed to the
  refusal's fix.
- OPS not walked and left out of Affects: its default roles meet
  neither refusal (no Copyediting stage, no assistant assigned to a
  preprint). The loader is shared, so a refusal an OPS screen meets
  would show the same second alert: unverified, no such screen found.
- Not driven: refusals and failures through the loader outside the two
  "History" cases; the single "undefined" alert of a `status: false`
  answer without text is read in the code only.
