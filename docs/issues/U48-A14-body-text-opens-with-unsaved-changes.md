# An article's Body Text that was never saved opens with "Unsaved Changes" before anything is typed

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no "Body Text" page)
  - 3.4: none (code; no "Body Text" page)
  - 3.3: none (code; no "Body Text" page)
- **Introduced** `pkp/ui-library#799` · [1e9b0896](https://github.com/pkp/ui-library/commit/1e9b089664eb22bd4572cef20705488ed598a782) · 2026-02-11 · Frederik Eichler (frederik)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a14) (its first symptom; the second is [U48-A14-body-text-import-reads-saved-while-unsaved.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A14-body-text-import-reads-saved-while-unsaved.md))
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a version whose Body Text nobody has saved yet (every new version
starts that way), "Body Text" opens empty with the "Unsaved Changes"
badge already on, before anything is typed. The badge should show only
once something changes.

The badge then no longer tells the person editing whether they have
changed anything, on every version until its Body Text is first saved.

## Impact

- **Lost**: nothing.
- **Who**: editors and production staff opening "Body Text" on any
  version whose Body Text was never saved, which is every version until
  someone saves one.
- **Way round**: none needed; pressing "Save" on the empty page stores
  an empty Body Text and clears the badge. A stored empty Body Text
  behaves like a never-saved one everywhere else: readers' pages and the
  JATS XML do not use the Body Text, and a later "Send to Text Editor"
  places its text the same way.

Low: only an indicator is wrong. It would matter more with the leave
question proposed in
[U48-A15-body-text-leaving-loses-text-unasked.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A15-body-text-leaving-loses-text-unasked.md) (not yet in
the code): with it, leaving any untouched never-saved page would ask
about unsaved changes.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, freshly
loaded, so that the version of submission 5 has never had its Body Text
saved.

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production).
3. In the side menu, under "Publication" › "Unassigned version (…)",
   choose "Body Text".
4. Without touching the editor, read the panel on the right.

**Expected:** an empty editor and "Save", with no "Unsaved Changes".

**Observed:** the empty editor with "Save" and "Unsaved Changes" beside
it, from about 0.3 s after the page opens. The browser console warns
`TextSelection endpoint not pointing into a node with inline content
(doc)` once, on opening; a saved Body Text opens without it. The
warning comes from the same empty document (it has no paragraph to put
the cursor in) but is not what turns the badge on, and the fix leaves
it. No request failed.

Once the version's Body Text has been saved (type any text, "Save",
choose "Galleys", then "Body Text" again) the page opens without the
badge.

## Cause

`WorkflowPublicationBodyText.vue` (`lib/ui-library`) decides the badge
(`isDirty`) by comparing the editor's document, serialized, with
`savedDocumentSerialized`. When the Body Text loads, the watcher on
`[isEditorReady, bodyTextData]` hands the server's document to the
editor and takes the server's JSON as the saved state:

```js
savedDocumentSerialized.value = serializeDocument(documentContent);
```

The editor then reports the document back (`editor-change`, with no
operations) in its own form, and `handleEditorChange()` compares that
report with the server's JSON. For a never-saved version the server
sends its default document, `{"type":"doc","content":[]}`
(`BodyTextFile::getDefaultContent()`, lib/pkp), and the editor reports
`{"type":"doc","attrs":{"type":"article"}}`: its default attribute added,
the empty content dropped. The two strings differ, so `isDirty` turns
true with nothing typed. A saved document came from the editor in the
first place, so its report matches and the badge stays off.

The rule broken: the saved state must be the document as the editor
holds it, not the raw JSON it was given.

Reach: any stored document the editor normalizes differently from how
it was saved, such as one saved by an older editor version (code; not
seen).

## Proposed fix

On the first load, take the editor's report of the document (the
change with no operations) as the saved state
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/fix.diff)):

