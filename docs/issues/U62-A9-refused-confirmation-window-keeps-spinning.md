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
- **Tracked in** spec U62 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a9), spec U58 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a12), spec U74 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a14)
- **Checked** 2026-10-02 (components, plugins) and 2026-10-03 (OMP representatives), each branch's tip (the commits in Evidence)

## Summary

A manager presses "OK" in a confirmation window, for instance "Delete"
on a submission component that files still use. The server refuses,
and the browser shows the reason in an alert. Once the alert is
closed, the window stays open with a spinner, as if the action were
still running. On `main` its buttons still work: "OK" sends the
refused request again and "Cancel" closes it. On 3.5 both buttons are
disabled as well. Up to 3.4 the window also stayed open, but without a
spinner and with working buttons.

Nothing is lost, and the refusal is right. Escape closes the window on
both versions.

This happens in the confirmation windows of the legacy lists, the
tables with an arrow on each row, whenever the server refuses the
confirmed action. Three refusals were tried: a manager deleting a
component that files use, a Site Administrator without a manager role
in a journal unticking one of its plugins (a journal's plugins are
managed by its own managers), and a press editor deleting a book's
representative that one of the book's markets names.

## Impact

- **Lost**: nothing.
- **Who**: anyone whose confirmed "Delete", "Disable" or similar
  action in a legacy list is refused: in settings, issues, galleys, a
  submission's participants and files, and a book's representatives.
  The three tried are exceptions (a component still in use, a role
  taken away, a representative a market still names).
- **Way round**: press Escape (or "Cancel" on `main`).

Low: the window closes with Escape on `main` and 3.5. A window that
only a page reload could close would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), OJS. On
  OMP read "Book Manuscript" for "Article Text", "Hosted Presses" for
  "Hosted Journals" and "Press manager" for "Journal manager"; on OPS
  read "Preprint Text", "Hosted Servers" and "Preprint Server manager".
  Steps 14 to 18 are OMP's only.

