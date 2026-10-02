# A press's editor is offered "Send to Text Editor" on a file, and confirming it imports nothing

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none (code; no "Send to Text Editor")
  - 3.4: none (code; no "Send to Text Editor")
  - 3.3: none (code; no "Send to Text Editor")
- **Introduced** `pkp/ui-library#905` for `pkp/pkp-lib#12897` · [762d29ce](https://github.com/pkp/ui-library/commit/762d29ce5f0163d01949446425a5d7c06d848794) · 2026-06-17 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#omp1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A press's file lists offer "Send to Text Editor" on a Word,
OpenDocument, RTF, LaTeX or Markdown file, and its window asks "To which
version would you like to send this file?". A press has no "Body Text"
page, so after "Confirm" nothing opens and nothing is imported; with
"Create New Version" chosen, a new version is created all the same. The
action should not be offered on a press.

The action is the journal's import of a file into the version's "Body
Text" page, which works on OJS and stays there.

## Impact

- **Lost**: nothing. "Create New Version" adds a new publication
  version of the monograph: an unpublished copy of the latest version,
  listed under "Publication" in the workflow's side menu. No screen
  deletes it. It blocks nothing, since each version is published from
  its own pages, but the workflow now opens on the copy.
- **Who**: the Press manager, the Press editor and the Site
  administrator, on any workflow file list holding such a file.
- **Way round**: none needed; a press has nothing to import into.

Low. The severity would rise to medium if an editor published the copy
in place of the version the press had been editing; the walk did not
see that happen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP (`publicknowledge`,
  "Public Knowledge Press").
- A short Markdown file on your computer, `u48r6-notes.md` (a heading
  and a paragraph). The dataset's files are all PDFs, and the action is
  offered only on Word, OpenDocument, RTF, LaTeX or Markdown files.

Steps:

1. Sign in as `dbarnes` (Press editor).
2. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture", on its "Production" stage.
3. Above "Production Ready Files", press "Upload". Choose "Book
   Manuscript", attach `u48r6-notes.md`, then press "Continue",
   "Continue" and "Complete". The row "u48r6-notes.md" appears.
4. Open the row's "More Actions" menu.
5. Choose "Send to Text Editor".
6. In "To which version would you like to send this file?", pick
   the book's one version, "Unassigned version (<date>)" (the date the
   dataset's publication was created). Leave "Publication Stage" and
   "Revision Significance", which then appear, empty. Press "Confirm".
7. Open the row's "More Actions" again, choose "Send to Text Editor",
   pick "Create New Version" and press "Confirm".
8. Look at the side menu's "Publication" group.

**Expected**: a press has no "Body Text" page, so at step 4 the menu
offers no "Send to Text Editor". It lists "Update File Details", "More
Information" and "Delete".

**Observed**: at step 4 the menu lists "Send to Text Editor", "Update
File Details", "More Information" and "Delete". Step 5 opens the window
"Send File to Text Editor", with the choices "Create New Version" and
"Unassigned version (2026-10-02)". At step 6 the window closes, the
page stays on "Workflow: Production", and nothing opens, is imported or
is sent to the server. At step 7 the window closes the same way, after
this request:

```
POST /index.php/publicknowledge/api/v1/submissions/4/publications/4/version  → 200
```

At step 8 the "Publication" group lists two "Unassigned version
(2026-10-02)" entries.

Control: on the journal, OJS submission 5, "Genetic transformation of
forest trees", the same steps 1–6, choosing "Article Text" as the
file's component in step 3, open the version's "Body Text" page with
the file's text imported.

## Cause

The "Send to Text Editor" entry comes from the ui-library's shared file
list configuration, `src/managers/FileManager/useFileManagerConfig.js`.
Every file list there (`SUBMISSION_FILES`, `EDITOR_REVIEW_FILES`,
`WORKFLOW_REVIEW_REVISIONS`, `COPYEDITED_FILES`, `FINAL_DRAFT_FILES`,
`PRODUCTION_READY_FILES`) grants `Actions.FILE_SEND_TO_EDITOR` to the
manager and the site administrator. `getManagerConfig()` keeps the
actions granted to a role the user is assigned on that stage
(`hasCurrentUserAtLeastOneAssignedRoleInStage()`), after dropping the
editing actions from a read-only list; `getItemActions()` then checks
the file's extension only. OMP's workflow takes most of its file lists
from OJS's configuration (`useWorkflowConfigOMP.js` merges
`workflowConfigEditorialOJS.js` under OMP's own), and its Internal
Review stage declares its own `WORKFLOW_REVIEW_REVISIONS` and
`EDITOR_REVIEW_FILES` lists with the same namespaces
(`workflowConfigEditorialOMP.js`). So a press shows the entry on all of
them.

The window's "Confirm" ends in `goToBodyTextWithImport()` in
`src/pages/workflow/composables/useWorkflowVersionForm.js`, which calls
`store.navigateToMenu('publication_<id>_bodyText')`. Only
`useWorkflowNavigationConfigOJS.js` defines a `bodyText` entry, so on a
press the call finds no page and the workflow stays where it was. It
leaves `importFileUrl` and `importFileName` in the address, which is
harmless. Before that, `handleVersionSubmission()` sends no request
when the window's "Publication Stage" is empty, which is always so for
a version that already has a stage (the field is hidden and reset), and
a `PUT …/publications/<id>/version` when a stage is chosen for an
unassigned version. "Create New Version" posts the new version first,
then goes nowhere.

Before 762d29ce, "Confirm" opened the chosen version's "Title &
Abstract", a page every app has. `pkp/pkp-lib#11366` had specified that
on purpose until a text editor existed. 762d29ce (Pandoc import into
"Body Text") pointed "Confirm" at the journal-only "Body Text" page,
but the entry stayed on every app.

Reach:

- OMP: every workflow file list above, for the manager-level roles
  (checked on screen as the Press editor on "Production Ready Files";
  the other lists and roles in the code).
- OPS: no file list in the workflow (its only stage, Production,
  replaces OJS's file lists), so no entry (checked in the code).
- OJS: the action does its job (checked on screen).
- Stored data: "Create New Version" adds a version (on screen); a
  stage chosen for an unassigned version is saved on it (read in the
  code, not walked).

## Proposed fix

Offer the action only where its page exists. In `getManagerConfig()`,
drop `FILE_SEND_TO_EDITOR` from the available actions unless the app
is OJS, in the same filter that already drops the editing actions from
a read-only list
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-send-to-text-editor-leads-nowhere/fix.diff)):