```diff
 const isSaved = ref(false);
+let awaitingLoadedDocument = false;
…
+		// before the first load the editor has no view yet; later loads (after
+		// a save) hand it what it already holds, and it reports nothing back
+		awaitingLoadedDocument = !editorRef.value.editorView;
 		editorRef.value.doc = {
…
 	currentDocument.value = updatedDoc;
+	if (awaitingLoadedDocument && ops.length === 0) {
+		// the editor's report of the loaded document, not a change
+		savedDocumentSerialized.value = serializeDocument(updatedDoc);
+	}
+	awaitingLoadedDocument = false;
 	isDirty.value =
 		serializeDocument(updatedDoc) !== savedDocumentSerialized.value;
```

Only the first load sets the flag. Every save assigns `bodyTextData`
and so runs the watcher again, but it hands the editor the document it
already holds; the editor's `isNoopSyncUpdate()` then sends no report,
so a flag set there would wait for the next change and could take a
real change with no operations for the saved state. The editor has a
view only after its first load, which is what the flag tests. The
baseline becomes what the editor holds, so any normalization it applies
is covered.

Tried on OJS `main`: with the fix the never-saved page opens with
"Save" and no badge; typing shows the badge, "Save" hides it, and typing
after the save shows it again (each keystroke reports one operation). A
saved page still opens without the badge. Typing one character and
deleting it leaves the badge on, with and without the fix: the editor
then holds an empty paragraph, which is not the document it loaded.

**Alternatives:**

- Send the editor's own empty document from the server
  (`getDefaultContent()`): it would tie lib/pkp to the editor's schema
  and attributes, and break again when they change.
- Normalize both sides in `serializeDocument()` (drop empty `content`):
  the editor also adds attributes, so it would have to mirror the
  editor's whole normalization.

**What goes with it:**

- `pkp/ui-library#979` (open) moves this code into a `BodyTextEditor`
  component with the same baseline line, so whichever lands second
  carries the other's change.
- The guard: an e2e check in spec U48 that a never-saved Body Text opens
  without the badge and shows it after typing.

A proposal; the team decides. Small: a flag and four lines in one
component, no data or API change.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/lib.js),
  run on a freshly loaded dataset with
  `node bin/probe.js ojs shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/walk.js`
  (`MODE=nb` runs the control: typing, saving and typing again). The
  script records each `editor-change` document, which is where the two
  JSON forms above come from.
- Walked on OJS `main` (PostgreSQL), PKP's default test dataset
  (pkp/datasets e8dafbc).
- Code read: `WorkflowPublicationBodyText.vue`,
  `WorkflowPublicationBodyTextUtils.js` (`serializeDocument()`),
  `@sciflow/editor-start` 0.0.3 `editor-element.js`
  (`initializeView()`, `sanitizeDocJSON()`), lib/pkp
  `classes/bodyText/BodyTextFile.php`, `Repository.php` on `main`. For
  the way round: nothing outside the `bodyText` API reads a stored Body
  Text (no template, the `jatsTemplate` plugin or a file list in
  ui-library), so an empty stored one and a never-saved one differ only
  in the stored file.
- Introduced: the baseline line is blamed to 1e9b0896
  (`pkp/ui-library#799`, the page's first dirty tracking). Unverified:
  whether the editor of that commit (0.0.1-beta) already reported the
  default document in another form; the editor was moved to 0.0.3 in
  29472114 (`pkp/ui-library#874`, 2026-04-14).
- 3.5, 3.4, 3.3 (code): no Body Text editor or `bodyText` API on
  `stable-3_5_0` (ojs 091fb65453, lib/pkp cf3f984335, lib/ui-library
  d4e01883), nor on `stable-3_4_0` and `stable-3_3_0` (ojs 75cc2d488b /
  ac77c9fb35, lib/pkp 6f96165c90 / 4156e50233, lib/ui-library ee684b34
  / 96959f9e).
- Tips walked and read on `main`: ojs b84f8e2e44, lib/pkp ddd8ab243a,
  lib/ui-library 64d67363.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched on
  2026-10-02.
