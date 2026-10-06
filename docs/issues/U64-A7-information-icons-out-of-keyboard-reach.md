# Information icons show their text on mouse hover only: Tab skips them on the Statistics pages and in settings forms

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the icon is a button)
  - 3.3: none (code; the icon is a button)
- **Introduced** `pkp/ui-library#414` for `pkp/pkp-lib#9626` · [a67fd26f](https://github.com/pkp/ui-library/commit/a67fd26f7fca5db4b5a0cc3ef3ddc330390ffb64) · 2024-11-20 · Blesilda Ramirez (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a7), spec U65 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The statistics pages explain their figures in information icons ("About
journal statistics", "About issue statistics", "About Geolocation", and
the icons in the "Trends" table of Editorial Activity). The text of an
icon shows only while the mouse pointer rests on it. Tab skips every
icon, so someone who works with the keyboard never reads the text.

A screen reader on these pages is offered the icon's name ("About
journal statistics") and not its text: the text is not in the page until
the pointer brings it up (by code, no screen reader tried).

The same icon follows the label of about twenty settings and metadata
fields, for example "Description" and "Custom Tags" under Settings ›
Distribution › Search Indexing, and Tab skips it there too. In those
forms the text is also attached to the field for screen readers.

## Impact

- **Lost.** The explanation behind the icon: what a figure counts, or
  what a field is for.
- **Who.** Editors and managers who do not use a mouse, on the
  Statistics pages and in Settings, and whoever edits a publication's
  metadata in the workflow. Sighted keyboard users lose the text on
  every screen; screen-reader users lose it on the Statistics pages (by
  code). Every install, every visit.
- **Way round.** None without a mouse.

Low: the icons hold explanations, and every task gets done without
them. It would be medium if one of these icons held text that a task
cannot be done without.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. Nothing is created.

