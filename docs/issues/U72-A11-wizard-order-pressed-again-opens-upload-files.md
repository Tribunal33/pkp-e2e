# Submission wizard: "Order" pressed again, or "Done" twice, while ordering chapters or galleys sends the author to the first step

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; the older tabbed wizard does not react to the press)
- **Introduced** no PR, for PKP bug 6434 · [7e1e5c5fa5](https://github.com/pkp/pkp-lib/commit/7e1e5c5fa5fbe7586c400eb5ea6147063244b95b) · 2012-04-02 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U72 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a11)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the submission wizard, an author orders a list with "Order". While
the list is being ordered, "Order" still stands above it, looking as
before. Pressed again, it sends the author back to the wizard's first
step instead of doing nothing. "Done" pressed twice in quick succession
(a double click) does the same after saving the order.

Nothing is lost: on its step again, the list is still being ordered
after "Order", or saved after "Done", and one press of "Continue" gets
the author back there.

Which list is hit depends on the wizard's step order. On `main` it is a
book's chapters, on "Details", and the author lands on "Upload Files".
On 3.5 and 3.4 it is a preprint's galleys, on "Upload Files", and the
author lands on "Details". A list on the wizard's first step is not
hit, and a journal's wizard has no such list.

## Impact

- **Lost**: nothing; the author has to find their way back to the step.
- **Who**: an author (or anyone submitting) who orders two or more
  chapters or galleys in the wizard and presses "Order" a second time,
  or double-clicks "Done".
- **Way round**: "Continue" on the first step, or the step's button in
  the row of steps above the form.

Low: the author is sent to another step and back with the order right;
it would be higher only if the jump lost a drag or a save, which none of
the reproductions showed.

## Steps to reproduce

OMP, `main`:

Preconditions: PKP's default test dataset, OMP `main` (press
`publicknowledge`).

1. Sign in as `aclark` (an author).
2. Open the press's "Make a Submission" page
   (`/index.php/publicknowledge/en/submission`).
3. Type "Ordering h19u" in "Title", leave "Monograph", tick the
   requirements and privacy boxes, press "Begin Submission". The wizard
   opens on "1 Upload Files".
4. Press "Continue". The wizard shows "2 Details"; the address ends
   `#details`.
5. Under "Chapters", press "Add Chapter", type "First h19u" in "Title",
   press "Save".
6. Press "Add Chapter", type "Second h19u", press "Save".
7. Press "Order". Each chapter shows a handle, and "Done" and "Cancel
   ordering" show under the list.
8. Press "Order" again.
9. In the row of steps above the form, press "2 Details".
10. Double-click "Done".

OPS, 3.5:

Preconditions: PKP's default test dataset, OPS `stable-3_5_0` (server
`publicknowledge`).

1. Sign in as `ccorino` (an author).
2. Open the server's "Make a Submission" page
   (`/index.php/publicknowledge/en/submission`).
3. Type "Ordering h19u" in "Title", tick the requirements and privacy
   boxes, press "Begin Submission". The wizard opens on "1 Details".
4. Press "Continue". The wizard shows "2 Upload Files"; the address ends
   `#files`.
5. Above the files list, press "Add File". In the window, type "PDF" as
   the galley label and press "Save". In the upload window that follows,
   choose "Preprint Text" under "Preprint Component", upload a PDF file,
   press "Continue", "Continue" again, then "Complete".
6. Repeat step 5 with the label "HTML".
7. Press "Order" above the list.
8. Press "Order" again.
9. In the row of steps above the form, press "2 Upload Files".
10. Double-click "Done".

**Expected**: at step 8 nothing happens: the wizard stays on the step,
the list still being ordered. At step 10 the order is saved once and the
wizard stays on the step.

**Observed**: at step 8 the wizard shows "1 Upload Files" and the address
ends `#files` (OPS: "1 Details", `#details`). At step 9 the list is
still being ordered, as it was left. At step 10 the order is saved once
(the save answered 200) and the wizard again shows the first step; back
on the list, it is no longer being ordered. No request failed and the
browser showed no script error.

Control: on the workflow's "Chapters" page (OMP submission 3, as
`dbarnes`) "Order" pressed while ordering does nothing; the list stays
in ordering.

## Cause

While a list is being ordered, the grid's ordering script leaves three
`<a href="#">` links on screen with no click handler, so a press follows
`#`; the submission wizard answers that empty address hash by opening
its first step.

