# Upload wizard: a reopened "2. Review Details" keeps the "Complete" button, which shows "File Added" again instead of closing

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** no PR, for Bugzilla 7049 · [b09bf1e0e0](https://github.com/pkp/pkp-lib/commit/b09bf1e0e0a2a59ab090a683e9ff3e64991421f1) · 2012-02-28 · Jason Nugent (jnugent)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a15)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the upload wizard, pressing "2. Review Details" on "3. Confirm" opens
step 2 again, and the button under it still reads "Complete" where it
should read "Continue". Pressing it does what "Continue" does: it saves
the details and shows "3. Confirm" with "File Added" again. The window
stays open until "Complete" is pressed there a second time.

The wrong label is the whole fault. The upload itself is not affected.

## Impact

- **Lost**: nothing. The file is added either way; the cost is one
  press more than the button promised.
- **Who**: anyone who uploads a file through the wizard and returns to
  "2. Review Details" from "3. Confirm", for instance to correct the
  file's name. An upload that goes straight through never meets it.
- **Way round**: press "Complete" again on "3. Confirm".

Low: a wrong label on a step that is reopened by choice, and the task
gets done. A correction typed on the reopened step and then lost would
raise it; that was not seen and not walked (Steps, Observed).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OMP (the press `publicknowledge`).
- One small file on your computer; the steps call it `u36m-file.pdf`.

Steps:

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (on a press,
   submission 3, "The Political Economy of Workplace Injury in Canada"):
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`.
3. Press "Upload" above "Submission Files". The window "Upload
   Submission File" opens on "1. Upload File".
4. Choose "Article Text" under "Article Component" (on a press, "Book
   Manuscript" under "Submission Component").
5. Press "Upload File" and pick `u36m-file.pdf`.
6. Press "Continue". "2. Review Details" opens; the button reads
   "Continue".
7. Press "Continue". "3. Confirm" opens with "File Added"; the button
   reads "Complete".
8. Press the step name "2. Review Details". Step 2 opens again.
9. Press the button under the step.
10. Press the button again.

**Expected**: at step 8 the button reads "Continue", as it did at step
6, because pressing it saves the details and goes on to "3. Confirm".
"Complete" is offered only on "3. Confirm", where it closes the window.

**Observed**: at step 8 the button reads "Complete". At step 9 the
details are saved and the window stays open on "3. Confirm" with "File
Added" and "Add Another File", the button reading "Complete". Step 10
closes the window, and "Submission Files" lists "u36m-file.pdf". The
walk changed nothing on the reopened step, so whether a name retyped
there is kept was not observed today.

On a preprint server (the default dataset, OPS `main`), where the wizard
uploads a galley's file: sign in as `dbarnes`, open preprint 1, "The
influence of lactation on the quantity and quality of cashmere
production", and its "Galleys" page; press "Add galley", type the label
"u36m PDF" and press "Save". The window "Upload a File Ready for
Publication" opens by itself. Choose "Preprint Text" and take steps 5 to
10: the same, without "Add Another File".

## Cause

The wizard's button label is set when the wizard advances and is never
set again when a step is opened by its name.

`FileUploadWizardHandler.prototype.wizardAdvance`
(`lib/pkp/js/controllers/wizard/fileUpload/FileUploadWizardHandler.js`,
lines 198 to 205) changes the button's text to the finish label when the
step it advances to is the last one. The same method leaves step 2
enabled after step 3 is reached ("This version allows a user to return
to all tabs but the very first one"), so the step name "2. Review
Details" can be pressed on "3. Confirm". Nothing on that path touches
the button. The "Continue" label comes back only through "Add Another
File": its click is bound to `FileUploadWizardHandler.prototype.startWizard`,
which calls `WizardHandler.prototype.startWizard`, and that resets the
label when the wizard is not on its first step.

What the button does is decided by the step, not the label.
`WizardHandler.prototype.advanceOrClose_` compares the current step with
the last one. On the reopened step 2 it triggers `wizardAdvance`, which
loads step 3 again; on step 3 it triggers `wizardClose`.

The return to step 2 was added in 2012 as an override of
`wizardAdvance` copied from the base class, with the base's label line
kept. The base class has the same gap. Its `wizardAdvance` disables the
step it leaves only under `enforceLinear_` (`WizardHandler.js`, lines
341 to 344; the option defaults to true), so a base wizard opened with
`enforceLinear: false` would show the same stale label. No caller
passes that option today (searched `lib/pkp` and the apps' templates
and plugins).

Reach:

- Every place the upload wizard opens: the workflow's file lists on a
  journal and a press (on screen: "Submission Files"), and a galley's
  upload (on screen on a preprint server, where it is the only place
  the wizard opens). The file lists of the later stages, a reviewer's
  attachment, a discussion's file, a dependent file and a journal's
  galley open the same wizard (checked in the code:
  `fileUploadWizard.tpl` is the handler's only user).
- `FileUploadWizardHandler` is the only wizard built on `WizardHandler`
  (searched `lib/pkp`, the apps' own `js`, templates and plugins, and
  `lib/ui-library`), so no other screen has a step to return to.

## Proposed fix

A proposal: the button reads "Continue" on every step but the last. Let
the base wizard set the label whenever a step becomes the current one,
by any path. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-wizard-reopened-step-complete-does-not-close/fix.diff):

```diff
--- a/lib/pkp/js/controllers/wizard/WizardHandler.js
+++ b/lib/pkp/js/controllers/wizard/WizardHandler.js
@@ -354,8 +354,29 @@
 		this.hideProgressIndicator_();
 		this.enableContinueButton();
 	};
