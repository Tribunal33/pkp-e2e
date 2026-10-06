# After Cancel in the "Reset Article Permissions" confirm box, the button stays greyed until the page is reloaded

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U40 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Pressing "Reset Article Permissions" and answering Cancel in the
browser's confirm box sends no request to reset the permissions and
changes nothing. But the button stays disabled, so a second attempt
needs a page reload. Same on a press ("Reset Monograph Permissions") and
a preprint server ("Reset Preprint Permissions").

## Impact

- **Lost**: nothing. The greyed button gives no reason.
- **Who**: a Journal, Press or Preprint Server Manager, or a Site
  Administrator, on Tools › Permissions, after answering Cancel. The
  tool is used rarely.
- **Way round**: reload the page; the button is usable again.

Low: the task gets done after a reload, and nothing is changed or lost.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS; the same on
OMP and OPS).

1. Sign in as `rvaca` (Journal manager).
2. Open Tools and its "Permissions" tab
   (`/index.php/publicknowledge/en/management/tools`).
3. Press "Reset Article Permissions" ("Reset Monograph Permissions" on
   the press, "Reset Preprint Permissions" on the preprint server).
4. The browser asks "Are you sure you wish to reset permissions data for
   all articles? This action can not be undone." Press "Cancel".
5. Press "Reset Article Permissions" again.

**Expected**: after Cancel the page is as it was: the button can be
pressed again, and pressing it asks again.

**Observed**: Cancel sends no request, which is right. But the button
is greyed and disabled as the box opens, and stays so after Cancel.
Pressing it again does nothing: no confirm box, no request. No request
failed and the browser logged no script error.

## Cause

`AjaxFormHandler.prototype.submitForm()` (lib/pkp
`js/controllers/form/AjaxFormHandler.js`, lines 78–83) greys the form's
submit buttons with `this.disableFormControls()` and only then asks
`confirm(this.confirmText)`. When the answer is Cancel it does nothing
more. The buttons are re-enabled only in `handleResponse()`, which runs
when the server answers the post. A cancelled confirm sends no post, so
nothing ever re-enables them.

The `confirmText` option and its `confirm()` were added in 5f3be929e6,
the change that moved the permissions reset to the Tools page. The
`disableFormControls()` call before it was already there (2012), and the
new branch was placed after it without a way back.

Reach:

- `confirmText` has one user: `templates/management/tools/permissions.tpl`
  (lib/pkp), the Tools › Permissions form, on all three apps (checked in
  the code: no other template or plugin in the OJS, OMP or OPS checkouts
  passes it). Every other `AjaxFormHandler` form has an empty
  `confirmText` and posts at once, so it is untouched.

## Proposed fix

Ask before greying the button, and return without greying it when the
answer is Cancel
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reset-permissions-button-greyed-after-cancel/fix.diff)):

```diff
--- a/lib/pkp/js/controllers/form/AjaxFormHandler.js
+++ b/lib/pkp/js/controllers/form/AjaxFormHandler.js
@@ -75,12 +75,15 @@
 		// and act depending on the returned JSON message.
 		var $form = this.getHtmlElement();
 
-		this.disableFormControls();
-
-		if (!this.confirmText.length || confirm(this.confirmText)) {
-			$.post($form.attr('action'), $form.serialize(),
-					this.callbackWrapper(this.handleResponse), 'json');
+		if (this.confirmText.length && !confirm(this.confirmText)) {
+			// Cancelled: nothing is sent, so leave the form usable.
+			this.hideSpinner();
+			return;
 		}
+
+		this.disableFormControls();
+		$.post($form.attr('action'), $form.serialize(),
+				this.callbackWrapper(this.handleResponse), 'json');
 	};
```

The fix belongs in the shared handler that owns the confirm. The guard
against a double submit is kept: `confirm()` is modal, so nothing can be
pressed while it is open, and `disableFormControls()` still runs before
`$.post`. `hideSpinner()` undoes the spinner that
`FormHandler.submitHandler_()` shows before it calls `submitForm()` (the
Tools form has none, but a form with `.formButtons` would).
`submitHandler_()` also unregisters the form's change tracking before
`submitForm()`, which Cancel does not undo: harmless on the Tools form,
which has no fields, but a later form with fields that passes
`confirmText` would lose its unsaved-changes warning after a Cancel.

Tried on the three apps: with the fix, Cancel leaves the button usable
and a second press asks again, still with no request sent; answering OK
still sends one reset, shows the success message and gives the button
back.

**Alternatives**:

- Keep the order and call `this.enableFormControls()` in an `else`
  branch: works the same, but greys and un-greys the button around the
  box for no reason.
- Bind the confirm in `permissions.tpl` instead: fixes the one form and
  leaves the option broken for the next one.

**What goes with it**:

- `js/pkp.min.js` is tracked in git in each of OJS, OMP and OPS, and an
  install with `enable_minified` on serves it, so the fix also commits
  the rebuilt bundle in the three apps.
- Nothing to repair; the change applies as it stands to 3.5, 3.4 and
  3.3, where the lines are identical.
- The guard is an e2e check: Cancel, then the button pressed again asks
  again.

Small: a few lines in one lib/pkp file and the rebuilt `js/pkp.min.js`
committed in the three apps, with no change to any API.

## Evidence

- Kept script that takes the Steps on the three apps, on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reset-permissions-button-greyed-after-cancel/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reset-permissions-button-greyed-after-cancel/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/reset-permissions-button-greyed-after-cancel/walk.js`.
  It answers the browser's box itself, records each box's text, every
  `POST …/management/tools/resetPermissions` and the button's `disabled`
  state and `ui-state-disabled` class two seconds after each press. It
  sends the second press to the disabled button as a real click, the
  way a person's click lands, rather than letting Playwright refuse it.
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/reset-permissions-button-greyed-after-cancel/fix.diff ojs omp ops`,
  then walk.js, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/reset-permissions-button-greyed-after-cancel/fix.diff ojs omp ops`.
  The OK run (press, OK) is the same script with `R1_MODE=nb` in front,
  run with the fix in and out; both times one
  `POST …/management/tools/resetPermissions` answered 200, the success
  message showed, and the button was enabled two seconds later. The
  installs run with `enable_minified` off, which loads the `lib/pkp/js`
  files one by one, so the trial needed no build.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets 566bb1f (`main` and `stable-3_5_0` dumps). Tips: OJS
  `main` ff004d0973 (pkp-lib 987776cd04), OMP `main` 3b0ecf794c and OPS
  `main` c8af945bb7 (pkp-lib 3dc90c81a6); OJS 3.5 c1cee76b95 (pkp-lib
  771474347e), OMP 3.5 9c5e24246c and OPS 3.5 38b61882d3 (pkp-lib
  cf3f984335). The same script ran on 3.5 with `PKP_E2E_LINE=stable-3_5_0`
  in front; it saw the same on the three apps.
- 3.4 and 3.3 read in the code: pkp-lib `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402 carry the same `submitForm()` (lines 78–83)
  and the same `confirmText` in `templates/management/tools/permissions.tpl`.
- Introduced: `git blame` on line 80; 5f3be929e6 was merged in
  `pkp/pkp-lib#3931` on 2019-01-09.
- Upstream searched 2026-10-03 in pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library ("reset permissions button disabled", "confirmText
  AjaxFormHandler", "resetPermissions"): no report of this fault.
