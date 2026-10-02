# Hosted Journals: after a saved "Edit", the list keeps the journal's old name and path until a reload

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` (with `pkp/ojs#2067`) for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · committed 2018-10-23, merged 2019-01-09 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The Site Administrator changes a journal's title or path in the "Edit"
window of Administration › "Hosted Journals", sees "Saved", and the
window closes. The row still shows the old name and the old path until
the page is reloaded, so the list looks as if the save did not take.

Until the reload, the row's "Remove" confirmation also names the
journal by its old title.

## Impact

- **Lost**: nothing. The save is stored; the list shows it only after a
  reload, and nothing on the page says the list is out of date.
- **Who**: Site Administrators, every time they save a new title or
  path in the "Edit" window.
- **Way round**: reload the page. Before the reload, the stale row's
  "Edit" and "Settings wizard" still open the right journal with its new
  values, because they are built from the journal's id, not its path.

Low: only the row's text is wrong. It would be medium if the stale row's
"Settings wizard" or "Edit" led to the old address (a "404 Not Found")
or to another journal; they do not.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; a press or a server shows
  the same with "Hosted Presses" / "Public Knowledge Press" or "Hosted
  Servers" / "Public Knowledge Preprint Server"). The dataset's journal
  already has a "Country", so "Save" in its "Edit" window is not refused
  for a missing country.

Steps:

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals"
   (`/index.php/index/en/admin/contexts`). The row reads "Journal of
   Public Knowledge" under "Name" and `publicknowledge` under "Path".
3. Press the arrow at the start of the row and choose "Edit".
4. In "Journal title", replace the text with "Journal of Public
   Knowledge Renamed".
5. In "Path", replace `publicknowledge` with `publicknowledge2`.
6. Press "Save". "Saved" shows beside the button, and the window closes
   by itself about a second later.
7. Read the row.
8. Press the row's arrow again, choose "Remove", read the question, and
   press "Cancel".
9. Press the row's arrow again and choose "Edit": read "Journal title"
   and "Path".
10. Press "Close".
11. Press the row's arrow again and choose "Settings wizard".
12. Open Administration › "Hosted Journals" again and read the row.

**Expected**: at step 7 the row reads "Journal of Public Knowledge
Renamed" under "Name" and `publicknowledge2` under "Path", and step 8's
question names the new title.

**Observed**: at step 7 the row still reads "Journal of Public
Knowledge" and `publicknowledge`, though the save answered 200 and the
new path is stored. After the save, the browser sends no request for
the list. Step 8 asks:

```
Are you sure you want to permanently delete Journal of Public Knowledge and all of its contents?
```

The stale row's other actions reach the saved journal. At step 9 the
"Edit" window opens with "Journal of Public Knowledge Renamed" and
`publicknowledge2`. At step 11 "Settings wizard" opens
`/index.php/index/en/admin/wizard/1`, whose "Journal title" reads
"Journal of Public Knowledge Renamed". At step 12 the row reads "Journal
of Public Knowledge Renamed" and `publicknowledge2`.

## Cause

The "Edit" link of each row (`ContextGridRow::initialize()`,
`lib/pkp/controllers/grid/admin/context/ContextGridRow.php`, line 51)
opens an `AjaxModal` with `closeOnFormSuccessId` `context`. The window
holds the Vue context form (`ContextGridHandler::editContext()`,
`templates/admin/editContext.tpl`), which saves straight to the REST API
(`PUT {path}/api/v1/contexts/{id}`) and then emits `form-success` on
`pkp.eventBus`.

`ModalHandler.prototype.onFormSuccess_`
(`lib/pkp/js/controllers/modal/ModalHandler.js`, line 270) hears that
event and only closes the window. On `main` and 3.5, ui-library's
`AjaxModalWrapper.vue` (`onVueFormSuccess`) does the same for a window
a grid opened: it calls `modalHandler.modalClose()`. Neither sends
`dataChanged`, the event the grid refreshes on
(`GridHandler.js`, `refreshGridHandler`). That event used to come from
the server. A legacy form's handler answers with
`DAO::getDataChangedEvent()`, and the modal handler passes it on to the
grid. An API save has no such answer, so the list is never refetched.