+
+
+	/**
+	 * @inheritDoc
+	 */
+	$.pkp.controllers.wizard.WizardHandler.prototype.tabsActivate =
+			function(tabsElement, event, ui) {
 
+		var result = this.parent('tabsActivate', tabsElement, event, ui),
+				$continueButton = this.getContinueButton();
 
+		// The button's label follows the step shown, however it was reached
+		// (a wizard may let the user return to an earlier step).
+		if ($continueButton) {
+			$continueButton.text(/** @type {string} */ (
+					this.getCurrentStep() === this.getNumberOfSteps() - 1 ?
+					this.getFinishButtonText() : this.getContinueButtonText()));
+		}
+
+		return /** @type {boolean} */ (result);
+	};
+
+
 	//
 	// Protected methods
 	//
```

`WizardHandler` owns the button and both labels, and `TabHandler`
already calls `tabsActivate` after every step change, where it records
the current step. The override reads that step, so the label and
`advanceOrClose_` use the same test. It follows the way
`FileUploadWizardHandler` extends `tabsBeforeActivate` and `tabsLoad`,
and it also covers a base wizard opened with `enforceLinear: false`.

Tried on `main`, with the unminified scripts (the test installs run
with `enable_minified = Off`). The committed `js/pkp.min.js` was not
rebuilt, and the build's lint and Closure compile (`tools/buildjs.sh`)
were not run on the new method, so its type annotations are unchecked.

- OJS, OMP and OPS, the Steps: at step 8 the button reads "Continue";
  pressing it shows "3. Confirm" with the button reading "Complete",
  and that press closes the window.
- Three paths the fix must not change behaved the same with the fix
  applied and with it reverted:
  - The straight path (OJS, OMP, OPS): the button reads "Continue",
    "Continue", "Complete", and one "Complete" closes the window.
  - Step 2 reopened, then left by pressing the step name "3. Confirm"
    (OJS, OMP, OPS): the button reads "Complete" and one press closes.
  - "Add Another File" (OJS, OMP): the wizard restarts at "1. Upload
    File" with the button reading "Continue".

**Alternatives**

- Setting the label in `FileUploadWizardHandler.prototype.tabsBeforeActivate`:
  it fixes the one subclass and leaves the base class with a label that
  goes stale for the next wizard that allows a return. It also runs
  before `TabHandler` can refuse the step change (unsaved changes).
- Making "Complete" on the reopened step 2 save and close the window:
  it needs a second path through `formSubmitted` and skips the step
  that confirms the file.

**What goes with it**

- The label lines in `wizardAdvance` (both classes) and `startWizard`
  become redundant. Leave them: they do no harm, and in
  `FileUploadWizardHandler.prototype.wizardAdvance` the
  `enableContinueButton()` call (line 204) sits in the same `if` as the
  label lines and must stay whatever happens to them.
- `js/pkp.min.js` is committed in each app, so the rebuilt bundle is
  part of the change.
- Backport: `WizardHandler.js` and `TabHandler.js` are the same file on
  3.5, 3.4 and 3.3, so the diff is expected to apply as written (not
  tried there).
- Test: pkp's Cypress upload steps go straight through the wizard; a
  return to step 2 with a read of the button would have caught it.

Small: one method in one JavaScript handler plus the rebuilt bundle. It
would stop being small only if the team chose the second alternative.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-wizard-reopened-step-complete-does-not-close/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-wizard-reopened-step-complete-does-not-close/lib.js)
  and the
  [A14 walk's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-file-keeps-first-upload/lib.js))
  takes steps 1 to 10 on OJS and OMP and the preprint steps on OPS. At
  each step it records the current step, the button's label and the
  step's text, and the requests the wizard sends. `MODE=nb` takes the
  three unchanged paths listed under "Tried on `main`". Each run starts from an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/upload-wizard-reopened-step-complete-does-not-close/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Where the walk differs from the Steps: it opens the submission by its
  address, and it hands the file to the upload box's file input instead
  of pressing "Upload File".
- "The details are saved" at step 9 is read from the page's own
  traffic: a `save-metadata` POST answered 200, then
  `finish-file-submission`, the same pair step 7 sent.
- The fix was applied with `bin/try-fix.js`, which rebuilds only for a
  diff under `js/` or `lib/ui-library/`; this diff is under
  `lib/pkp/js/`, so no build ran.
- The walks ran in Chromium on PostgreSQL (nothing here depends on the
  database). Datasets: pkp/datasets c657990 (2026-10-01). `main` and
  3.5 gave the same result on all three apps; no walk recorded a failed
  request or a script error.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b; pkp-lib 32b0f4b4af.
  3.3: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161; pkp-lib
  f6ab331645.
- Code reads. 3.5, 3.4 and 3.3:
  `js/controllers/wizard/WizardHandler.js` is identical to `main`'s, and
  `FileUploadWizardHandler.js` differs from it only in comments and
  blank lines, so `wizardAdvance`, `startWizard` and `advanceOrClose_`
  are the same; on 3.4 and 3.3, which were not walked,
  `fileUploadWizard.tpl` passes the "Complete" label
  (`finishButtonText`) to the handler as on `main`. `TabHandler.js`,
  whose `tabsActivate` the fix extends, is identical on all three.
- Introduced: `git log -L` on `FileUploadWizardHandler.prototype.wizardAdvance`
  ends at b09bf1e0e0, "\*7049\* Allow returning to the metadata step
  when uploading files", which added the override whole; the commit has
  no pull request.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library): the upload wizard with "Complete", "Review Details"
  and "File Added", the button's label, `FileUploadWizardHandler` with
  `wizardAdvance`, and `getFinishButtonText`. No issue or PR about this
  fault.
- Not tried: the two alternatives.