Statistics (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Open Statistics › "Journal" (OMP: "Press", OPS: "Server"),
   `/index.php/publicknowledge/en/stats/context/context`.
3. Rest the mouse pointer on the information icon in the heading "Views"
   of the panel under the chart, then move the pointer away.
4. Click the page's heading, then press Tab repeatedly, through the
   whole page.
5. OJS only: do steps 3 and 4 on Statistics › "Issues", with the icon in
   the panel's heading "Views and Downloads".
6. Open Statistics › "Editorial Activity". Rest the pointer on the icon
   after "Other Submissions" in the "Trends" table. Then click the
   heading "Trends" and press Tab repeatedly.

A form field (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "Search Indexing".
3. Rest the mouse pointer on the icon after the label "Description",
   then move the pointer away.
4. Click the tab's name "Search Indexing", then press Tab repeatedly, up
   to "Save".

**Expected:** Tab stops on each icon, and the icon's text shows while it
holds the focus, as it shows under the pointer.

**Observed:** the pointer shows the text, for example on "Journal":

```
Number of visitors viewing the journal's index page.
```

Tab never stops on an icon, and no text shows:

- "Journal" ("Press", "Server"): Tab goes from "Daily" to "Download
  Report". The icon stands between them. ("Monthly", next to "Daily", is
  disabled at the default date range, so Tab skips it too; with a longer
  range it is a stop before "Download Report".)
- "Issues": the same, from "Daily" to "Download Report".
- "Editorial Activity": Tab goes from "Change date range" to "Filters"
  and then leaves the page's content (OPS has no "Filters"). It never
  enters the "Trends" table, which holds four icons in OJS and OMP
  ("Other Submissions", "Days to First Editorial Decision", "Acceptance
  Rate", "Rejection Rate") and one in OPS ("Other Submissions").
- "Search Indexing": Tab goes from the "sitemap" link to the
  "Description" box, the globe button, the "Custom Tags" box, its globe
  button, and "Save". Both icons are skipped.

On the same form, the globe button after each field takes Tab, and its
text ("1/2 languages completed") shows while it holds the focus.

## Cause

The icon is ui-library's `Tooltip` component
(`src/components/Tooltip/Tooltip.vue`). Its root element is a `<span>`
with no `tabindex` and no role, so the browser leaves it out of the tab
order:

```html
<span v-tooltip="{content: tooltipContent, theme: 'pkp-tooltip', html: true}"
      class="tooltipButton" @click.prevent>
```

The text is shown by floating-vue's `v-tooltip` directive, and pkp-lib's
`js/load.js` sets the `pkp-tooltip` theme to open on `['hover',
'focus']`. The span never gets the focus, so only the hover opens it.

The root was a `<button>` until a67fd26f ("Migrate icons to svg",
`pkp/ui-library#414`), which swapped the icon for the SVG "UsefulTips"
and, in the same edit, turned the `<button>` into a `<span>`. The class
name `tooltipButton`, its button styles and `@click.prevent` stayed. The
PR's commit list is about icons and their alignment and does not mention
the element.

Every use of the component is affected. "On screen" was walked; "code"
was read and not walked:

- Statistics › "Journal" / "Press" / "Server"
  (`lib/pkp/templates/stats/context.tpl`), the panel heading "Views": on
  screen.
- OJS Statistics › "Issues" (`templates/stats/issues.tpl`), the panel
  heading "Views and Downloads": on screen.
- Statistics › "Editorial Activity"
  (`lib/pkp/templates/stats/editorial.tpl`), each "Trends" row that has
  a description: on screen.
- "About Geolocation", in the "Download Report" window of Statistics ›
  "Articles" and its OMP and OPS twins
  (`PublicationsDownloadReportModal.vue`): code. It shows only when
  geographical statistics are on, which the default dataset has off.
- A form field given a `tooltip`, in the 18 field components that render
  the icon after the label: `FieldArchivingPn`, `FieldBaseAutosuggest`,
  `FieldColor`, `FieldDate`, `FieldHtml`, `FieldMetadataSetting`,
  `FieldMultiSelect`, `FieldOptions`, `FieldOrcid`, `FieldPubId`,
  `FieldRadioInput`, `FieldRichTextarea`, `FieldSelect`, `FieldSlider`,
  `FieldText`, `FieldTextarea`, `FieldUpload`, `FieldUploadImage`. The
  other field components (`FieldCheckbox`, `FieldAffiliations`,
  `FieldAuthors` among them) have no icon. The forms that set a
  `tooltip`:
  - Distribution › "Search Indexing": "Description" and "Custom Tags"
    (`PKPSearchIndexingForm`): on screen.
  - Website › Appearance › Setup: the thumbnail, "Homepage Image" and
    "Page Footer" (`PKPAppearanceSetupForm`, each app's
    `AppearanceSetupForm`): code.
  - Website › Setup › Announcements: the introduction
    (`PKPAnnouncementSettingsForm`): code.
  - Distribution › License: the license terms (`PKPLicenseForm`): code.
  - Emails › Setup: the bounce address (`PKPEmailSetupForm`): code.
  - A publication's metadata in the workflow and on the author's
    dashboard: keywords, subjects, disciplines, supporting agencies,
    coverage, rights, source, type, the funding statement, the publisher
    ID and the article number, each when the context turns it on
    (`PKPMetadataForm`): code. The submission wizard is not affected:
    its form (`ForTheEditors`) calls `changeTooltipsToDescriptions()`,
    so the text is a visible description there and there is no icon.
  - The ORCID field of the contributor form and of the reviewer
    suggestion form (`ContributorForm`, `ReviewerSuggestionsForm`):
    code.

What a screen reader is given, by code:

- On the Statistics pages the icon holds its label ("About journal
  statistics") in a visually hidden span, which a screen reader reads.
  The tooltip's text is passed only to the directive and is not in the
  page until the tooltip opens.
- In the forms the field components mark the icon `aria-hidden="true"`
  with an empty label, and put the text in a visually hidden span that
  the input's `aria-describedby` names (`FieldBase.vue`,
  `describedByTooltipId`). A screen reader reads the text with the
  field.

Not affected: the globe button of multilingual fields
(`MultilingualProgress.vue`), which uses the same directive and theme on
a `<button type="button">`.

## Proposed fix

Make the root of `Tooltip.vue` a button again, with `type="button"`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/information-icons-out-of-keyboard-reach/fix.diff)):

```diff
-	<span
+	<button
 		v-tooltip="{
 			content: tooltipContent,
 			theme: 'pkp-tooltip',
 			html: true,
 		}"
+		type="button"
 		class="tooltipButton"
 		@click.prevent
 	>
 …
-	</span>
+	</button>
```

It follows the sibling `MultilingualProgress.vue`, and brings back what
the component was before a67fd26f. The SVG icon and the `iconSize` and
`isPrimary` props, which that change was for, stay.

`type="button"` is new compared with the old button. It keeps the icon
from ever acting as a form's submit button. This may bear on
`pkp/pkp-lib#8801` (open, reported on OMP 3.4): Enter in a metadata
field with suggestions showed another field's help text. That issue
names no cause; that the typeless button answered the form's implicit
submit is this report's inference. On `main`, `Form.vue` also opens with
a hidden `<input type="submit">`, which takes that role before any
button further down.

Tried on `main`, all three apps:

- Tab stops on every icon on the pages above, in reading order, and the
  icon's text shows while it holds the focus. The pointer shows it as
  before.
- On a form's icon, Enter, Space and a mouse click send no request and
  open no window. Each of them hides the text; without the fix a mouse
  click hides it too.
- Enter typed in the "Description" box (a plain text field) shows no
  tooltip and sends nothing, with the fix in and out. A field with
  suggestions, the kind `pkp/pkp-lib#8801` is about, was not tried.
- The look: the screenshot of Statistics › "Journal" is identical byte
  for byte with the fix in and out, and the icons after the form labels
  and in the "Trends" rows sit in the same place by eye. The focus ring
  on the icon was not looked at; `.tooltipButton` has no `:focus` rule
  of its own.

