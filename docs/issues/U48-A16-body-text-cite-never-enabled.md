# "Body Text": the "Cite" button beside each reference is never enabled

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no "Body Text" page)
  - 3.4: none (code; no "Body Text" page)
  - 3.3: none (code; no "Body Text" page)
- **Introduced** `pkp/ui-library#874` for `pkp/pkp-lib#10419` · [29472114](https://github.com/pkp/ui-library/commit/294721140f349e051f3c16386041c9f3556c26e1) · 2026-04-14 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a16)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On an article version's "Body Text" page, "Cite" beside each reference
in the "References" section stays greyed, even with the cursor in the
text, and pressing it does nothing. "Cite" should place an in-text
citation to that reference at the cursor. It has never worked since the
button was added.

A citation can still be placed by dragging the reference from the list
into the text, which needs a mouse: someone working from the keyboard
has no way to cite a reference. Every reference listed on any version
carries the broken button.

## Impact

- **Lost**: no data.
- **Who**: whoever opens "Body Text" (Journal Manager, Journal Editor,
  Production Editor), each time they cite a reference.
- **Way round**: drag the reference into the text with the mouse.

Medium: it would be high for someone who cannot drag.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`. Its articles
hold no references, so step 3 adds two.

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production), from the dashboard's list ("View").
3. In the side menu, open "Publication" › "Unassigned version" ›
   "References". Type these two lines into the "References" box and
   press "Add":
   ```
   Alpha, A. (2020). First reference.
   Beta, B. (2021). Second reference.
   ```
4. In the side menu, open "Body Text". On the right, "References" is
   open, reading "Drag references into the editor to place an in-text
   citation.", then both references, each with "Cite".
5. Click into the editor and type `First sentence.`
6. Press "Cite" beside "Alpha, A. (2020). First reference.".

**Expected:** with the cursor in the text, "Cite" is enabled, and
pressing it places an in-text citation to "Alpha, A. …" at the cursor,
as dragging the reference there does; "Unsaved Changes" shows.

**Observed:** both "Cite" buttons are greyed (`disabled`) when the page
opens and stay so even with the cursor in the text. Pressing "Cite"
does nothing: the editor still reads `First sentence.` and holds no
citation. From the keyboard, Tab from the text passes over both "Cite"
buttons, since a disabled button takes no focus.

Control: dragging "Beta, B. (2021). Second reference." into the
paragraph places a citation, and the text reads `First sentence.[2]`.
The number is the reference's id in the database, so on a freshly
loaded dataset, where these are the first references added, "Alpha"
is `[1]` and "Beta" `[2]`.

## Cause

"Cite" belongs to `<sciflow-reference-list>`, a web component of the
editor package `@sciflow/editor-start` (0.0.3 in ui-library's
package.json). Its `render()` draws each button with
`?disabled=${!this.cursorActive}`, and `cursorActive` starts `false`. A
press dispatches a `sciflow-insert-citation` event carrying the
reference and inserts nothing itself. The package's README says the list
"does not auto-bind to the editor"; the page that hosts it has to set
`cursorActive` and handle the event.

`src/pages/workflow/components/publication/WorkflowPublicationBodyText.vue`
in ui-library does neither. It renders the list with only an `id` and
`:references`:

```html
<sciflow-reference-list
	id="sciflow-references"
	:references="editorReferences"
></sciflow-reference-list>
```

and its handlers for the editor's events (`handleSelectionChange()`,
`handleEditorChange()`) only highlight cited references
(`syncReferenceListHighlight()`). So the button stays disabled, and an
enabled one would still do nothing, since nothing in ui-library or the
package listens for `sciflow-insert-citation`.

The editor can insert the citation: the package's `citationFeature`,
which this page enables, registers an `insertCitation` command (in
`editor.commands.commands`) around `runInsertCitation()`, the same
function a dropped reference calls.
The sibling `<sciflow-outline>` on the same panel shows the wiring the
list lacks: it finds the editor through its `for` attribute and sets its
own `cursorActive` on `editor-selection-change`.

"Cite" arrived with commit 29472114, which updated the editor from
0.0.1-beta (whose list had no such button) to 0.0.3. That commit changed
the list's binding (from `ref="referenceListRef"` to `:references`) but
gave it no `cursorActive` and no listener.

Reach:

- "Insert ref" beside a heading or a figure in "Document Outline" is
  enabled, since the outline sets its own `cursorActive`, but its press
  dispatches `sciflow-insert-cross-reference`, which nothing handles, so
  it does nothing either (code; not driven, since the button shows only
  for a heading or figure that carries an id).
- `@sciflow/editor-start` 0.1.1, the newest release, has the same list
  and README (code), so an update alone does not fix it. The open pull
  request `pkp/ui-library#979`, which moves this component to
  `src/components/BodyTextEditor/BodyTextEditor.vue` and updates to
  0.1.1, still renders the list without either binding (code, at its
  head 85384f34).

## Proposed fix

Wire the list to the editor in `WorkflowPublicationBodyText.vue`: bind
`cursorActive` to a flag that turns on when the editor receives the
focus and off when a document is loaded into it, and answer the list's
event with the editor's own `insertCitation` command, with the options
a dropped reference gets
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-cite-never-enabled/fix.diff)):

```diff
 							<sciflow-reference-list
 								id="sciflow-references"
 								:references="editorReferences"
+								:cursor-active.camel="isCursorPlaced"
+								@sciflow-insert-citation="handleInsertCitation"
 							></sciflow-reference-list>
```