lib/pkp `js/classes/features/OrderItemsFeature.js`,
`toggleOrderLink_()`, line 562, disables "Order" while ordering with
`this.$orderButton_.unbind('click')`: that removes every click handler on
the link, the feature's own and the `LinkActionHandler`'s, and binds
nothing in their place. A press then follows the link's `href="#"`.
`unbindOrderFinishControlsHandlers_()`, lines 617–618, does the same to
"Done" and "Cancel ordering" (both `<a href="#">` in
`templates/controllers/grid/feature/gridOrderFinishControls.tpl`);
`saveOrderHandler()` calls it as soon as "Done" is pressed, and the links
stay on screen until the save has answered and they have slid away, so a
second press on "Done" follows `#` too. The code base's own way to
disable a link action is `LinkActionHandler.disableLink()`, which binds
`noAction_()` (returning `false`) after taking its handler off; the
ordering feature leaves out that step. The two wizard grids use its
subclasses, `OrderCategoryGridItemsFeature` (OMP's
`ChapterGridHandler::initFeatures()`) and `OrderGridItemsFeature` (OPS's
`PreprintGalleyGridHandler::initFeatures()`); neither overrides these
methods.

Following `#` empties the address's hash. ui-library
`src/components/Container/SubmissionWizardPage.vue`, `openUrlHash()`
(line 477), runs on every hash change and opens `this.steps[0]` when the
hash names no step. So the press is seen only where the list sits on a
step other than the first. lib/pkp `PKPSubmissionHandler::getSteps()`
lists "Upload Files" first on `main` (since `pkp/pkp-lib#11606`,
2025-07-18), which puts OMP's chapters ("Details") second; on 3.5 and 3.4
"Details" comes first, which puts OPS's galleys ("Upload Files") second.
The 2012 code is on 3.3 too, but 3.3's wizard is a set of tabs whose
hash listener ignores an empty hash, so there the press does nothing.

Reach:

- The wizard's two orderable lists: OMP's chapters
  (`templates/submission/chapters.tpl`) and OPS's galleys
  (`templates/submission/galleys.tpl`). OPS on `main` and OMP on 3.5,
  each list on the first step, follow `#` too, but the wizard stays
  where it is; checked on screen. OJS's wizard loads no such grid;
  checked in the code.
- The other grids with "Order" (OJS's issue table of contents, back
  issues and galleys; sections, series, genres, review forms and their
  items; the site's contexts) carry the same links, on pages that do not
  react to an empty hash (`Page.vue`'s `openUrlHash()` emits `open-tab`
  with an empty id, which no tab answers): checked in the code.

## Proposed fix

Recommended: keep the three links from following `#` whenever the
ordering feature takes their handlers off, the way
`LinkActionHandler.disableLink()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-order-pressed-again-opens-upload-files/fix.diff),
paths from the app root; inside a pkp-lib clone apply it with `-p3`):

```diff
 		if (this.isOrdering) {
 			this.$orderButton_.unbind('click');
+			// The link's href is "#": keep a press from following it.
+			this.$orderButton_.click(this.noAction_);
 			this.$orderButton_.attr('disabled', 'disabled');
 		} else {
 			var clickHandler = this.gridHandler.callbackWrapper(
 					this.clickOrderHandler, this);
+			this.$orderButton_.unbind('click', this.noAction_);
 			this.$orderButton_.click(clickHandler);
…
-		$saveButton.click(saveButtonHandler);
-		$cancelLink.click(cancelLinkHandler);
+		$saveButton.unbind('click', this.noAction_).click(saveButtonHandler);
+		$cancelLink.unbind('click', this.noAction_).click(cancelLinkHandler);
…
-		this.getSaveOrderButton().unbind('click');
-		this.getCancelOrderButton().unbind('click');
+		this.getSaveOrderButton().unbind('click').click(this.noAction_);
+		this.getCancelOrderButton().unbind('click').click(this.noAction_);
+	};
+
+	$.pkp.classes.features.OrderItemsFeature.prototype.noAction_ =
+			function() {
+		return false;
 	};
```

The rule (a disabled control does nothing) belongs to the ordering
feature, which disables these links; fixing it there covers every grid
and every page, not only the wizard. Tried on OMP and OPS `main`: the
wizard stays on its step at steps 8 and 10, and "Order", "Done" and
"Cancel ordering" work as before on the "Chapters" page.

**Alternatives**:

- Make the wizard's `openUrlHash()` ignore an empty hash: stops the jump
  in the wizard only, and leaves the links following `#` (which also
  scrolls the page to its top) everywhere else.
- Leave the ordering controls' links without an `href`, or make them
  buttons: changes markup that the grid scripts and styles select on,
  for the same effect.

**What goes with it**:

- The app's committed `js/pkp.min.js` (served when `enable_minified` is
  On) picks the change up at its next rebuild (`lib/pkp/tools/buildjs.sh`).
- No stored data to repair. The file is the same on 3.5, 3.4 and 3.3,
  so the diff applies there as written.
- Guard: an end-to-end test of ordering in the wizard ("Order" pressed
  while ordering, then "Done" double-clicked, the open step read after
  each); no JavaScript unit tests cover the grids.

