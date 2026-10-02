# Text typed in an article's Body Text is lost without a question on leaving the page

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no "Body Text" page)
  - 3.4: none (code; no "Body Text" page)
  - 3.3: none (code; no "Body Text" page)
- **Introduced** `pkp/ui-library#799` · [1e9b0896](https://github.com/pkp/ui-library/commit/1e9b089664eb22bd4572cef20705488ed598a782) · 2026-02-11 · Frederik Eichler (frederik)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a15)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Text typed on "Body Text" is lost without a word when the person
editing chooses another entry of the workflow's side menu, presses the
workflow's "Close", reloads the page or closes the browser tab. The page
is built to ask "The data on this form has changed. Do you wish to
continue without saving?" first, and never does.

They find out only on coming back to the page. Pressing "Save" before
leaving is the only way round. It affects anyone who writes an
article's Body Text in the built-in editor or brings it in with "Send
to Text Editor".

## Impact

- **Lost**: every change made since the last "Save": typed text, text
  brought in with "Send to Text Editor", inserted figures.
- **Who**: editors and production staff on the Body Text page, which
  every OJS install of `main` offers to those with Production access.
  The "Unsaved Changes" badge shows beside "Save", but nothing stops
  the click.
- **Way round**: none once it is lost; nothing brings the text back.

Medium, not high: the badge is on screen the whole time, and the
largest loss, a whole article brought in with "Send to Text Editor",
comes back by sending the file again, since it stays in its file list.
What cannot be redone is the person's own typing and corrections since
the last "Save". It would be high if long stretches of typing, rather
than an import followed by corrections, were the usual way of filling
the page.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, freshly
loaded. The version of submission 5 has never had its Body Text saved,
so "Unsaved Changes" already shows when the page opens (a fault of its
own, [U48-A14-body-text-opens-with-unsaved-changes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A14-body-text-opens-with-unsaved-changes.md)).

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production).
3. In the side menu, under "Publication" › "Unassigned version (…)",
   choose "Body Text".
4. Click into the editor and type "Typed but not saved". "Unsaved
   Changes" still shows beside "Save".
5. In the side menu, choose "Galleys".
6. Choose "Body Text" again.
7. Type "Typed before reload" and reload the browser page.
8. Type "Typed before close" and press "Close" at the top of the
   workflow.
9. Open submission 5 again and choose "Body Text".

**Expected:** at steps 5 and 8 the page asks "The data on this form has
changed. Do you wish to continue without saving?", and at step 7 the
browser asks whether to leave the site; answering "Cancel" (or "No")
keeps the editor and its text.

**Observed:** step 5 opens "Galleys" at once, with no question and no
browser dialog. At step 6 the editor is empty. Step 7 reloads with no
question, to an empty editor. Step 8 closes the workflow with no
question. At step 9 the editor is empty: none of the three texts was
kept. No request failed and the browser logged no error.

Choosing "Body Text" itself with unsaved text keeps the text, as it
should.

## Cause

`WorkflowPublicationBodyText.vue` (`lib/ui-library`) defines a
`navigationGuard(item)` that returns `window.confirm(t('form.dataHasChanged'))`
when `isDirty` is true and the target is another side-menu entry, and
registers it in `onMounted()`:

```js
if (typeof workflowStore.setNavigationGuard === 'function') {
	workflowStore.setNavigationGuard(navigationGuard);
}
```

The workflow store (`src/pages/workflow/workflowStore.js`) has no
`setNavigationGuard`, and nothing in ui-library ever had one: the guard
and its call came in together with the Body Text page, and the
`typeof` check made the missing method a silent no-op. The side menu
(`useWorkflowMenu()` over `useSideMenu()`) follows every click with
`setActiveItemKey()`, which unmounts the page and its unsaved document.

A reload, closing the tab and the workflow's "Close" have no guard at
all: the page adds no `beforeunload` listener and no close callback.
The other unsaved-work forms in ui-library get both from
`useFormChanged(…, {warnOnClose: true})` (`src/composables/useFormChanged.js`).

Reach:

- Closing the browser tab loses the text the same way (code: no
  `beforeunload` listener).
- Other workflow pages (code): no other page calls
  `setNavigationGuard`; the publication forms of the side menu
  ("Title & Abstract" and the others) do not track unsaved changes on
  a menu switch either. That is how those short forms behave today, not
  part of this report; this page is the only one built to ask.

## Proposed fix

Give the workflow store the guard the page already calls, ask it before
a side-menu click is followed, and add the shared leave and close
question to the page
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-leaving-loses-text-unasked/fix.diff)):

- `useSideMenu()` takes an optional `canNavigate(item)` and returns
  early from an item's `command` when it answers false;
  `useWorkflowMenu()` passes one through.
- `workflowStore.js` keeps one `navigationGuard`, exposes
  `setNavigationGuard(guard)`, and hands `useWorkflowMenu()`
  `canNavigate: (item) => !navigationGuard || navigationGuard(item)`.