```diff
-		const availableActions = readOnly?.value
-			? config.actions.filter((action) => !EDITING_ACTIONS.includes(action))
-			: config.actions;
+		const availableActions = config.actions.filter(
+			(action) =>
+				!(readOnly?.value && EDITING_ACTIONS.includes(action)) &&
+				// "Send to Text Editor" opens the version's Body Text page, which only a journal has
+				(action !== Actions.FILE_SEND_TO_EDITOR || isOJS()),
+		);
```

with `const {isOJS} = useApp();` beside `useCurrentUser()`. The check
belongs in `getManagerConfig()` because that is where the
configurations become the actions a list offers, so all six file lists
are covered at once. `useApp().isOJS()` is how the workflow already
keeps journal-only behaviour apart (`useWorkflowVersionForm.js` for
the publish window, `useWorkflowActions.js`,
`WorkflowNotificationDisplay.vue`). It ships with a `lib/ui-library`
pointer bump and a JavaScript rebuild in the apps.

Tried on `main`: with the fix, OMP shows the Expected and OJS still
imports the file into "Body Text"; without it, both are as Observed and
in the Control.

**Alternatives**

- Point "Confirm" back at "Title & Abstract" on a press: the window
  would still promise a text editor that does not exist.
- Offer the action when the version's side menu has a `bodyText` entry:
  more general, but it ties the file list to the navigation config. It
  is worth having only once a second app gets a Body Text page.