Deleting a component in use:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Components".
3. Press the arrow of the "Article Text" row, then "Delete".
4. Press "OK" in the "Delete" window ("Are you sure you wish to delete
   this item? This action cannot be undone.").
5. Close the alert.

Disabling a plugin as a Site Administrator without a manager role.
`admin` holds Site administrator and Journal manager; steps 6 to 10
take away Journal manager, and tick "Reader" only because the "Edit
User" form refuses a save with no role ticked:

6. Sign in as `admin`.
7. Open Administration › "Hosted Journals", press the arrow of the
   `publicknowledge` row, then "Settings wizard".
8. Open the "Users" tab. Press the "Search" link at the top of the
   list to open its search form, type "admin" in the "Search" box and
   press the form's "Search" button. Press the arrow of the `admin`
   row, then "Edit User".
9. Under "User Roles", tick "Reader" and untick "Journal manager", then
   press "OK".
10. Sign out, and sign in again as `admin`.
11. Open Administration › "Hosted Journals" › `publicknowledge` ›
    "Settings wizard", tab "Plugins".
12. Under "Generic Plugins", untick "Web Feed Plugin" and press "OK" in
    the "Disable" window ("Are you sure you want to disable this
    plugin?").
13. Close the alert.

Deleting a book's representative that a market names (OMP; submission
4, "How Canadians Communicate: Contexts of Canadian Popular Culture",
in Production with the format "PDF" and no representatives):

14. Sign in as `dbarnes`. Open submission 4 and choose "Marketing" ›
    "Representatives" in the side menu.
15. Press "Add Representative", click "Agent", choose "Sales agent
    (08)" under "Role", type `Beta Agency` in "Name" and press "OK".
    Reload the page: on an install with no representative yet, the
    first one is listed only after a reload, a separate fault.
16. Choose "Publication Formats", press the arrow of "PDF", then
    "Edit", and open the "Metadata" tab. Under "Market Territories"
    press "Add Market", choose "Canada (CA)" among the included
    countries, type `20261001` in "Date" and `25` in "Price", choose
    "Beta Agency" under "Agent" and press "OK".
17. Close the format window and choose "Marketing" ›
    "Representatives". Press the arrow of "Beta Agency", then
    "Delete", and press "OK" in the "Delete" window.
18. Close the alert.

**Expected**: after each alert the window closes; "Article Text",
"Web Feed Plugin" (ticked) and "Beta Agency" are kept.

**Observed**: at step 4 the browser shows the alert "Before this
component can be deleted, you must associate all related submission
files with a different component." At step 12 it shows a refusal alert
too: on OJS and OPS a raw key, a fault of its own
([U62-A9-plugin-switch-refusal-raw-key.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U62-A9-plugin-switch-refusal-raw-key.md)),
on OMP "You do not have sufficient privileges to manage this plugin."
At step 17 it shows "You can not delete this representative because
they are assigned to the market metadata for one or more publication
formats for this submission." The requests answer 200, for instance:

```
{"status":false,"content":"Before this component can be deleted, you must associate all related submission files with a different component.","elementId":"0","events":[]}
```

After each alert the window stays open with its text, "OK", "Cancel"
and a spinner, still there 4 seconds later:

- On `main` that spinner is the only fault: both buttons are enabled,
  "OK" raises the same alert again and "Cancel" closes the window.
- On 3.5 both buttons are disabled as well, so only Escape closes it.

"Article Text", "Web Feed Plugin" and "Beta Agency" are kept.

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
an action is pressed and keeps it until the dialog closes. The legacy
handler has no way to stop it, so a window left open after a refusal
spins until it is closed.

On 3.5 the same loading flag also disables the buttons (`Dialog.vue`,
`:is-disabled="isLoading"`). On `main`, ui-library d4adfb7a
(`pkp/pkp-lib#11290`, 2025-04-23) moved the buttons into
`DialogBody.vue`, where they follow the `isLoading` prop while the
spinner also follows the body's own `isDialogLoading`, which
`fireCallback()` sets; so on `main` only the spinner stays.

Escape still closes the window: the dialog's `onClose()` emits
`close`, `ModalManager` calls `modalStore.closeDialog()`, and that
runs the legacy handler's close (`closeLegacyHandler`).

Reach:

- `RemoteActionConfirmationModal` is built at 43 places in OJS with its
  lib/pkp and plugins (counted in the code), and any of them shows this
  when its request is refused, by the handler itself or by its
  authorization (`PKPComponentRouter::handleAuthorizationFailure()`
  answers `status: false` too). They are the legacy lists: the
  settings lists (sections, components, review forms, roles, users,
  languages, navigation menus, plugins, hosted journals), announcements,
  subscriptions, issues and their table of contents, article and issue
  galleys, a submission's files and participants, the Static Pages and
  Custom Block Manager lists, and OMP's book representatives.
- Tried: "Delete" of a component in use (`GenreGridHandler::deleteGenre()`,
  `manager.genres.alertDelete`) and a refused plugin "Disable" (denied
  by the `PluginAccessPolicy` set: the manager branch's
  `RoleBasedHandlerOperationPolicy` fails without a manager role, and
  the site administrator branch's `PluginLevelRequiredPolicy` admits
  only site plugins), on the three apps, `main` and 3.5; and "Delete"
  of a book representative a market names (OMP
  `RepresentativesGridHandler::deleteRepresentative()`,
  `manager.representative.inUse`), on OMP, `main` and 3.5.
- A refused plugin tick (`enable`) uses `AjaxAction`, not a window: the
  alert shows, nothing stays open, and the box stays unticked (tried).
- Not covered: a request that fails with a server error. `$.post()`
  has no error callback there, so `remoteResponse()` never runs and
  the window spins too (the custom block delete on PostgreSQL, spec
  U09 A14, which has its own report).

## Proposed fix

Close the window after any answer `handleJson()` can read, in
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

Tried on `main`, on the three apps, with `enable_minified = Off` (the
dataset's own setting, which loads the source file): after each alert
the window closes and the refused item is kept. Successful deletes and
disables close the window as before, with the fix and without it. No
caller overrides `remoteResponse()` or relies on the window staying
open (searched in lib/pkp and the apps).

**Alternatives**:

- Keep the window open and stop its spinner, as up to 3.4: the dialog
  would need a new signal from the legacy handler (an event the modal
  store listens to), a change in two repos, for a window whose "OK"
  would only be refused again.
- Show the refusal inside the dialog instead of an alert: better
  looking, but it changes `Handler.handleJson()`, which every legacy
  form and list uses.

**What goes with it**:

- Each app tracks a built `js/pkp.min.js`, which installs with
  `enable_minified = On` load; the app PRs regenerate it
  (`lib/pkp/tools/buildjs.sh`).
- Backport: `RemoteActionConfirmationModalHandler.js` is the same on
  3.5, so the diff applies as written there.
- Left out: an answer that is empty or not JSON makes `handleJson()`
  throw before `modalClose()` runs, so that window still spins, as
  does the server-error path above. Both are failed requests rather
  than refusals; a `.fail()` and a `try` around the parent call would
  cover them, best together with the server-error report.
- A regression test: delete a component that files use, confirm, and
  check that the window is gone after the alert.

Small: four lines in one JavaScript file of pkp-lib, following the
handler's own success path.

## Evidence

- The kept script for steps 1 to 13 (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/lib.js)):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/walk.js).
  It takes steps 6 to 13 (with a refused tick of "Google Analytics
  Plugin" before step 12), then "Cancel"; run with an argument it takes
  the control and steps 1 to 5 instead, closing the window with
  "Cancel" or with Escape:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The kept script for steps 14 to 18:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/representative-window-refuses-supplier/walk.js)
  of the representatives reports, which also presses "OK" again and
  then "Cancel":
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/representative-window-refuses-supplier/walk.js`.
- Chromium on PostgreSQL. Steps 1 to 13: walked 2026-10-02 on
  pkp/datasets c657990 (2026-10-01). Steps 14 to 18: walked 2026-10-03
  on pkp/datasets e8dafbc (2026-10-02). The spinner and the disabled
  buttons were read from the window's elements. A click outside the
  window was not tried, as Escape had closed it.
- Branch tips, 2026-10-02. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS
  c8af945bb7; pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS);
  ui-library 64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3; pkp-lib cf3f984335;
  ui-library d4e01883. 3.4: pkp-lib 32b0f4b4af. 3.3: pkp-lib
  f6ab331645. The OMP tips were the same on 2026-10-03.
- Code reads for 3.4 and 3.3: pkp-lib's
  `RemoteActionConfirmationModalHandler.js` has the same
  `remoteResponse()`, but `ConfirmationModalHandler.modalBuild()`
  builds a jQuery window with plain "OK" and "Cancel" buttons and no
  spinner. The commit 047c7598f1 is not on either branch.
- Introduced: `git log -S "open-dialog-vue"` on
  `ConfirmationModalHandler.js` gives 047c7598f1 (`pkp/pkp-lib#9871`).
  The dialog's spinner on an action is older (ui-library `Dialog.vue`
  had it by d0ffc05a, 2020); it reached the legacy windows with
  047c7598f1. d4adfb7a is on ui-library `main` only, not on 3.5's
  d4e01883.
