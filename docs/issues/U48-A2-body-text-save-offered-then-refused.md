# A Layout Editor without "Permissions" can write on "Body Text", but "Save" is refused and the text is lost

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no "Body Text" page)
  - 3.4: none (code; no "Body Text" page)
  - 3.3: none (code; no "Body Text" page)
- **Introduced** `pkp/ui-library#747` for `pkp/pkp-lib#11994` · [0f007c5e](https://github.com/pkp/ui-library/commit/0f007c5e1d84a51a799499dbd84bcfbd512cc296) · 2025-12-10 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Layout Editor, Proofreader or other assistant assigned in Production,
whose assignment has "Permissions" unticked, gets the text editor and
an active "Save" on "Body Text". They can write for as long as they
like; "Save" is then refused with a window "Error" reading "You are not
allowed to edit this publication.". "Unsaved Changes" stays, and the
text is lost when they reload or leave the page.

The page lets anyone who can open it write, but the server saves the
text only for people who may change the publication. For a Layout
Editor or other assistant, that means an editor has ticked
"Permissions" on their assignment. An editor can do that, but what was
typed before is gone unless the person copied it out.

"Permissions" is unticked by default for the Guest Editor and every
assistant role. So with default roles, every Layout Editor,
Proofreader or other assistant assigned to an article in Production
meets this.

## Impact

- **Lost**: the text the participant typed, and the time spent on it.
- **Who**: the people named in the Summary, on the "Body Text" page of
  any version of an article they are assigned to.
- **Way round**: copy the text out before leaving, then have an editor
  tick "Permissions" on the participant's assignment (or paste it in
  for them).