Before `pkp/pkp-lib#3594`, the window held a legacy form that posted to
`updateContext` (OJS `JournalGridHandler`), which answered
`DAO::getDataChangedEvent($contextId)`, so the row refreshed. Commit
5f3be929e6 replaced that form with the Vue form and added
`closeOnFormSuccessId` to close the window on `form-success`, but
nothing took over the `dataChanged` event. `updateContext` is still
listed in `ContextGridHandler`'s role assignments (line 45), with no
method behind it.

Reach:

- "Edit" on Hosted Journals: the list's only two columns, "Name" and
  "Path", and the "Remove" question, whose text is built when the row is
  drawn (`admin.contexts.confirmDelete` with the journal's name). Walked
  on all three apps, `main` and 3.5.
- "Create Journal" uses the same window and `closeOnFormSuccessId`, but
  its form leads on to the new journal's Settings Wizard, so the list is
  left behind anyway (on screen).
- No other window opened from a grid closes on `form-success`: the
  `AjaxModal`s in pkp-lib, OJS, OMP and OPS on `main` pass
  `closeOnFormSuccessId` only for these two (code). The Navigation Menus
  form, also a Vue form opened from a grid, works round the same gap
  itself: `useNavigationMenuManagerForm.js` triggers `dataChanged` on
  the modal handler's element after its save (code).
- On `main`, `AjaxModalWrapper.onVueFormSuccess` calls
  `markDataChanged` for every window that closes on `form-success`. That
  marks the change in the Vue modal store, which tells a Vue opener but
  not a legacy grid. Windows opened from Vue (the publish window in
  `useWorkflowActions.js`, `useLegacyGridUrl.js`) have no modal handler,
  so the fix does not touch them (read in the code).

## Proposed fix

In `ModalHandler.prototype.onFormSuccess_`, trigger `dataChanged`
before closing:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/hosted-journals-list-keeps-old-name-after-edit/fix.diff).

```diff
--- a/lib/pkp/js/controllers/modal/ModalHandler.js
+++ b/lib/pkp/js/controllers/modal/ModalHandler.js
@@ -272,6 +272,9 @@
 		if (this.options.closeOnFormSuccessId &&
 				this.options.closeOnFormSuccessId === formId) {
 			var self = this;
+			// The form saved through the API, so no legacy form handler sends
+			// the dataChanged event that tells the opener (a grid) to refresh.
+			this.trigger('dataChanged');
 			pkp.eventBus.$emit('close-modal-vue-soon', {modalId: this.uniqueModalId});
```

The modal handler already publishes `dataChanged` to the link that
opened it (its constructor's `publishEvent('dataChanged')` and the event
bridge), and the link passes it to its grid. That is the path every
legacy form in a window takes, so putting the trigger in `ModalHandler`
covers every window a grid opens with `closeOnFormSuccessId`. The old
`updateContext` answer named the journal's id, so the grid refetched one
row (`fetchRow`). `onFormSuccess_` does not know the id, so the grid
refetches all its rows (`fetchGrid`), one small request for a site's
list of journals.

Tried on `main`, all three apps. After "Save", the list is refetched once
(`fetch-grid`), and at step 7 the row reads the new name and path. The
"Remove" question names the new title. No notification request followed
the save, and no notice showed. Two nearby actions were also checked,
with the fix in and out. "Close" without saving still sends no request
and leaves the row as it was. "Create Journal" still leads on to the new
journal's Settings Wizard; with the fix, the list is refetched once just
before that redirect.

**Alternatives**:

- The same line in ui-library's `AjaxModalWrapper.onVueFormSuccess`, for
  a window with a `modalHandler`. It covers `main` and 3.5, but not 3.4
  and 3.3, which have no `AjaxModalWrapper`, and it needs a ui-library
  build.
