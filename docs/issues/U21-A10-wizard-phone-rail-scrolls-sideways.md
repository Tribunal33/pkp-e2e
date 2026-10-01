# On a phone, the submission wizard opens with its full step rail running off the screen

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OPS (some loads: OPS 1 of 8 walked, OJS in a probe load)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no step rail)
- **Introduced** `pkp/ui-library#176` for `pkp/pkp-lib#7265` · [d02248ddb4](https://github.com/pkp/ui-library/commit/d02248ddb40c4fb815c24b820a331d6f056f5284) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found for the step rail (2026-10-01); `pkp/pkp-lib#12559` (open) is the general back-office reflow issue at 320 pixels and 400% zoom, and does not name the rail; `pkp/pkp-lib#10473` (closed, fixed in `pkp/ui-library#427`) covered glitches while resizing, not the first load
- **Tracked in** spec U21 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On narrow screens the submission wizard's step rail is meant to collapse
to "1/5 steps" with a "Show all steps" control. When an author opens the
wizard in a phone-sized window on a journal or press, the rail stays a
single row of all five steps. That row runs off the right edge and
widens the page to about 1,050 pixels in a 375-pixel window. A reload at
that width brings the full row back each time.

The fix proposed here makes the rail collapse on load. At 375 pixels the
page still scrolls sideways afterwards, to about 560 pixels, because the
back office's side menu keeps its full width on a phone. That is a
separate fault. PKP's own accessibility conformance report for OJS
(`docs/vpat.yaml`) says the back office does not yet reflow at 320
pixels ("submission pages and dashboard grids are rendered unusable"),
so phone-width use is not supported today.

## Impact

- **Lost**: nothing. Every step and form is reached by scrolling
  sideways.
- **Who**: an author submitting from a phone, every time the wizard is
  opened or reloaded there. The record-decision and
  user invitation screens use the same step rail; they were checked in
  the code only.
- **Way round**: turning the phone to landscape collapses the rail, and
  it stays collapsed when turned back, since every resize measures again
  (code read). It has to be done again after each reload or new opening
  of the wizard.

Low: the author loses some scrolling on a screen size the back office
does not yet support; it would rise once the side menu fits a phone and
this rail is the one thing left that widens the page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS or OMP).
- A desktop browser with its device toolbar, or a phone. The draft is
  begun at desktop width because at 375 pixels the "Make a Submission"
  page leaves the Title box no width to type in (the side menu, see
  Summary).

Steps:

1. In a window 1280 pixels wide, sign in as `ccorino` (OJS) or `aclark`
   (OMP).
2. Open "Start A New Submission", type the title "u21w38 phone rail",
   choose "Articles" (OJS) or "Library & Information Studies" (OMP) and
   "English", tick the checklist boxes and press "Begin Submission". The
   wizard opens on "Upload Files" with the five steps in one row.
3. Narrow the window to 375 pixels (the device toolbar). The rail
   collapses to "1/5 steps" with a "Show all steps" control.
4. Reload the page.
5. In a new window that is 375 pixels wide before any page loads (a
   phone, or a new window with the device toolbar switched on and the
   page then reloaded), sign in as the same author and open the draft
   from "My Submissions" ("Complete submission"). Switching the toolbar
   on after the wizard has loaded is a resize, which collapses the rail.

**Expected** (steps 4 and 5): the rail collapses as in step 3, to

```
1/5 steps
Show all steps
```

The page still scrolls sideways to about 560 pixels, as in step 3,
because of the side menu.

**Observed** (steps 4 and 5): the full rail, "1 Upload Files", "2
Details", "3 Contributors", "4 For the Editors", "5 Review" in one row
running off the right edge, and no "1/5 steps" control. The page is 1,056
pixels wide (558 pixels after step 3). Five reloads and three phone
openings each showed it, on OJS and OMP.

Control: OPS on `main` collapsed on every load of the same steps. On
3.5 the rail came up uncollapsed on one phone opening of eight loads on
OPS, and collapsed on all eight on OJS and OMP.

## Cause

`Steps.vue` in ui-library decides whether to collapse in
`maybeToggleCollapsedView()`. That method compares the rail row's width
(`$refs.buttons.offsetWidth`) with the summed widths of the step labels
(`li>span`). The component calls it once in `mounted()` and afterwards
only from a resize listener on its root element
(`elementResizeEvent(this.$el, debounce(...))`).

