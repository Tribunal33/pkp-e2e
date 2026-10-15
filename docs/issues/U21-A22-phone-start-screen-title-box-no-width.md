# On a phone, "Make a Submission" squeezes the "Title" box to nothing, so no submission can be started

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code; the start form is not a Vue form)
- **Introduced** `pkp/ui-library#680` for `pkp/pkp-lib#11291` · [86d3eb89b](https://github.com/pkp/ui-library/commit/86d3eb89beec93fb2cd1c5b21fab399277051cc3) · 2025-08-14 · Blesilda Biazon (blesildaramirez)
- **Upstream** `pkp/pkp-lib#7497` (open), covering the side menu's width on tablets and phones, not the form losing its width on `main`
- **Tracked in** spec U21 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a22)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author who opens "Make a Submission" on a phone finds the "Title" box
squeezed to no width: it cannot be tapped and nothing can be typed in it.
Pressing "Begin Submission" then only shows "Please correct one error."
with "This field is required." under Title, so no submission can be
started at that width. The other forms of the back office squeeze their
boxes the same way, the wizard's "Details" step and the journal settings
among them.

A window 600 pixels wide or more (a tablet, a computer, most phones
turned sideways) gives the boxes their width back. In 3.5 the page
scrolled sideways to them instead.

It affects users who hold a role in the journal, press or server, since
only they get the side menu that takes most of a phone's width. A
signed-in user with no role on a journal or press gets no side menu and
a usable start screen; a preprint server makes such a user an Author as
the screen opens, so they get the side menu and the empty box too.

## Impact

- **Lost**: no data, but no submission can be started or filled in from
  a phone held upright, and the other forms' rich-text boxes cannot be
  filled in either. Nothing on screen says why.
- **Who**: anyone with a role in the context who works on a phone held
  upright. No release has it: it is on `main` only, and ships with the
  next release unless fixed.
- **Way round**: turn the phone sideways, or use a wider screen.

Medium: submitting fails at phone width, and the other forms with it,
but a wider window gets round it, and the back office has no phone layout
yet (`pkp/pkp-lib#7497`). It would rise if phone use of the back office
were supported.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS, OMP or OPS `main`.

Steps:

1. Open the site in a browser window 375 pixels wide (the browser's
   device toolbar at 375 x 812 does it).
2. Sign in as `ccorino` (OJS, OPS) or `aclark` (OMP) on
   `/index.php/publicknowledge/en/login`.
3. Open `/index.php/publicknowledge/en/submission` ("Make a Submission").
4. Tap the "Title" box and type a title.
5. Choose "English" under "Submission Language" and "Articles" under
   "Section" (OJS). Tick the one box under "Submission Checklist" and the
   one box under the privacy statement.
6. Press "Begin Submission".

**Expected**: the "Title" box keeps a usable width (at worst the page
scrolls sideways to it, as in 3.5), the title is typed in, and "Begin
Submission" opens the wizard.

**Observed**: the side menu takes 336 of the 375 pixels and the "Title"
box is 0 pixels wide. The tap at step 4 lands on nothing and no text is
typed. At step 6 no request is sent; the page stays on "Make a
Submission", shows the error list, and greys out "Begin Submission":

```
Please correct one error.
Go to Title: This field is required.
Jump to next error
```

[3.5: the box is 153 pixels wide and runs past the right edge; the page
scrolls sideways, the title is typed, and "Begin Submission" opens the
wizard.]

Control: the same screen in a window 600 pixels wide gives the box 180
pixels, and the title is typed in.

## Cause

Every Vue form in the back office lays out its fields in groups drawn by
`FormGroup.vue` in ui-library. Up to 3.5 the group was a `<fieldset>`.
Browsers give a fieldset `min-inline-size: min-content` by default, so a
group never got narrower than its fields could shrink to. In a narrower
column it kept that width and the page scrolled sideways.

`pkp/ui-library#680` changed the group's root into a
`<div role="group" aria-labelledby=…>`. It also changed the `<legend>` in
`FormGroupHeader.vue` into the `<div id="…_label">` that labels the
group. The same PR added read-only ("display only") forms, whose groups
hold no inputs. A `<div>` has no minimum width, and the `.pkpFormGroup`
rule did not add one, so the group now shrinks with its column and its
fields shrink with it.