Small: a few lines in one shared JavaScript file, with no change to what
is saved.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-order-pressed-again-opens-upload-files/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-order-pressed-again-opens-upload-files/lib.js),
  run on an install freshly loaded from the dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js <omp|ops> shared/playwright/checks/issues/wizard-order-pressed-again-opens-upload-files/walk.js [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Without an argument it
  takes the Steps and reads, after each, the wizard's open step, the
  address's hash, the list's ordering controls and the save requests;
  the argument `neighbour` runs the control instead (OMP submission 3's
  "Chapters" page: "Order", "Order" again, "Cancel ordering", "Order",
  "Done", "Order", "Cancel ordering").
- Fix trial: `node bin/try-fix.js apply …/fix.diff omp` (then `ops`), on
  a freshly loaded install: OMP stayed on "2 Details" (hash `#details`)
  at steps 8 and 10 (one save, 200); OPS kept `#files` through both,
  where without the fix the hash was emptied; the control read the same
  with the fix in and out. The dataset installs serve the unminified
  scripts (`enable_minified = Off`), so no rebuild was needed.
- Reproduced on `main`: OMP 5777025bec (lib/pkp 042726ebf6, ui-library
  99abe25290) and OPS f048e747b4; on `stable-3_5_0`: OMP 2d575f2506
  (lib/pkp 092ec34b0f, ui-library 2576e00afd) and OPS e737a9e465; each
  on its dataset from pkp/datasets eaf024c5 (2026-10-18), PostgreSQL.
  OMP 3.5 opens the wizard on "1 Details": "Order" pressed again left it
  there, still ordering, with the hash emptied; "Done" double-clicked
  saved once (200) and left it there. OPS `main` opens on "1 Upload
  Files": the same presses emptied the hash and left the wizard there.
- 3.5 (code): `OrderItemsFeature.js` identical to `main`'s;
  `SubmissionWizardPage.vue` `openUrlHash()` the same (line 456);
  `PKPSubmissionHandler::getSteps()` lists the Details step first
  (line 391).
- 3.4 (code), OMP `upstream/stable-3_4_0` e30fa7e38c and OPS
  `upstream/stable-3_4_0` 0f1e21a117 (lib/pkp `origin/stable-3_4_0`
  a71d6bd2ca, ui-library `origin/stable-3_4_0` ee684b341b):
  `OrderItemsFeature.js` identical to `main`'s; `openUrlHash()` the same
  (line 328); Details became the first step with b758a3af8a
  ("pkp/pkp-lib#8562 Move details step first in submission wizard",
  2023-01-26), before 3.4's release; OPS's wizard draws the galley grid
  (`templates/submission/galleys.tpl`) with "Order"
  (`PreprintGalleyGridHandler::initFeatures()`), OMP's the chapter grid
  on the first step.
- 3.3 (code), OMP `upstream/stable-3_3_0` 8e72fc8836 and OPS
  `upstream/stable-3_3_0` c5532e2161 (lib/pkp `origin/stable-3_3_0`
  5e84acd11b): `OrderItemsFeature.js` identical; the wizard is jQuery UI
  tabs (OMP's chapter grid in `templates/submission/form/step3.tpl`),
  whose `TabHandler` hash listener opens only a tab named by the hash
  and ignores an empty one. Not reproduced there.
- OJS (code, `main` and 3.5): no template under `templates/submission/`
  of OJS or its lib/pkp loads a grid into the wizard.
- Introduced: blame on `toggleOrderLink_()` and
  `unbindOrderFinishControlsHandlers_()` in lib/pkp gives 6f5d88cb3c
  (2012-04-21, Bruno Beghelli, "*6932* Introduced multiple lists
  listbuilder"), which moved the code from
  `ToggleableOrderItemsFeature.js`; there the same `unbind('click')`
  lines come from 7e1e5c5fa5 ("*6434* Introduced grid and listbuilder
  sorting"), the commit that wrote grid ordering. The wizard's fallback
  to the first step came with ui-library 467034aa4 (Nate Wright,
  "pkp/pkp-lib#7191 Implement new submission wizard",
  `pkp/ui-library#241`); `git log -L` on `getSteps()` gives 5d67d105c2
  (Blesilda Biazon, `pkp/pkp-lib#11606`, no issue linked) as the change
  that put "Upload Files" first on `main`, which moved the symptom from
  OPS to OMP.
- Upstream: pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library searched by
  the symptom's words and by `toggleOrderLink` and `OrderItemsFeature`;
  `pkp/pkp-lib#12826` (open, "Remove grid code") plans to replace the
  legacy grids these lists are built on.
- Unverified: MySQL not checked (a browser-side fault); the minified
  bundle with the fix was not built; the other "Order" grids are read in
  the code, not reproduced; the OPS steps on 3.4 are read in the code.
