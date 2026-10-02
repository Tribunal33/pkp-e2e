# After a refused "Delete" or "Disable", the confirmation window stays open with a spinner that never stops

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the window stays open after the alert, without a spinner and with working buttons)
  - 3.3: none (code; the same)
- **Introduced** `pkp/pkp-lib#9871` for `pkp/pkp-lib#9870` · [047c7598f1](https://github.com/pkp/pkp-lib/commit/047c7598f1f2e83c93687566bc9bc2fd5b374f02) · 2024-04-10 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U62 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a9), spec U58 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager presses "OK" in a confirmation window, for instance "Delete"
on a submission component that files still use. The server refuses,
and the browser shows the reason in an alert. Once the alert is
closed, the window stays open with a spinner, as if the action were
still running. On 3.5 its "OK" and "Cancel" are disabled as well. Up to
3.4 the window also stayed open, but without a spinner and with
working buttons.

Nothing is lost, and the refusal is right. The window has to be closed
by hand: Escape closes it, and on `main` so does "Cancel".

This happens in the confirmation windows of the older lists, those
with an arrow on each row, whenever the server refuses the confirmed
action. Two such refusals were tried. The first is a manager deleting
a component that files use. The second is a Site Administrator who
has no manager role in a journal, unticking one of its plugins.

## Impact

- **Lost**: nothing; the spinner only suggests the action is still
  running.
- **Who**: a journal manager who deletes a component that files use
  (Settings › Workflow › "Submission" › "Components"); a Site
  Administrator without a manager role in a journal who unticks its
  plugins; and anyone whose confirmed action in one of the older lists
  is refused, in settings, issues, galleys or a submission's
  participants and files.
- **Way round**: press Escape (or "Cancel" on `main`).

Low on both versions: the window closes with Escape, also on 3.5 where
its buttons are disabled. A window that nothing but a reload closed
would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. On OMP read "Book
  Manuscript" for "Article Text", "Hosted Presses" for "Hosted
  Journals" and "Press manager" for "Journal manager"; on OPS read
  "Preprint Text", "Hosted Servers" and "Preprint Server manager".

Deleting a component in use:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Components".
3. Press the arrow of the "Article Text" row, then "Delete".
4. Press "OK" in the "Delete" window ("Are you sure you wish to delete
   this item? This action cannot be undone.").
5. Close the alert.

Disabling a plugin as a Site Administrator without a manager role
(`admin` holds Site administrator and Journal manager; "Reader" is
ticked first because the "Edit User" form refuses a save with no role
ticked):

6. Sign in as `admin`.
7. Open Administration › "Hosted Journals", press the arrow of the
   `publicknowledge` row, then "Settings wizard".
8. Open the "Users" tab, press "Search", type "admin" and press
   "Search". Press the arrow of the `admin` row, then "Edit User".
9. Under "User Roles", tick "Reader" and untick "Journal manager", then
   press "OK".
10. Sign out, and sign in again as `admin`.
11. Open Administration › "Hosted Journals" › `publicknowledge` ›
    "Settings wizard", tab "Plugins".
12. Under "Generic Plugins", untick "Web Feed Plugin" and press "OK" in
    the "Disable" window ("Are you sure you want to disable this
    plugin?").
13. Close the alert.

**Expected**: after each alert the window closes, or at least can be
answered again as it could up to 3.4; "Article Text" is still listed
and "Web Feed Plugin" still ticked.

**Observed**: at step 4 the browser shows the alert "Before this
component can be deleted, you must associate all related submission
files with a different component." At step 12 it shows a refusal alert
too: on OJS and OPS a raw key, a fault of its own
([U62-A9-plugin-switch-refusal-raw-key.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U62-A9-plugin-switch-refusal-raw-key.md)),
on OMP "You do not have sufficient privileges to manage this plugin."
The requests answer 200, for instance:

```
{"status":false,"content":"Before this component can be deleted, you must associate all related submission files with a different component.","elementId":"0","events":[]}
```

After the alert, each window stays open with its text, "OK", "Cancel"
and a spinner, still there 4 seconds later. On `main` both buttons are
enabled and "Cancel" closes the window; on 3.5 both are disabled.
Escape closes it on both. "Article Text" stays listed, and "Web Feed
Plugin" stays ticked, which is right, as the plugin is still on.

Control: with the Journal manager role kept, unticking "Web Feed
Plugin" in the same tab and pressing "OK" closes the window, and the
box is unticked after a reload.

## Cause

`RemoteActionConfirmationModalHandler.remoteResponse()`
(`lib/pkp/js/controllers/modal/RemoteActionConfirmationModalHandler.js`)
closes the window only when `handleJson()` accepts the answer. On
`status: false`, `Handler.handleJson()` shows the answer's `content`
in an alert and returns false, and the window is left open.

`pkp/pkp-lib#9871` ("Consolidate modal rendering stack", 047c7598f1,
for `pkp/pkp-lib#9870`, "Render legacy modals via Vue.js") made
`ConfirmationModalHandler.modalOpen()` open the ui-library dialog
through the `open-dialog-vue` event. That dialog starts a spinner when
an action is pressed and keeps it until the dialog closes
(`fireCallback()` in `DialogBody.vue` on `main`, in `Dialog.vue` on
3.5, where the same flag also disables the buttons). The legacy
handler has no way to stop it, so a window left open after a refusal
spins until it is closed. Escape still closes it: the dialog's own
close (`handleCloseUpdate()`) runs the legacy close handler.

Reach:

- `RemoteActionConfirmationModal` is built at 43 places in OJS with its
  lib/pkp and plugins (counted in the code), and any of them shows this
  when its request is refused, by the handler itself or by its
  authorization (`PKPComponentRouter::handleAuthorizationFailure()`
  answers `status: false` too). They are the legacy row lists: the
  settings lists (sections, components, review forms, roles, users,
  languages, navigation menus, plugins, hosted journals), announcements,
  subscriptions, issues and their table of contents, article and issue
  galleys, a submission's files and participants, and the Static Pages
  and Custom Block Manager lists.
- Tried: "Delete" of a component in use (`GenreGridHandler::deleteGenre()`,
  `manager.genres.alertDelete`) and a refused plugin "Disable"
  (`PluginLevelRequiredPolicy`), on the three apps, `main` and 3.5.
- A refused plugin tick (`enable`) uses `AjaxAction`, not a window: the
  alert shows, nothing stays open, and the box stays unticked (tried).
- Not covered: a request that fails with a server error. `$.post()`
  has no error callback there, so `remoteResponse()` never runs and
  the window spins too (the custom block delete on PostgreSQL, spec
  U09 A14, which has its own report).

## Proposed fix

Close the window after the answer whatever its status, in
`RemoteActionConfirmationModalHandler.remoteResponse()`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/fix.diff).

```diff
--- a/lib/pkp/js/controllers/modal/RemoteActionConfirmationModalHandler.js
+++ b/lib/pkp/js/controllers/modal/RemoteActionConfirmationModalHandler.js
@@ -126,10 +126,11 @@
 	$.pkp.controllers.modal.RemoteActionConfirmationModalHandler.prototype.
 			remoteResponse = function(ajaxOptions, jsonData) {
 
-		var processedJsonData = this.parent('remoteResponse', ajaxOptions, jsonData);
-		if (processedJsonData !== false) {
-			this.modalClose(ajaxOptions);
-		}
+		// A refusal (status false) has had its message alerted by handleJson().
+		// Close the window either way: the dialog shows a spinner from the moment
+		// "OK" is pressed and has no way to stop it while it stays open.
+		this.parent('remoteResponse', ajaxOptions, jsonData);
+		this.modalClose(ajaxOptions);
 		return false;
 	};
 
```

Tried on `main`, the three apps. After the alert at steps 4 and 12
the window closes, "Article Text" is still listed and "Web Feed
Plugin" still ticked. A manager's tick and untick in the same tab
switch both plugins and close the window, with the fix and without it.

The fix sits in the one handler every such window uses and needs no
change to the ui-library. No caller overrides `remoteResponse()` or
relies on the window staying open (searched in lib/pkp and the apps).

**Alternatives**:

- Keep the window open and stop its spinner, as up to 3.4: the dialog
  would need a new signal from the legacy handler (an event the modal
  store listens to), a change in two repos, for a window whose "OK"
  would only be refused again.
- Show the refusal inside the dialog instead of an alert: better
  looking, but it changes `Handler.handleJson()`, which every legacy
  form and list uses.

**What goes with it**:

- Backport: `RemoteActionConfirmationModalHandler.js` is the same on
  3.5, so the diff applies as written there. 3.4 and 3.3 need nothing.
- The server-error path above could get a `.fail()` that closes the
  window too; left out here, as it has its own report.
- A regression test: delete a component that files use, confirm, and
  check that the window is gone after the alert.

Small: four lines in one JavaScript file of pkp-lib, following the
handler's own success path, with no data or API change.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/lib.js))
  takes steps 6–13 (with a refused tick of "Google Analytics Plugin"
  before step 12), then "Cancel" when the window stays open. With
  `neighbour` it takes the control and then steps 1–5 with "Cancel";
  with `dismiss`, steps 1–5 and then Escape. Each run starts from an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/walk.js [neighbour|dismiss]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Chromium on PostgreSQL. Datasets: pkp/datasets c657990 (2026-10-01).
  The spinner and the disabled buttons were read from the window's
  elements. A click outside the window was not tried, as Escape had
  closed it.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3; pkp-lib cf3f984335; ui-library d4e01883.
  3.4: pkp-lib 32b0f4b4af. 3.3: pkp-lib f6ab331645.
- Code reads for 3.4 and 3.3: pkp-lib's
  `RemoteActionConfirmationModalHandler.js` has the same
  `remoteResponse()`, but `ConfirmationModalHandler.modalBuild()`
  builds a jQuery window with plain "OK" and "Cancel" buttons and no
  spinner. The commit 047c7598f1 is not on either branch.
- Introduced: `git log -S "open-dialog-vue"` on
  `ConfirmationModalHandler.js` gives 047c7598f1 (`pkp/pkp-lib#9871`);
  the dialog's spinner on an action dates from ui-library ed8ce9df
  (2024-01-08), before legacy windows used it.