At phone width that column is almost nothing. The side menu
(`SideNav.vue`, `flex-none`) keeps its full 336 pixels. The main area
(`.app__main` in `Container/Page.vue`: `min-width: 1px`, 1rem of padding
on each side) is 39 pixels wide, which leaves 7 pixels for its content.
"Make a Submission" puts its form in a `<panel-section>`
(`submission/start.tpl`), and `PanelSection.vue` sets
`.panelSection .pkpFormGroup { padding: 0; }`. With no padding and no
minimum, the group and every field in it are 0 pixels wide.

Reach:

- Other forms at 375 pixels, checked on screen on OJS: on the wizard's
  "Details" step the "Title", "Keywords" and "Abstract" boxes are all 0
  pixels wide and cannot be typed in. In Settings › Journal › "Masthead"
  the "Editorial History", "Journal Summary" and "About the Journal"
  editors are 0 pixels wide, and the plain text boxes keep their own
  widths but run off the squeezed column ("Journal Title" did not take a
  tap). The same holds for every form `FormGroup.vue` draws (checked in
  the code only).
- Read-only forms (`ReviewDetailsModal`, `DiscussionManagerFormDisplayModal`,
  `DataCitationViewModal`, `ReviewerSubmissionDetailsModal`) never had a
  fieldset's minimum. The discussion window wraps a long address to its
  width (checked on screen at 1280 pixels).
- Users with no role in the context get no side menu (`backend.tpl`'s
  `menu` block). On OPS, `SubmissionHandler::getSubmitUserGroups()` makes
  such a user an Author while the start screen loads, before the layout
  draws, so they get the side menu (checked in the code).
- The components that still use `<fieldset>` (`FieldOptions`,
  `FieldBase` and others) keep the browser's minimum.
- The wizard's row of steps at the same width has a different fault,
  reported apart:
  [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A10-phone-wizard-step-rail-not-collapsed.md).

## Proposed fix

Give editable form groups the minimum the `<fieldset>` had, in
`FormGroup.vue`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/phone-start-title-box-no-width/fix.diff)):

```diff
 	<div
 		class="pkpFormGroup -pkpClearfix"
-		:class="spacingStyle"
+		:class="[spacingStyle, {'pkpFormGroup--editable': !displayOnly}]"
…
+// Never narrower than its fields: the page scrolls sideways instead of
+// squeezing them to nothing, as it did when the group was a <fieldset>.
+// Read-only groups wrap long values instead.
+.pkpFormGroup--editable {
+	min-width: min-content;
+}
```

It keeps what `pkp/ui-library#680` was for (the labelled `div`, and
read-only groups that wrap their values) and restores 3.5's layout in
every editable form, since they all go through this component. Tried on
`main`: at 375 pixels on all three apps the Title box is 153 pixels wide
past the right edge, as on 3.5, the title is typed and "Begin
Submission" opens the wizard; on OJS the "Details" step and the
"Masthead" settings take typing in their text boxes and editors. At 768
and 1280 pixels "Make a Submission" lays out exactly as without the fix,
and a read-only discussion window holding a long unbroken address keeps
its width at 1280.

**Alternatives**:

- The same minimum on every group: tried first. A read-only group then
  grows to its longest unbroken value: a discussion window at 1280 pixels
  whose message holds a 184-character address ran 514 pixels past the
  window's right edge.
- Going back to `<fieldset>`: wrong for read-only groups, which hold no
  inputs, and it would undo the PR's labelling.
- A collapsible side menu at small widths (`pkp/pkp-lib#7497`): the real
  answer for phones, but a design task of its own. Until it lands, the
  forms should at least stay reachable by scrolling, as they were.
- A minimum on the Title box alone: it would leave every other form
  squeezed.

**What goes with it**:

- An e2e check that types into "Make a Submission" and the "Details" step
  at 375 pixels.
- Backport: none; 3.5 and older still use the `<fieldset>`.