**Alternatives:**

- Keep the `<span>` and add `tabindex="0"`. Tab reaches it, but the
  element still has no role for a screen reader.
- Show the text as a visible description under the heading or label and
  drop the icon, as the submission wizard does for its metadata fields.
  That is a design change on every screen above.

**What goes with it:**

- In the forms the icon becomes a button that takes the focus while it
  is `aria-hidden`: a screen-reader user tabs onto a control that is not
  announced. 3.4 has the same state, and the globe button has it today,
  but it is a fault of its own and this report flags it, not recommends
  it. The follow-up is to give the icon a label and drop `aria-hidden`
  in the 18 field components named in the Cause. It is left out of the
  diff so the diff stays one element.
- On the Statistics pages the icon's label ("About journal statistics")
  becomes the button's name.
- No API, stored data or plugin hook is touched. Each form gains one tab
  stop per icon.
- `Tooltip.vue` is the same file on 3.5, so the diff applies there as
  written.
- Guard: an e2e test that, on Statistics › "Journal", Tab reaches the
  button "About journal statistics" before "Download Report" and the
  tooltip's text shows while it holds the focus; or a component test in
  ui-library that the root is a button.

Small: one element in one component, and a test.

## Evidence

- Kept script, run on an install loaded from PKP's default test
  dataset, in Chromium:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/information-icons-out-of-keyboard-reach/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/information-icons-out-of-keyboard-reach/lib.js).
  Run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/information-icons-out-of-keyboard-reach/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `WALK_PAGES=editorial`
  picks pages). On each page it records every icon's element, the text
  under the pointer, whether the icon takes the focus, and each Tab stop
  with the tooltip text showing at that stop.
- The fix, tried 2026-10-02 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/information-icons-out-of-keyboard-reach/fix.diff ojs omp ops`,
  then walk.js, then `walk.js neighbour` (the icon focused, Enter,
  Space, a click; the globe button) and `walk.js enter` (Enter in the
  "Description" box), each of the last two also without the fix, then
  `revert`. The look was compared on the walk's full-page screenshots of
  OJS, taken with the fix in and out.
- Introduced: `git log --follow` on `Tooltip.vue`. The root is a
  `<button>` in every earlier version of the file (7496b3c2, 2018, to
  9ed5c60f, 2024-07) and a `<span>` from a67fd26f on; GitHub's
  `commits/<sha>/pulls` names `pkp/ui-library#414`. The PR has no review
  comment on `Tooltip.vue`.
- Upstream search: pkp/pkp-lib, pkp/ui-library and pkp/ojs, issues and
  PRs, for "tooltip" with "keyboard", "focus", "accessible", "hover
  only", "not focusable", "A11Y", and for `tooltipButton` and
  `Tooltip.vue`. Read and not the same fault: `pkp/pkp-lib#13329` (the
  reader-side article "Metrics" chart), `pkp/pkp-lib#9354` (the globe
  icon's colours), `pkp/pkp-lib#8801` (named in the Proposed fix),
  `pkp/pkp-lib#7006` (closed).
- Code reads:
  - 3.5, at the ui-library tip below: `Tooltip.vue` has the same `<span>`
    root, and a67fd26f is an ancestor of the tip.
  - 3.4 and 3.3, with `git show origin/stable-3_4_0:` and
    `origin/stable-3_3_0:` in `lib/ui-library` and `lib/pkp`:
    `Tooltip.vue` is `<button v-tooltip="tooltip" class="tooltipButton"
    @click.prevent>`; `js/load.js` has `Vue.use(VTooltip,
    {defaultTrigger: 'click'})`, so the button takes Tab and opens on
    Enter or a click; `templates/stats/context.tpl` and `editorial.tpl`
    use `<tooltip>`. a67fd26f is not on `stable-3_4_0`.
- Tips:
  - `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
    64d67363); OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
    lib/ui-library 280f98c5).
  - 3.5: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
    cf3f984335, lib/ui-library d4e01883).
  - 3.4: OJS c1827e3527, OMP 0aec65441f, OPS acd8ae704b (lib/pkp
    9e41f10273, lib/ui-library ee684b34).
  - 3.3: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161 (lib/pkp
    ac3fa73402, lib/ui-library 96959f9e).
- Not driven: the screens marked "code" under the Cause; they render the
  same component. 3.4 and 3.3 were not walked.
- Unverified:
  - No screen reader was tried. What one is given on the icons, with and
    without the fix, is read from the markup.
  - Enter in a field with suggestions (keywords in the workflow's
    metadata form) with the fix in, the case `pkp/pkp-lib#8801`
    describes, was not run.
  - The focus ring on the icon with the fix, and the look in OMP and
    OPS, were not compared.
  - Touch screens, which have no pointer to rest, were not tried. No
    WCAG audit was made; 2.1.1 (Keyboard) is the criterion the fault
    bears on.
  - No browser other than Chromium was tried.