- `WorkflowPublicationBodyText.vue` adds
  `useFormChanged(ref({}), [isDirty], {warnOnClose: true})`, which asks
  the browser's leave question on a reload or tab close and the
  "data has changed" question on the workflow's "Close".

Every side-menu click passes through the menu composable, so any later
page with unsaved work can register a guard the same way. The guard
also stands in front of the side menu's "Create New Version", which
opens its window without leaving the page: that question is intended,
because creating the version then moves to the new version's "Title &
Abstract" (`useWorkflowVersionForm.js` `goToPublicationPage()`), which
would lose the text. That move, and the move to "Body Text" after "Send
to Text Editor", go through `store.navigateToMenu()`, which calls
`setActiveItemKey()` without the guard, as do the stage pages'
"Schedule for publication" buttons (`workflowConfigEditorialOJS.js`).
None of these can be reached from the Body Text page except through the
guarded "Create New Version", so no text is lost that way today; a later
page that registers a guard and offers such a button needs the guard in
`navigateToMenu()` too.

Tried on OJS `main`: with the fix, "Galleys" asks "The data on this
form has changed. Do you wish to continue without saving?", "Cancel"
keeps the editor and its text and "OK" leaves; a reload brings the
browser's leave question; "Close" asks the same question with "Yes" and
"No". With typed text, the side menu's "Create New Version" asks the same
question first: "Cancel" keeps the page and its text with no window,
and "OK" opens the "Create New Version" window over the page, whose
"Cancel" returns to the text, still there. The control: leaving a saved Body Text with no changes,
choosing "Body Text" itself with typed text, and closing the workflow
after a reload with nothing typed ask nothing, with and without the
fix. An untouched never-saved page asks too, because its badge is
wrongly on (first point below).

**Alternatives:**

- Register the guard on the side menu component instead of the store:
  the page does not render the menu, and the store is what it already
  calls.
- A `beforeunload` listener written into the page: `useFormChanged()`
  already does that and the workflow close, the way the task, review
  and discussion forms use it.

**What goes with it:**

- A never-saved Body Text opens with `isDirty` already true
  ([U48-A14-body-text-opens-with-unsaved-changes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A14-body-text-opens-with-unsaved-changes.md)), so with
  this fix alone, leaving an untouched never-saved page would ask too.
  That fix should land first or together.
- `pkp/ui-library#979` (open) moves the editor into a `BodyTextEditor`
  component; its `WorkflowPublicationBodyText.vue` (lines 50-68 at
  85384f34) keeps the same `navigationGuard` and the same
  `typeof workflowStore.setNavigationGuard === 'function'` call, and it
  does not change `workflowStore.js`, so the fault survives it. If it
  lands first, `useFormChanged()` goes into `BodyTextEditor`, which
  holds `isDirty` there.
- The guard: an e2e scenario in spec U48 (type, choose "Galleys",
  "Cancel" keeps the text; reload asks).

A proposal; the team decides. Medium: more than wiring the existing
prompt, since the store needs the method the page calls, the shared
side-menu composable (also used by `SideNav`) a new option that every
menu item passes through, the page the reload and close questions, and
the fix has to land with or after the badge fix above; four files in
ui-library.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/body-text-leaving-loses-text-unasked/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-leaving-loses-text-unasked/walk.js)
  (helpers in
  [body-text-opens-with-unsaved-changes/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/lib.js)),
  run on a freshly loaded dataset with
  `node bin/probe.js ojs shared/playwright/checks/issues/body-text-leaving-loses-text-unasked/walk.js`
  (`MODE=nb` runs the control, `MODE=cv` the "Create New Version"
  click); its typed texts end in a marker, "u48r4".
- Walked on OJS `main` (PostgreSQL), PKP's default test dataset
  (pkp/datasets e8dafbc).
- Code read: `WorkflowPublicationBodyText.vue`, `workflowStore.js`,
  `useWorkflowMenu.js`, `useSideMenu.js`, `SideMenu.vue`,
  `useFormChanged.js`, `SideModal.vue`, `useWorkflowVersionForm.js`,
  `useWorkflowNavigationConfigOJS.js`, `workflowConfigEditorialOJS.js`
  on `main`; `git log -S setNavigationGuard` in ui-library finds only
  1e9b0896. `pkp/ui-library#979` read at its head 85384f34 (its file
  list and `WorkflowPublicationBodyText.vue`).
- 3.5, 3.4, 3.3 (code): no Body Text editor, `PandocConverter` or
  `bodyText` API on `stable-3_5_0` (ojs 091fb65453, lib/pkp
  cf3f984335, lib/ui-library d4e01883), nor on `stable-3_4_0` and
  `stable-3_3_0` (ojs 75cc2d488b / ac77c9fb35, lib/pkp 6f96165c90 /
  4156e50233, lib/ui-library ee684b34 / 96959f9e).
- Tips walked and read on `main`: ojs b84f8e2e44, lib/pkp ddd8ab243a,
  lib/ui-library 64d67363.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched on
  2026-10-02.