- Remove the entry from the six configurations and add it back per app:
  the file list configurations are shared, not per app, so this needs a
  new override mechanism.

**What goes with it**

- No data repair. Versions that presses already created this way are
  ordinary unpublished versions.
- No backport: 3.5 and older have no "Send to Text Editor".
- The guard: an OMP check that a manager's "More Actions" on a Markdown
  file in "Production Ready Files" lists no "Send to Text Editor", beside
  the OJS scenario that sends one (a **Planned** item in the spec).
- `pkp/pkp-lib#12905` (open) is deciding who may send a file to the
  text editor. Whatever roles it settles on, this check keeps the entry
  off a press.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-send-to-text-editor-leads-nowhere/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-send-to-text-editor-leads-nowhere/lib.js))
  takes steps 1–8 on OMP. With `MODE=nb` it takes the control alone:
  steps 1–4 and the row's menu on both apps, and on OJS the send to the
  existing version (steps 5–6). Each run
  starts from an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/press-send-to-text-editor-leads-nowhere/walk.js`
  (`MODE=nb` and `all` for the neighbour check). The walks ran on
  PostgreSQL. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/press-send-to-text-editor-leads-nowhere/fix.diff ojs omp`
  (which rebuilds the JavaScript), the walk on OMP and `MODE=nb` on both
  apps, then `revert` and `MODE=nb` again.
- Datasets: pkp/datasets e8dafbc (2026-10-02).
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794; pkp-lib
  ddd8ab243a (OJS) and 3dc90c81a6 (OMP); ui-library 64d67363 (OJS) and
  280f98c5 (OMP). 3.5: OMP 9c5e24246; pkp-lib cf3f984335; ui-library
  d4e01883. 3.4: OMP 0aec65441f; pkp-lib 6f96165c90; ui-library
  ee684b34. 3.3: OMP 8e72fc8836; pkp-lib 4156e50233; ui-library
  96959f9e.
- Code reads. 3.5, 3.4 and 3.3: neither the ui-library's `src` nor
  pkp-lib's English locale holds `sendToTextEditor` or
  `FILE_SEND_TO_EDITOR`. The 3.5 file lists' menus are built by the
  same `useFileManagerConfig.js` without the action, and 3.4's and
  3.3's by the legacy file grids, which have no such action.
- The extra version: the ui-library's `src` on `main` has no control
  that deletes a version (searched for a delete of a publication or
  version). Publishing acts on the version chosen in the side menu
  (`PublicationConfig` in `workflowConfigEditorialOMP.js` and
  `workflowScheduleForPublication()` take `selectedPublication`). On
  reopening the submission after step 7, the walk's side menu had the
  copy open.
- `pkp/ui-library#905` is 762d29ce's pull request, per
  `https://github.com/pkp/ui-library/branch_commits/762d29ce5f0163d01949446425a5d7c06d848794`.
- Introduced: `git blame` on the `getItemActions()` lines gives
  762d29ce for the extension check, and `git log -S"_bodyText"` on
  `useWorkflowVersionForm.js` gives 762d29ce for the move to "Body
  Text". The role grant and the entry itself come from
  [68972cca](https://github.com/pkp/ui-library/commit/68972cca811525acfde402dfb675ed2053fd0a9c)
  (`pkp/ui-library#621` for `pkp/pkp-lib#11366`, 2025-06-10, Blesilda
  Ramirez), when "Confirm" opened "Title & Abstract" in every app.
- Upstream searches (pkp/pkp-lib, pkp/omp, pkp/ui-library): "Send to
  Text Editor", "text editor", "body text" OMP, "text editor" press,
  `sendToTextEditor`, `FILE_SEND_TO_EDITOR`. Read and not the same
  fault: `pkp/pkp-lib#12905` (open, which roles may send),
  `pkp/pkp-lib#12746` (open, connecting the send to the text editor),
  `pkp/pkp-lib#12897` (open, the Pandoc import) and `pkp/pkp-lib#11366`
  (closed, the action's first version).