The call in `mounted()` measures nothing. The `<step>` children add
themselves to `this.steps` while the parent mounts (`registerStep()`,
called from `Step.vue`'s `created()`). The rail's `v-for` over
`this.steps` therefore renders on the next tick, after `mounted()`. In
the backend layout the whole app is also still hidden by `v-cloak`
(`[v-cloak] { display: none; }` in `layouts/backend.tpl`) until the
mount finishes. A probe of the call on load read 0 labels, a 0-pixel row
and a 0-pixel label sum on all three apps of both lines. `0 > 0` is false,
so the rail starts uncollapsed.

After that, only a later change in the size of the steps' root element
triggers a fresh measurement. The resize listener that the
`element-resize-event` package adds works only once its hidden
`<object>` has loaded, so it misses the first layout. Whether the rail
collapses therefore depends on whether the first step's content changes
height after that moment. On `main`'s "Upload Files" step in OJS and OMP
nothing does, so the rail never collapses. OPS's step and 3.5's
"Details" step (with its rich-text editors) usually change height later,
which collapses the rail. Making the steps' root 1 pixel taller on an
uncollapsed page collapsed it at once on every app, so the measurement
itself is right and only its timing is wrong.

The first version of the component measured the same way, straight
after assigning `this.steps` in `mounted()`. The Vue 3 migration kept
that timing (Evidence, "Introduced").

Reach:

- The submission wizard (`templates/submission/wizard.tpl`): walked,
  three apps.
- The record-decision screens (`templates/decision/record.tpl`, a
  decision with more than one step): the same component, checked in the
  code only.
- The user invitation and accept-invitation pages
  (`UserInvitationPage.vue`, `AcceptInvitationPage.vue`): the same
  component, checked in the code only.
- Not this fault: the side menu (`SideNav.vue`, a `flex-none` column
  336 pixels wide) leaves the page's content 39 pixels in a 375-pixel
  window, so "Make a Submission" and the wizard were 538 pixels wide
  before the rail's own width is counted.

## Proposed fix

A proposal; the team decides. Measure once the rail is rendered: move the first
`maybeToggleCollapsedView()` call into the `$nextTick()` that
`mounted()` already uses for `setStartedLine()`, which needs the
rendered rail for the same reason
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-phone-rail-scrolls-sideways/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Steps/Steps.vue
+++ b/lib/ui-library/src/components/Steps/Steps.vue
@@ -211,13 +211,17 @@
 		 * Toggle collapsed view when there is not enough width
 		 * for the steps to fit
 		 */
-		this.maybeToggleCollapsedView();
 		elementResizeEvent(this.$el, debounce(this.maybeToggleCollapsedView, 100));
 
 		/**
-		 * Set the progress line
+		 * The steps register themselves while this component mounts,
+		 * so their buttons are rendered on the next tick. Measure the
+		 * steps and set the progress line once they are there.
 		 */
-		this.$nextTick(() => this.setStartedLine());
+		this.$nextTick(() => {
+			this.maybeToggleCollapsedView();
+			this.setStartedLine();
+		});
 	},
 	methods: {
 		/**
```

By the next tick the queued render of the registered steps has run and
Vue has removed `v-cloak`, so the row and the labels have their laid-out
widths. The `current` watcher already defers its own layout work with
`$nextTick()` in the same way.

Tried on `main` (OJS, OMP, OPS): the rail came up collapsed, "1/5
steps", on every reload and phone opening of steps 4 and 5. As a
neighbour check, a reload at 1280 pixels kept the full, uncollapsed rail,
with and without the fix.

**Alternatives**:

- Replacing `element-resize-event` with a `ResizeObserver`, which
  reports an initial size once observing starts. That also fixes the
  first load and drops a dependency, but it is a larger change and
  nothing else in ui-library uses one yet.
- A watcher on `steps.length` that re-measures. It covers steps added
  after mount, which no screen does today, and it still needs the next
  tick for the rendered labels.
- CSS alone (letting the rail wrap or scroll inside its own box): this
  changes the design the collapse was built for, so it is a product
  decision.

**What goes with it**:

- Web fonts: the back office loads its fonts with `font-display: swap`
  (`lib/pkp/styles/font.less`), so the measure at the next tick may use
  the fallback font. When the web font arrives, the labels change width
  but the steps' root does not change size, so nothing re-measures. This
  matters only for a window within a few pixels of the width where the
  rail just fits; at phone width the labels (702 pixels) are far wider
  than the row. The trial covered only 375 and 1280 pixels. A
  `document.fonts.ready.then(() => this.maybeToggleCollapsedView())`
  call in the same `$nextTick()` would close that gap; nothing in the
  code base uses `document.fonts` yet (code read, not tried).
- Backport: the diff applies to 3.5's `Steps.vue`, which matches `main`
  here. 3.4's `mounted()` assigns `this.steps` from `$children` first;
  the same move into `$nextTick()` applies there.
- Guard: an e2e check here that opens the wizard at 375 pixels and
  expects "1/5 steps" (a **Planned** item for U21). A component test in
  ui-library cannot do it today: its `vitest` tests cover composables
  and stores only, with no DOM environment and no `@vue/test-utils`, and
  under jsdom every `offsetWidth` reads 0. It would need a real browser
  (vitest browser mode, or Storybook interaction tests with a runner),
  which ui-library does not set up.

Small: two lines moved in one component, and one e2e check that loads
the wizard at phone width.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-phone-rail-scrolls-sideways/walk.js)
  takes the Steps on OJS, OMP and OPS. It reloads five times in step 4
  and opens the draft in three new 375-pixel browsers in step 5, then
  takes the neighbour check (a reload at 1280 pixels). Each run starts
  from a freshly loaded dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-phone-rail-scrolls-sideways/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/wizard-phone-rail-scrolls-sideways/fix.diff ojs omp ops`
  (rebuilds the JavaScript), the script on `main`, then `revert`.
- Walked on `main` and `stable-3_5_0` (OJS, OMP, OPS) in headless
  Chromium, PostgreSQL, PKP's default test dataset at pkp/datasets
  38ab955 (2026-09-30). Tips: `main` OJS bade233f73, OMP 3b0ecf794, OPS
  c8af945bb7, lib/pkp 2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS),
  ui-library 280f98c5; `stable-3_5_0` OJS 92b9a16b48, OMP 3081c9b00, OPS
  cf4fce69bd, lib/pkp a9c76aed62, ui-library 1a7a4750. No request failed
  and no script error was logged on any walk.
- 3.5: besides the kept script's eight loads per app, one more probe
  load per app signed in at 1280 pixels, narrowed the window, and only
  then loaded the wizard address. It came up uncollapsed on OJS and OPS
  and collapsed on OMP. The 3.5 `Steps.vue` differs from `main`'s only
  in the scrolling call of the `current` watcher, so every 3.5 app is
  exposed to the same race; OMP was not seen uncollapsed there.
- That probe wrapped `querySelectorAll('li>span')` in the page to read
  each call of `maybeToggleCollapsedView()`. A second call, from the
  resize listener, came only where the rail ended up collapsed (OPS on
  `main`, OMP on 3.5).
- 3.4 (code): ui-library `origin/stable-3_4_0` ee684b34 `Steps.vue`
  `mounted()` assigns `this.steps` from `$children` and calls
  `maybeToggleCollapsedView()` straight away. lib/pkp
  `origin/stable-3_4_0` df13621c2d `templates/submission/wizard.tpl` uses
  `<steps>`, and `layouts/backend.tpl` hides `#app` with `v-cloak`. Not
  walked.
- 3.3 (code): ui-library `origin/stable-3_3_0` 96959f9e has no
  `Steps.vue`, and lib/pkp `origin/stable-3_3_0` d446601ebe has no
  `templates/submission/wizard.tpl` step rail (the 3.3 wizard is the
  older tabbed form).
- Introduced: `git blame` on the `this.maybeToggleCollapsedView();` line
  in `mounted()` gives c2aa1feb (`pkp/pkp-lib#9538`, a lint reorder).
  Before it the line is unchanged back to the Vue 3 migration 7f13651e
  (`pkp/pkp-lib#8919`) and to the component's first version d02248ddb4
  (PR `pkp/ui-library#176`, commit "pkp/pkp-lib#7265 Add DecisionPage
  and components for email composition and step-by-step workflows"),
  which measured right after assigning `this.steps` from `$children` in
  `mounted()`; 7f13651e replaced `$children` with `registerStep()` and
  kept the call.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ui-library and pkp/ojs
  for "stepper mobile", "submission wizard mobile", "stepper collapsed",
  "wizard steps small screen", "horizontal scroll wizard", "Steps
  collapsed", "steps mobile", "stepper responsive", and org-wide "wizard
  steps phone" and "Steps collapse load". Not searched: `maybeToggleCollapsedView` as a term. Closest:
  `pkp/pkp-lib#10473`, whose fix (`pkp/ui-library#427`) changed what is
  measured (`li>span`) and is in `main`; and `pkp/pkp-lib#12559`, cited
  by the reflow entry (WCAG 1.4.10) of `docs/vpat.yaml` on OJS `main`
  (c3404d5e76), which describes the back office as unusable at 320
  pixels without naming the rail.
- Not driven: the record-decision and invitation screens; real phones
  (the window was sized with Playwright's viewport); 3.4 and 3.3.
  MySQL is not checked; the fault does not touch the database.