Small: two lines in one component, and a check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/phone-start-title-box-no-width/walk.js)
  takes the Steps at 375 x 812 (typing "hkk14 phone title") and the
  600-pixel control, and records the widths of the side menu, the main
  area and the Title box with the CSS width chain from the editor up to
  `<body>`. `MODE=nb` reads the same screen at 768 and 1280; `MODE=forms`
  reads and types into the "Masthead" settings (as `rvaca`) and the
  "Details" step (as `ccorino`, the window narrowed with the step open,
  since the wizard reopens on its first step after a reload) at 375;
  `MODE=display` has `dbarnes` add a discussion on submission 2 whose
  message holds a long address, and reads its read-only window at 1280.
  Command:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/phone-start-title-box-no-width/walk.js`
  (`MODE=…` in front for the others; `PKP_E2E_LINE=stable-3_5_0` for 3.5).
- Walked on PostgreSQL, PKP's default test dataset (pkp/datasets 7912e09,
  2026-10-14), freshly loaded before each walk, in headless Chromium.
  main: OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f; pkp-lib
  b17fadae59; ui-library 47b565cb. 3.5: OJS ca763c91cd, OMP a70bbb9c4,
  OPS 44aec6e131; pkp-lib 4045d9241e; ui-library 2576e00a.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/phone-start-title-box-no-width/fix.diff ojs omp ops`
  (rebuilds the JavaScript), a fresh dataset, the walk and `MODE=nb` on
  the three apps, `MODE=display` and `MODE=forms` on OJS, then `revert`.
  Without the fix: Title 348 pixels at 768 and 476 at 1280 (the same with
  it), the read-only window's groups 1037 pixels in a 1101-pixel window,
  nothing past its edge (the same with it); "Details" and "Masthead" at
  375 as in the Cause. The all-groups version (`min-width: min-content`
  on `.pkpFormGroup`) left the read-only window's third group 1583 pixels
  wide.
- Width chain at 375 pixels: on `main` `div.pkpFormGroup` computes
  `min-width: 0px` and is 0 pixels wide with a scroll width of 171; on
  3.5 `fieldset.pkpFormGroup` computes `min-width: min-content` and is
  171 pixels wide, its form 0 and the page 540 pixels wide. The side menu
  is 336 and `#app-main` 39 on both. No server error, script error or
  dialog in any walk.
- 3.4 (code): ui-library `origin/stable-3_4_0` ee684b34 (OJS daf0ca971d,
  OMP 0aec65441, OPS acd8ae704b on `upstream/stable-3_4_0`; pkp-lib
  55c8e406b3): `FormGroup.vue` is a `<fieldset>`, and the start form's
  Title is the same `FieldRichText` as on 3.5.
- 3.3 (code): ui-library `origin/stable-3_3_0` 96959f9e (OJS d7d9dd14ec,
  OMP 8e72fc883, OPS c5532e2161; pkp-lib 5e84acd11b): `FormGroup.vue` is
  a `<fieldset>`, and a submission starts in the legacy
  `submission/form/step1.tpl`, not a Vue form.
- Introduced: `git blame` on `FormGroup.vue`'s root element names
  86d3eb89b, whose commit list includes "Use aria labelling for form
  group" and "Update FormDisplay to display group section". The same
  commit turned `FormGroupHeader.vue`'s `<legend>` (added in bc9a03b9,
  2025-07-30) into a `<div>`. The `.pkpFormGroup` rule is unchanged since
  2022. 86d3eb89b is not on ui-library's `stable-3_5_0`.
- Upstream search 2026-10-15: pkp/pkp-lib, pkp/ojs and pkp/ui-library
  for the submission form, sidebar and backend on mobile or phones,
  small screens, `fieldset`, `FormGroup` and `min-width`. `pkp/pkp-lib#7497`
  (open) asks for a collapsible side menu on tablets and phones;
  `pkp/pkp-lib#5918` (open) and `pkp/pkp-lib#13403` (closed, not planned)
  are about the back office at phone width in general. None is about the
  form losing its width.
- Not driven: a real phone (turned sideways included; the way round rests
  on the 600-pixel control and the 768-pixel neighbour), widths between
  375 and 600, forms other than the two above, the other read-only
  windows, a user with no role in the context (read in `backend.tpl` and
  OPS's `SubmissionHandler` only).
