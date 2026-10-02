# On "Body Text", pressing a closed side section closes the open one and leaves the pressed one closed

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no "Body Text" page)
  - 3.4: none (code; no "Body Text" page)
  - 3.3: none (code; no "Body Text" page)
- **Introduced** `pkp/ui-library#874` for `pkp/pkp-lib#10419` · [29472114](https://github.com/pkp/ui-library/commit/294721140f349e051f3c16386041c9f3556c26e1) · 2026-04-14 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a17)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On an article version's "Body Text" page, pressing a closed side
section, such as "Document Outline", while another one is open closes
the open one and leaves the pressed one closed, so all three sections
are closed. A second press opens it. Selecting a word in the text with
the mouse while a section is open closes that section too, and
"Selected Element", the section that shows the details of what is
selected in the text, does not open.

It happens on every switch from an open section to another, starting
with the first of each visit, since the page opens with "References"
open. It has been so since the side sections were added.

## Impact

- **Lost**: nothing; one extra press each time the person editing
  switches section, and one extra selection to see the selected
  element's details.
- **Who**: whoever opens "Body Text" (Journal Manager, Journal Editor,
  Production Editor), on each switch between sections.
- **Way round**: press the heading a second time; after a selection has
  closed the open section, select again and "Selected Element" opens.

Low: an extra press or selection in a side panel.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`.

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production), from the dashboard's list ("View").
3. In the side menu, open "Publication" › "Unassigned version" ›
   "Body Text". On the right, "References" is open; "Selected Element"
   and "Document Outline" are closed.
4. Press "Document Outline".
5. Press "Document Outline" again.
6. Reload the browser page: "Body Text" opens again with "References"
   open.
7. Click into the editor, type `First sentence.`, then double-click the
   word "First".

**Expected:** step 4 opens "Document Outline" and closes "References".
Step 7 opens "Selected Element", showing the selected text's details,
and closes "References".

**Observed:** step 4 closes "References" and opens nothing: all three
sections are closed. Step 5 opens "Document Outline". In step 7 "First"
is selected, "References" closes and nothing opens.

Control: pressing "References" itself, the open section, closes it, and
pressing it again opens it.

## Cause

The panel's sections are native `<details>` elements, and
`src/pages/workflow/components/publication/WorkflowPublicationBodyText.vue`
in ui-library keeps one of them open through `openAccordionSection`:
each one is bound with `:open="openAccordionSection === section.key"`
and reports back through `@toggle="handleAccordionToggle(section.key, $event)"`.
The handler sets `openAccordionSection` to `null` whenever any section
reports itself closed:

```js
function handleAccordionToggle(sectionKey, event) {
	const details = event.target;
	if (details?.open) {
		openAccordionSection.value = sectionKey;
	} else {
		openAccordionSection.value = null;
	}
}
```

A `toggle` event is queued after `open` changes, whether a click or
Vue's `:open` binding changed it. Pressing "Document Outline" opens it, and its `toggle` sets
`openAccordionSection` to `outline`. Vue then sets "References"' `open`
to false, so "References" fires `toggle` as well. That event reaches the
`else` branch and sets `openAccordionSection` to `null`, and the next
render closes "Document Outline" again.

Reach:

- A mouse selection: `handleSelectionChange()` sets
  `openAccordionSection` to `selected-element`. The render that opens
  "Selected Element" also closes "References", whose `toggle` sets
  `null`, and the next render closes "Selected Element" before it is
  seen (step 7).
- The three sections of this panel are the only native `<details>`
  toggle handler in ui-library (searched `src` for `@toggle`; the other
  hits are components' own `toggle` events).
- The open pull request `pkp/ui-library#979` moves this component to
  `src/components/BodyTextEditor/BodyTextEditor.vue` and keeps the same
  handler (code, at its head 85384f34).

## Proposed fix

Set `openAccordionSection` to `null` only when the section that closes
is the open one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-side-section-needs-two-presses/fix.diff)):

```diff
 	if (details?.open) {
 		openAccordionSection.value = sectionKey;
-	} else {
+	} else if (openAccordionSection.value === sectionKey) {
+		// A section closed because another one was opened fires 'toggle'
+		// too, after the fact: only the open section closing clears it.
 		openAccordionSection.value = null;
 	}
```

A section the person closes is still the open one when its `toggle`
arrives, so closing by hand keeps working; a section closed by the
render after another opened is not, and is ignored.

Tried on OJS `main`: "Document Outline" then opened at the first press
and "References" closed; a second press closed it; the double-clicked
word opened "Selected Element" and closed "References". Pressing
"References" itself still closed it and a second press opened it again,
with the fix and without it.

**Alternatives:**

- Driving the sections from `@click` on each `<summary>` (with
  `preventDefault()`) instead of `toggle`: it avoids the echo too, but
  the browser's find-in-page opens a `<details>` without a click, and
  only `toggle` sees that.
- The `name` attribute on the three `<details>` (an exclusive
  accordion): the browser then closes the others itself, but Vue's
  `:open` binding and `handleSelectionChange()` would still race it, and
  older browsers ignore the attribute.

**What goes with it:**

- No stored data, no API and no PHP change.
- The same line in `BodyTextEditor.vue` if `pkp/ui-library#979` lands
  first.
- No backport.
- A guard: an end-to-end check that presses "Document Outline" with
  "References" open and expects only "Document Outline" open, and
  selects a word and expects only "Selected Element" open, in
  pkp-e2e's U48 suite. ui-library has no component tests
  (its seven `*.test.js` cover composables and stores, with no DOM
  environment); a Storybook `play` function on the existing
  `WorkflowPublicationBodyText.stories.js` would be the in-repo
  alternative, run by Chromatic.

Small: one condition in one component; the guard needs no new tooling.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-side-section-needs-two-presses/walk.js),
  takes the Steps on an install reset to the default dataset and reads
  each `<details>` element's `open` after every press:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/body-text-side-section-needs-two-presses/walk.js`;
  `WALK=neighbour` runs the control alone.
- Walked on OJS `main`, PostgreSQL, loaded from pkp/datasets e8dafbc
  (2026-10-02). No request failed and no script error was logged.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363); OJS `stable-3_5_0` 091fb65453 (lib/pkp cf3f984335,
  lib/ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b (lib/ui-library
  ee684b34); `stable-3_3_0` OJS ac77c9fb35 (lib/ui-library 96959f9e).
- 3.5, 3.4 and 3.3 (code): each branch's lib/ui-library.
- Introduced: `git blame` on the handler gives 29472114 (merged as
  `pkp/ui-library#874`), co-authored by Frederik Eichler (frederik). The
  same handler is in his earlier, still open `pkp/ui-library#810`; the
  version before 29472114 (1e9b0896) had a single sidebar and no
  sections.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  symptom ("Document Outline", "body text" sidebar, accordion) and the
  code (`WorkflowPublicationBodyText`, `handleAccordionToggle`, sciflow).
  The hits are the feature's own issues and pull requests
  (`pkp/pkp-lib#10419`, `pkp/pkp-lib#12897`, `pkp/ui-library#810`,
  `pkp/ui-library#979`); none mentions this.
