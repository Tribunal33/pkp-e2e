# Submission wizard opened in a narrow window can keep its full row of steps, running past the window's edge

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OPS (at 1024 to 1050 pixels)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no step rail)
- **Introduced** `pkp/ui-library#176` for `pkp/pkp-lib#7265` · [d02248ddb](https://github.com/pkp/ui-library/commit/d02248ddb40c4fb815c24b820a331d6f056f5284) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When the submission wizard is opened or reloaded in a window too narrow for
its row of five steps, the row should shrink to "1/5 steps" with a "Show
all steps" button. Often it does not: the full row stays and runs past the
right edge, and the page scrolls sideways. On a journal or press this
happens on every load at phone width; the row needs a window about 1070
pixels wide, and some loads at tablet and small-laptop widths keep it too.

The steps still work, reached by scrolling sideways. Reloading brings the
fault back. A preprint server escapes on `main` only because its first step
finishes loading a moment after the page, and that late change makes the
wizard check the width again.

## Impact

- **Lost**: no work or data; the author scrolls sideways to reach the later
  steps and the step's own text.
- **Who**: an author or editor who opens the wizard on a phone, or in a
  window narrower than about 1070 pixels where the load happens to stay
  uncollapsed (3.5 journals do so at 1024 pixels on every load).
- **Way round**: in a desktop browser, widening the window and narrowing it
  again collapses the row. On a phone there is none beyond scrolling
  sideways.

Low: the wizard stays usable, and at phone width the side navigation
already takes most of the window on the editorial pages, so this is not
what keeps phone users out. It would rise if the editorial pages were made
to work at phone width.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS or OMP `main`.

Steps:

1. In an ordinary desktop window, sign in as `ccorino` (OJS) or `aclark`
   (OMP).
2. Open `/index.php/publicknowledge/en/submission` ("Make a Submission").
   (At phone width this page's "Title" box is squeezed to nothing, so the
   submission is started in the wider window.)
3. Choose "English" under "Submission Language", type the title "u21ir35
   phone step rail", choose "Articles" under "Section" (OJS; OMP keeps
   "Monograph"), tick the two boxes and press "Begin Submission". The
   wizard opens on "Upload Files".
4. Narrow the window to 375 pixels wide (the browser's device toolbar at
   375 x 812 does it) and reload the page. [3.5: OJS, a window 1024
   pixels wide; the wizard opens on "Details".]
5. Look at the row of steps under the "Make a Submission: Upload Files"
   heading.
6. Reload once more.

**Expected**: the row collapses to "1/5 steps" with a "Show all steps"
button beside it, as it does after a resize (the control below) and on a
load in a 600-pixel window.

**Observed**: all five steps ("1 Upload Files", "2 Details", "3
Contributors", "4 For the Editors", "5 Review") stay in one row running past
the right edge, and the page scrolls sideways to 1056 pixels in the
375-pixel window. The same after the second reload. [3.5, OJS at 1024
pixels: the full row, 702 pixels of steps in 656 pixels of room.]

Control: with the wizard still open, widening the window to 1440 pixels and
narrowing it back to 375 without a reload collapses the row to "1/5 steps
Show all steps".

## Cause

`Steps.vue` in ui-library decides whether to collapse in
`maybeToggleCollapsedView()`, which compares the width of the row's wrapper
with the sum of the widths of its steps (`li>span`). `mounted()` calls it a
single time, straight away. After that only a size sensor on the whole
wizard calls it (`elementResizeEvent(this.$el, debounce(…, 100))`).

That first call measures an empty row. The steps are child `<step>`
components that register themselves through `registerStep()` while
`<steps>` mounts (Vue 2 read `$children` in `mounted()`, with the same
timing), so their `<li>` elements render only on the next update, after
`mounted()` has run. The sum is 0, and `collapsed` is set to false on every
load, whatever the width. `setStartedLine()` beside it already waits with
`$nextTick()` for this reason; the width check does not.

So a narrow load ends collapsed only if the wizard changes size again after
the sensor is ready. The sensor is an `<object>` whose `about:blank` loads
about 300 ms after the page starts loading, and a size change before that
is not reported.
Whether such a late change comes depends on the app, the version and the
width, not on the code of the check:

- OPS `main`: its "Upload Files" step shows "Loading" and fills in about
  100 ms after the sensor is ready, at every width, so it always collapses.
- OJS and OMP `main`: no late change at 540 pixels or narrower; at some
  wider widths a 24-pixel growth of the step comes on some loads and not
  others.
- 3.5, which opens on "Details": that step grows the wizard late at most
  widths, but at 1024 and 1050 pixels OJS gets no change on
  any load and OPS on most.

Reach: `Steps.vue` is the only user of `maybeToggleCollapsedView()` and
`elementResizeEvent` in ui-library. It also draws the steps of the
editorial decision pages (`decision/record.tpl`) and of the user invitation
and invitation acceptance pages, which mount it the same way and take the
same first check (checked in the code only).

## Proposed fix

Run the first width check after the steps have rendered, in the
`$nextTick()` that already sets the progress line
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/phone-load-step-rail-not-collapsed/fix.diff)):