```js
const isCursorPlaced = ref(false);

// onMounted, beside the other editor listeners:
	editor.addEventListener('focusin', () => (isCursorPlaced.value = true));

// the watcher that loads the saved document into the editor:
	isCursorPlaced.value = false;

function handleInsertCitation(event) {
	const id = event.detail?.reference?.id?.trim();
	const commands = editorRef.value?.commands?.commands;
	if (!id || typeof commands?.insertCitation !== 'function') return;
	editorRef.value.editorView?.focus();
	commands.insertCitation({items: [{id}], text: `[${id}]`, id});
}
```

The flag follows the focus, not the editor's selection reports, because
the editor also reports a selection when a document is loaded into it.
That happens on arrival and, by the code, after "Save", when the saved
document is loaded back; neither is a cursor the person placed.

The flag stays on when the focus leaves the editor. That is intended:
the editor keeps its cursor, and from the keyboard the focus has to
leave the editor to reach "Cite"; the press then puts the focus back
and inserts at that cursor.

The binding uses `.camel` so the template keeps the hyphenated
attribute name ui-library's lint asks for, while Vue sets the Lit
property `cursorActive`. Without it the value would land as a
`cursor-active` attribute, which the list ignores (the property has no
attribute).

Tried on OJS `main`:

- With the mouse: "Cite" was greyed on arrival, enabled once the cursor
  was in the text, and its press placed `[1]` after "First sentence.",
  highlighted "Alpha, A. …" in the list and showed "Unsaved Changes".
- From the keyboard: Shift+Tab from "Save" into the editor, without
  moving the cursor, enabled "Cite". After typing "First sentence.",
  four presses of Tab ("Save", "Fullscreen", the "References" heading,
  then "Cite" beside "Alpha, A. …") reached it, still enabled, and
  Enter placed `[1]` after "First sentence." with the focus back in the
  text. Without the fix the same Tabs pass over both "Cite" buttons,
  since a disabled button takes no focus.
- The drag control placed exactly one citation, with the fix and
  without it.

**Alternatives:**

- Setting the flag on every selection the editor reports, as
  `<sciflow-outline>` does for "Insert ref": tried, and "Cite" was then
  enabled on arrival, before anyone had placed a cursor. Setting it to
  the editor's focus on each report would, by the code, keep "Cite"
  greyed after a Tab into the editor, which moves no cursor and so
  sends no report (not walked).
- Turning the flag off on blur: by the code, "Cite" could then never
  be reached from the keyboard.
- Asking SciFlow for a `for` attribute on `<sciflow-reference-list>`,
  as `<sciflow-outline>` has, that binds the list to the editor: the
  cleaner end state, but it needs a package release and still leaves
  the insertion to the host; worth proposing to SciFlow beside this fix.
- Hiding "Cite" and relying on dragging: it leaves keyboard users
  without a way to cite.

**What goes with it:**

- No stored data, no API and no PHP change.
- "Insert ref" in "Document Outline" needs the same kind of handler for
  `sciflow-insert-cross-reference` (the package's
  `crossReferenceFeature` registers `insertCrossReference`); left out of
  this diff because the walk could not reach the button.
- The same lines in `BodyTextEditor.vue` if `pkp/ui-library#979` lands
  first.
- No backport.
- A guard: an end-to-end check in pkp-e2e's U48 suite that finds "Cite"
  greyed on arrival, presses it with the mouse and from the keyboard
  with the cursor in the text, and finds the citation. ui-library has no
  component tests (its seven `*.test.js` cover composables and stores,
  with no DOM environment); a Storybook `play` function on the existing
  `WorkflowPublicationBodyText.stories.js` would be the in-repo
  alternative, run by Chromatic.

Small: a flag, a listener and a handler in one component; the guard
needs no new tooling.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-cite-never-enabled/walk.js)
  (helpers in `lib.js` beside it), takes the Steps and the drag control
  on an install reset to the default dataset, reading each "Cite"
  button's `disabled` and the editor's citations:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/body-text-cite-never-enabled/walk.js`;
  `WALK=keyboard` takes
  the keyboard path alone and `WALK=neighbour` the drag control alone.
- Walked on OJS `main`, PostgreSQL, loaded from pkp/datasets e8dafbc
  (2026-10-02). No request failed and no script error was logged.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363); OJS `stable-3_5_0` 091fb65453 (lib/pkp cf3f984335,
  lib/ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b (lib/ui-library
  ee684b34); `stable-3_3_0` OJS ac77c9fb35 (lib/ui-library 96959f9e).
- Package code read: `@sciflow/editor-start` 0.0.3 as installed
  (`dist/lib/reference-list.js`, `dist/lib/outline.js`, the bundle
  `dist/bundle/sciflow-editor.js`, README "Reference list"),
  `@sciflow/editor-core` 0.0.3 (`dist/lib/features/citation/`,
  `dist/lib/commands.js`), and from the npm registry 0.1.1's
  `reference-list.js` and README and 0.0.1-beta's bundle (no `Cite`, no
  `cursorActive`). The package publishes no repository or issue
  tracker, only https://docs.sciflow.org.
- 3.5, 3.4 and 3.3 (code): each branch's lib/ui-library.
- Introduced: `git blame` on the list's binding gives 29472114 (merged
  as `pkp/ui-library#874`, co-authored by Frederik Eichler, frederik).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  symptom ("Cite" button, body text citation, references cite) and the
  code (`WorkflowPublicationBodyText`, sciflow). The hits are the
  feature's own issues and pull requests (`pkp/pkp-lib#10419`,
  `pkp/pkp-lib#12897`, `pkp/ui-library#810`, `pkp/ui-library#979`);
  none mentions this.