Medium: typed work is lost for the people the page offers the task to,
and an editor can unblock it on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Submission 5, "Genetic
  transformation of forest trees", is in Production with `gcox` (Layout
  Editor) assigned, his "Permissions" box unticked (the Layout Editor
  role's default). Its one version has no saved Body Text.

1. Sign in as `gcox`.
2. On the dashboard ("Assigned to me") press "View" on submission 5.
3. Side menu: "Publication" › "Body Text".
4. Look at the page.
5. Click into the text editor and type `Layout note u48r3.`
6. Press "Save".
7. Read the window that opens and press "OK". Look beside "Save".
8. Reload the browser page and open "Publication" › "Body Text" again.

**Expected**, as recommended below: the page shows `gcox` the text
read-only: no toolbar, no "Save", no "Selected Element", and typing in
the text editor does nothing, so steps 5–7 cannot be taken.

**Observed**: in step 4 the page offers the toolbar, an editable text
editor and "Save", with "Unsaved Changes" beside it (a never-saved Body
Text shows the badge on opening,
[U48 A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a14)).
The typed line appears. "Save" opens:

```
Error
You are not allowed to edit this publication.
OK
```

The save answered 401:

```
PUT …/api/v1/submissions/5/publications/6/bodyText   401   (sent as POST with X-Http-Method-Override: PUT)
{"error":"api.submissions.403.userCantEdit","errorMessage":"You are not allowed to edit this publication."}
```

After "OK" the text editor still holds the line and "Unsaved Changes"
stays. The reload in step 8 asks nothing, and afterwards the text
editor is empty.

## Cause

The server: `lib/pkp/api/v1/bodyText/PKPBodyTextController.php` routes
`PUT` and `DELETE` for `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`,
`ROLE_ID_SUB_EDITOR` and `ROLE_ID_ASSISTANT`, and `authorize()` adds
`PublicationWritePolicy` for every action but `get`. Its
`PublicationCanBeEditedPolicy` asks
`Repo::submission()->canEditPublication()`: true for a manager-level
role, otherwise only when one of the user's assignments on the
submission has `canChangeMetadata` (the "Permissions" box). The Body
Text belongs to the publication version, so this is the rule the media
and JATS APIs use too.

The page: `WorkflowPublicationBodyText.vue` (ui-library,
`src/pages/workflow/components/publication/`) declares only
`submission` and `publication`, and always renders the formatting
toolbar, the import box, an editable SciFlow editor and "Save". The
sibling publication pages that save to the publication get the
server's answer as a prop: the forms, Contributors, Funders, References,
Media and JATS XML as `canEdit: permissions.canEditPublication`,
Galleys as `canCurrentUserEditPublication`. That value is the
publication's `canCurrentUserChangeMetadata`, computed by the same
`canEditPublication()`.

The page was meant to be gated. When it came in 0f007c5e
(`pkp/pkp-lib#11994`), `workflowConfigEditorialOJS.js` passed it
`canEdit: permissions.canEditPublication`, but the component never
declared or read the prop, so the value fell through as an attribute
and gated nothing. The page has behaved as it does now since then.
The line was later removed in `pkp/ui-library#905` (squashed as
762d29ce, `pkp/pkp-lib#12897`, the Pandoc import): its commit 82f4e094
removed it together with a change to who is offered "Send to Text
Editor", and the PR's later commit a4784c77, "Revert permission
changes", put the "Send to Text Editor" change back but not this line.
Whether the line was dropped on purpose the commits do not say; the
team should confirm. The removal changed nothing on screen.

After a refused save, `saveDocument()` gets no `data`, so it leaves
`isDirty` set. The page has no `beforeunload` handler, so a reload
drops the text without asking (leaving within the workflow is
[U48 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a15)).

Reach:

- Who: every participant without a manager-level role whose
  assignments all have "Permissions" unticked and who has Production
  access (the "Body Text" item is listed only with
  `canAccessProduction`). Walked: a Layout Editor.
- The figure upload inside the text editor goes through the same
  policy and is offered the same way (`handleFigureUpload()`, which
  saves the document first; code).
- Not reached: the Author, whose view lists no "Body Text".
- The same pattern, separate fixes: the "JATS XML" page's "Make
  available with publication"
  ([U48 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A1-jats-make-available-offered-then-refused.md);
  its component has `canEdit` but does not apply it to that box) and
  the "Media" page's actions
  ([U47 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U47-A1-media-actions-offered-then-refused.md),
  `pkp-e2e#493`).

## Proposed fix

Recommended: people without "Permissions" see the Body Text read-only.
The text is part of the publication version, which "Permissions"
guards on every other publication page, and 0f007c5e already meant to
pass the page that answer. Pass `canEdit` again and declare it; when it
is false, show no toolbar, no import, no "Save" and "Unsaved Changes",
and make the editor not editable. The SciFlow element exposes its
ProseMirror view (`editorView`), whose `editable` prop is the editor's
own read-only switch; the element rebuilds the view on each mount and
announces it with `editor-ready`, so the page sets the prop there. The
prop is `required: true`, as on `WorkflowPublicationJats`,
`ContributorManager`, `CitationManager` and `WorkflowPublicationForm`,
so a config that stops passing it is warned about in development, as
the dropped line was not.

The sidebar's "Selected Element" section changes the text too: its
fields' "Apply" calls the view's `dispatch()` directly
(`sciflow-selection-editor`), which `editable` does not stop. So the
fix also leaves that section out for people who may not edit, and a
selection no longer opens it for them. "References" and "Document
Outline" stay as reading aids.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-save-offered-then-refused/fix.diff):

```diff
--- a/lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js
 					component: 'WorkflowPublicationBodyText',
 					props: {
+						canEdit: permissions.canEditPublication,
--- a/lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationBodyText.vue
 			<PandocConverter
+				v-if="canEdit"
…
-					<div class="sciflow-body-text__editor-toolbar">
+					<div v-if="canEdit" class="sciflow-body-text__editor-toolbar">
…
-					<div class="sciflow-body-text__save-row">
+					<div v-if="canEdit" class="sciflow-body-text__save-row">
…
+	canEdit: {type: Boolean, required: true},
…
-const sidebarSections = [
+const allSidebarSections = [
…
+const sidebarSections = computed(() =>
+	allSidebarSections.filter(
+		(section) => props.canEdit || section.key !== 'selected-element',
+	),
+);
…
 	await applyFeatureConfiguration();
+	editor.addEventListener('editor-ready', applyEditable);
+	applyEditable();
…
+function applyEditable() {
+	editorRef.value?.editorView?.setProps({editable: () => props.canEdit});
+}
…
-	if (hasRange || hasNode) {
+	if ((hasRange || hasNode) && props.canEdit) {
```

The story (`WorkflowPublicationBodyText.stories.js`) passes
`:can-edit="true"`.

Tried on OJS `main`: `gcox` sees the page with no toolbar, no "Save",
no "Unsaved Changes" and no "Selected Element"; the text editor is not
editable, and typing leaves it unchanged. With and without the fix,
`dbuskins` (a Section editor whose assignment has "Permissions") gets
the toolbar, an editable text editor, "Save" and all three sidebar
sections, and the typed line saves (200) and is there after a reload.

**Alternatives**:

- Hide the whole page from the side menu for them: they would lose
  sight of the text they are preparing the galleys from.
- Keep the text editor and only hide "Save": the person could still
  type text that goes nowhere, which is the fault itself.
- Let the server accept the save from Layout Editors and the other
  assistants: the text is part of the publication version, and this
  would widen who may change it.

**What goes with it**:

- No server, REST API or stored data change.
- "Document Outline" offers "Insert ref" beside a heading or figure
  that has an id, once the text has a selection, and it too inserts
  through `dispatch()` (code; not walked, since the default dataset's
  text has no such heading). If the team wants that closed as well,
  the cleaner way is a read-only mode in the SciFlow element itself.
- Guard: an e2e check that an assigned Layout Editor without
  "Permissions" sees the text read-only (a **Planned** item in the
  spec).

Small: one component, one config line and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-save-offered-then-refused/walk.js)
  (helpers in `../jats-make-available-offered-then-refused/lib.js`),
  steps 1–8 on a freshly loaded default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/body-text-save-offered-then-refused/walk.js`.
  `WALK=neighbour` takes steps 1–8 as `dbuskins` (Section editor on
  submission 5, "Permissions" ticked in the dataset); it was walked with
  the fix in and out. `WALK=sidebar` (fix applied) has `dbarnes` save a
  line, then `gcox` (or `SIDEBAR_WHO=dbuskins`) select it and look for
  "Selected Element".
- Walked: OJS `main` on its default dataset (pkp/datasets e8dafbc,
  2026-10-02, PostgreSQL). Not walked: the other roles named in Reach,
  a published version, the figure upload. Whether "Selected Element"
  changes the text for a person in a read-only view was not seen: with
  the first version of the fix (without the section change), the walk
  could not open the section for `gcox` or for `dbuskins` (after
  selecting the line, four presses on "Selected Element" left every
  sidebar section closed; whether the page or the script is at fault
  is unverified, see also
  [U48 A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a17)),
  so the section change rests on the code read of
  `@sciflow/editor-start` 0.0.3 `selection-editor.js` (`applyDraftAttrs`
  and the hyperlink and citation handlers call `view.dispatch()`).
- 3.5, 3.4, 3.3 (code): no `WorkflowPublicationBodyText` or other body
  text component in ui-library's `src` and no `bodyText` API or schema
  in pkp-lib on `stable-3_5_0` (the checkouts), `stable-3_4_0` or
  `stable-3_3_0`.
- Introduced: `git show 0f007c5e` adds the config entry with `canEdit`
  and the component without the prop; `git log -S` on the line finds
  its removal in 762d29ce, and the PR's commits (GitHub,
  `pkp/ui-library#905`) place it in 82f4e094, with a4784c77 reverting
  only `useFileManagerConfig.js`. The server's `PublicationWritePolicy`
  on the save is pkp-lib 21585b09, the same day as 0f007c5e.
- Upstream: no pkp issue or PR found in pkp/pkp-lib, pkp/ui-library or
  pkp/ojs (searched for body text with save or permission, read-only,
  layout editor, `canEditPublication`, `WorkflowPublicationBodyText`).
  The open `pkp/ui-library#810` reworks the same component without
  touching who may edit.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a,
  lib/ui-library 64d67363); `stable-3_5_0` OJS 091fb65453 (cf3f984335,
  d4e01883); `stable-3_4_0` OJS 75cc2d488b, pkp-lib 6f96165c90,
  ui-library ee684b34; `stable-3_3_0` OJS ac77c9fb35, pkp-lib
  4156e50233, ui-library 96959f9e.