- A `dataChanged` trigger in `editContext.tpl` or the context form
  alone. That is a workaround for one form, the way the Navigation
  Menus form does it, and the next Vue form in a grid window would meet
  the same gap.

**What goes with it**:

- No data repair.
- What changes: grids that open a window with `closeOnFormSuccessId`
  refetch their rows after a successful save. Only the two context
  windows do so today. No API or plugin hook changes.
- Backport: the line applies as it stands to 3.5. On 3.4 and 3.3,
  `onFormSuccess_` has no `close-modal-vue-soon` line, so the hunk's
  context differs, but the same line goes in the same place. Installs
  with `enable_minified` on load `js/pkp.min.js`, which the release
  build makes from these files.
- Guard: a check in the e2e scenario for the "Edit" window (spec U59,
  scenario 3, "Saved") that reads the row before reloading, or the same
  read in pkp's own Cypress test that edits a context.

Small: one line in a shared script, following the pattern the code
already uses, and one test step.

## Evidence

- The kept script walks the Steps. Run with `neighbour` after its
  path, it checks the two nearby actions instead ("Close" without
  saving, and "Create Journal"):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/hosted-journals-list-keeps-old-name-after-edit/walk.js),
  helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/hosted-journals-list-keeps-old-name-after-edit/lib.js).
  Run it from a pkp-e2e checkout on an install freshly loaded from the
  default dataset (`<feature>` names the set of test installs, `<id>`
  the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/hosted-journals-list-keeps-old-name-after-edit/walk.js [neighbour]`.
  Put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01). No request failed on the server. Steps 9 to 12
  were walked on `main` only; on 3.5 the walk stopped after step 8 and
  reloaded the page instead.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d6736318 (OJS) and 280f98c570 (OMP, OPS). 3.5: OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335; ui-library d4e0188353.
  3.4: OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b; pkp-lib
  32b0f4b4af; ui-library ee684b34. 3.3: OJS ac77c9fb35, OMP 8e72fc8836,
  OPS c5532e2161; pkp-lib f6ab331645; ui-library 96959f9e.
- Code reads. `main` and 3.5: `ContextGridRow.php`,
  `ContextGridHandler.php` (`editContext`, the role assignments),
  `templates/admin/editContext.tpl`, `ModalHandler.js`
  (`onFormSuccess_`, the constructor's `publishEvent`),
  `AjaxModalHandler.js`, `ModalRequest.js` (the event bridge),
  `Handler.js` (`trigger`, `publishEvent`), `LinkActionHandler.js`,
  `GridHandler.js` (`refreshGridHandler`), ui-library
  `AjaxModalWrapper.vue`, `Form.vue` (`form-success`) and
  `useNavigationMenuManagerForm.js`. 3.4 and 3.3: the same
  `ContextGridRow` edit action with `closeOnFormSuccessId` `context`,
  the same `editContext.tpl` and the same `onFormSuccess_` without a
  `dataChanged`. OMP and OPS share these files through pkp-lib.
- Introduced: `git blame` on the edit action's `closeOnFormSuccessId`
  line gives e3f570bc37 (2021, the PSR-12 reformatting). `git log -S` gives
  5f3be929e6 as the commit that added it, together with OJS 43b3907299,
  which removed `JournalGridHandler::updateContext()` and its
  `DAO::getDataChangedEvent($contextId)` answer. The GitHub API's
  `commits/<sha>/pulls` gives `pkp/pkp-lib#3931` and `pkp/ojs#2067`.
  That the row refreshed before is read in the code, not walked.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for the list not updated or refreshed after editing a
  journal, press or server, hosted journals refresh or reload, the path
  change, `closeOnFormSuccessId`, `onFormSuccess_`, `ContextGridRow`,
  `onVueFormSuccess` and `AjaxModalWrapper`. `pkp/pkp-lib#7654` (the page
  not refreshed after removing a journal) is a different action and is
  closed. `pkp/pkp-lib#12826` (remove the grid code) lists
  `ContextGridRow.php` among the grids to replace, which would retire
  this window.
- The fault is in the browser and does not depend on the database.