```diff
 		/**
 		 * Toggle collapsed view when there is not enough width
-		 * for the steps to fit
+		 * for the steps to fit. The child steps register while this
+		 * component mounts, so their buttons render on the next tick:
+		 * measure then, not now.
 		 */
-		this.maybeToggleCollapsedView();
 		elementResizeEvent(this.$el, debounce(this.maybeToggleCollapsedView, 100));
 
 		/**
 		 * Set the progress line
 		 */
-		this.$nextTick(() => this.setStartedLine());
+		this.$nextTick(() => {
+			this.maybeToggleCollapsedView();
+			this.setStartedLine();
+		});
```

It follows what the component already does for the progress line and keeps
the sensor for later size changes. Tried on `main` on all three apps: loads
at 375 and 600 pixels show "1/5 steps" from the first render, and a load at
1280 pixels keeps the whole row, with no change after. Not tried on 3.5.

**Alternatives**:

- A `ResizeObserver` on `$el` in place of `element-resize-event`. Its first
  callback comes after the steps have rendered, so it fixes the first check
  too, and it has no load race for later changes. Re-running the check when
  the row collapses is harmless, because the `li>span` widths it sums do not
  change on collapse. It is a sound fix and retires a dependency; the
  `$nextTick()` change is preferred only as the smaller one, with the same
  result on a load.
- Hiding the overflow with CSS: the steps would be cut off instead of
  collapsed.

**What goes with it**:

- A component test that mounts `<steps>` in a narrow container and expects
  `.pkpSteps--collapsed` without a resize, and an e2e check that loads the
  wizard at 375 pixels (a **Planned** item in the spec).
- Backport: 3.5's `Steps.vue` has the same `mounted()`, and the two lines
  apply as they stand. 3.4's Vue 2 version needs the call moved into a
  `$nextTick()` after `this.steps = this.$children…`.

Small: two lines in one component, and a test.

## Evidence

- Kept scripts, run on a default-dataset install:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/phone-load-step-rail-not-collapsed/walk.js)
  takes the Steps, the control, a load at 600 and a load at 1280 (the
  neighbour the fix must leave whole);
  [diag.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/phone-load-step-rail-not-collapsed/diag.js)
  reloads the same wizard at widths from 375 to 1200 pixels and records the
  wizard's size changes and the sensor's load, timed (`WIDTHS=1024
  REPEAT=3` in front for the 3.5 bracket). Command:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/phone-load-step-rail-not-collapsed/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on PostgreSQL, PKP's default test dataset (pkp/datasets 27f1204,
  2026-10-01), freshly loaded before each walk, in headless Chromium.
  main: OJS 4408b94def, OMP 3b0ecf794c, OPS c8af945bb7; pkp-lib f5bd392a69
  (OJS), 3dc90c81a6 (OMP, OPS); ui-library 64d67363 (OJS), 280f98c5 (OMP,
  OPS), whose `Steps.vue` is identical. 3.5: OJS 18d097d94e, OMP
  b24879c3db, OPS 3f0919468c; pkp-lib 1fb843f491; ui-library 7a3c244b.
- Widths: the wrapper has the window's width less 368 pixels (7 pixels at
  375, the side navigation taking the rest), and the steps need 702 pixels
  (682 on OPS), hence about 1070 pixels (1050 on OPS).
- main, uncollapsed loads: OJS and OMP at every width from 375 to 540
  pixels (three loads each at 375) and at 700 and 900; OJS at 800 on one
  load of two. Both collapsed at 600 on every load. OPS collapsed at every
  width.
- 3.5: the Steps at 375 pixels collapse on all three apps. Uncollapsed:
  OJS at 1024 pixels on four loads of four and at 1050 on three of three;
  OPS at 1024 on three loads of four; OMP on none.
- 3.4 (code): ui-library `origin/stable-3_4_0` ee684b34 (the submodule of
  OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b on `upstream/stable-3_4_0`;
  pkp-lib df13621c2d), Vue 2: `mounted()` sets `this.steps =
  this.$children.filter(…)` and calls `maybeToggleCollapsedView()` in the
  same tick, before the row re-renders. Its wizard opens on "Details" like
  3.5's (`PKPSubmissionHandler::getSteps()`). Which loads a late change
  rescues cannot be read from the code, so the bullet names all three apps.
- 3.3 (code): ui-library `origin/stable-3_3_0` 96959f9e has no Steps
  component, and pkp-lib's 3.3 submission form has no step rail.
- Introduced: the first width check in `mounted()` is in the component's
  first version, d02248ddb. The Vue 3 migration (7f13651e) replaced
  `$children` with `registerStep()` and kept the timing; 7ea641e0
  (`pkp/pkp-lib#10473`) changed what is measured, not when.
- Upstream search 2026-10-01: pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  wizard steps on mobile or small screens, stepper, collapsed steps,
  `maybeToggleCollapsedView` and `elementResizeEvent`. Nearest:
  `pkp/pkp-lib#10473`, the row glitching while a window is resized; not
  this fault.
- Not driven: a real phone (the walks use a browser window; whether turning
  a phone sideways and back collapses the row, as a resize does, was not
  tried), the decision and invitation pages.
- Unverified: what the 24-pixel growth on OJS and OMP `main` is, and which
  part of 3.5's "Details" step grows late.
