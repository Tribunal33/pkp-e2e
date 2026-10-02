# "Send to Text Editor" with a file holding images shows "Saved" on a never-saved Body Text, though nothing it brought is saved

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
- **Tracked in** spec U48 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a14) (its second symptom; the first is [U48-A14-body-text-opens-with-unsaved-changes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A14-body-text-opens-with-unsaved-changes.md))
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

"Send to Text Editor" with a file holding an image, into a version
whose Body Text was never saved, turns the "Save" button to "Saved"
beside the "Unsaved Changes" badge for a moment: uploading the image
saved the empty text, and the text "Send to Text Editor" brought is not
saved. "Saved" should show only when the person's text is saved.

The two signals contradict each other right as the text arrives, and
leaving the page then asks nothing, so a person who trusts "Saved" and
leaves loses what was sent; sending the file again brings it back.

## Impact

- **Lost**: nothing by itself; the text stays in the editor until the
  page is left. Leaving does not warn
  ([U48-A15-body-text-leaving-loses-text-unasked.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A15-body-text-leaving-loses-text-unasked.md)), so it is
  then lost, but the file stays in its list and "Send to Text Editor"
  can be pressed again.
- **Who**: editors and production staff using "Send to Text Editor" on
  a file with images (Word, OpenDocument and the other formats it
  offers), the first time for a version.
- **Way round**: press "Save" after the text arrives; the "Unsaved
  Changes" badge stays on until then.

Low: a misleading label for 1.5 s, with the badge beside it telling the
truth, and a lost text can be sent again. It would be medium if the
badge were off at the same time.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded, so that
  the version of submission 5 has never had its Body Text saved.
- A Word file with an image, here `figure.docx`: a heading, two
  paragraphs and an image with a caption.

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production), and choose "Production" in the side menu.
3. In "Production Ready Files", press "Upload", choose
   `figure.docx` and the component "Article Text", and finish the
   upload.
4. In the file's row, open "More Actions" and choose "Send to Text
   Editor".
5. In "Send File to Text Editor", under "To which version would you
   like to send this file?", choose "Unassigned version (…)" and press
   "Confirm". The version's "Body Text" page opens and the "Importing
   document" box runs above the editor.
6. Watch the "Save" button and the badge in the panel titled "Document
   Edit", on the right, while the box runs.
7. Reload the page without pressing "Save".

**Expected:** the box runs "Downloading document…", "Loading
converter…", "Converting…", "Uploading images…" and goes; the heading,
text and figure arrive with "Unsaved Changes"; the button reads "Save"
throughout, since nothing the person asked for was saved. After the
reload the editor is empty.

**Observed:** "Unsaved Changes" already shows when the page opens (a
fault of its own,
[U48-A14-body-text-opens-with-unsaved-changes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A14-body-text-opens-with-unsaved-changes.md)). While the box
reads "Uploading images…", the button turns to "Saved" and the badge
disappears; then the text arrives and
"Unsaved Changes" shows beside "Saved" until the button turns back to
"Save" about 1.5 s later. As recorded:

```
1015ms Save  | Unsaved Changes | Importing document Uploading images…
1218ms Saved |                 | Importing document Uploading images…
1417ms Saved | Unsaved Changes |
2718ms Save  | Unsaved Changes |
```

After the reload the editor is empty and shows no badge: the save
stored the empty text and the import was never stored. No request
failed.

## Cause

`WorkflowPublicationBodyText.vue` (`lib/ui-library`) has one
`saveDocument()` for the "Save" button. It stores the editor's document
(PUT `…/bodyText`) and then shows the button's confirmation
(`isSaved`, "Saved" for 1500 ms). A figure's image is stored as a file
depending on the saved Body Text (`SUBMISSION_FILE_DEPENDENT`, attached
to the Body Text's submission file), so `handleFigureUpload()` first
saves the Body Text when there is none yet, by calling the same
function:

```js
if (!bodyTextData.value?.id) await saveDocument();
```

That background save is not the person's "Save", but it shows the same
"Saved". An import uploads all of a file's images (through
`handleFigureUpload()`, from `PandocConverter`'s `rewriteImages()`)
before it pastes the converted text, so on a never-saved version the
background save stores the still empty document, says "Saved", and the
text arrives unsaved right after.

The save also assigns `bodyTextData`, which runs the watcher on
`[isEditorReady, bodyTextData]` again: it hands the editor the stored
document and clears `isDirty`. The stored document is the one the editor
holds, so the editor finds nothing to load (`isNoopSyncUpdate()`) and
keeps its content; only the badge goes until the text is pasted, which
happens after every image is uploaded. The text is therefore never
overwritten, before or after the fix (the fix keeps this assignment);
for "Insert figure" the stored document is the typed text, so the
figure is placed into it unchanged.

Reach:

- "Insert" › "Insert figure" on a never-saved version (code): the same
  call stores the text typed so far and shows "Saved" too; there the
  label is true for that text, but it is still not the person's "Save".
- "Send to Text Editor" into a version whose Body Text was saved
  before, or with a file without images (code): no background save, no
  "Saved".

## Proposed fix

Split the store from the confirmation: `storeDocument()` stores and
updates the saved state, `saveDocument()` (the button) calls it and
shows "Saved", and `handleFigureUpload()` calls `storeDocument()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-import-reads-saved-while-unsaved/fix.diff)).

Tried on OJS `main`: with the fix the same steps keep "Save" on the
button throughout, the text arrives with "Unsaved Changes", and a reload
still finds the empty text (the text is saved only on "Save", as
before). The control: "Insert figure" on a never-saved version still
stores the text typed before it (it survives a reload, with and without
the fix), now without "Saved", and the button's own "Save" still reads
"Saved" for 1.5 s.

**Alternatives:**

- Paste the converted text before uploading its images, so the
  background save stores it: it would save the text without
  the person pressing "Save", against the page's rule that sent text is
  saved only on "Save".
- Create the saved Body Text without storing the document (an API
  change in lib/pkp): larger, for the same result on screen.

**What goes with it:**

- `pkp/ui-library#979` (open) rewrites this as `persistDocument()` and
  `ensureBodyTextFile()`, and the background save there still sets
  `isSaved`, so the same split applies to it.
- The guard: an e2e check in spec U48 that "Save" never reads "Saved"
  while "Send to Text Editor" runs.

A proposal; the team decides. Small: one function split in one
component, no data or API change.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/body-text-import-reads-saved-while-unsaved/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-import-reads-saved-while-unsaved/walk.js)
  with the file it uploads (`u48r4-figure.docx`, beside it; any Word
  file with an image does) and the
  helpers in
  [body-text-opens-with-unsaved-changes/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/lib.js),
  run on a freshly loaded dataset with
  `node bin/probe.js ojs shared/playwright/checks/issues/body-text-import-reads-saved-while-unsaved/walk.js`
  (`MODE=nb` runs the control). The panel states above are read every
  20 ms.
- Walked on OJS `main` (PostgreSQL), PKP's default test dataset
  (pkp/datasets e8dafbc).
- Code read: `WorkflowPublicationBodyText.vue`, `PandocConverter.vue`,
  `@sciflow/editor-start` 0.0.3 `editor-element.js` (`applyDocUpdate()`,
  `isNoopSyncUpdate()`) on `main`. Introduced: `git log -S` puts both the save before an
  image upload and the button's "Saved" in 29472114; `pkp/ui-library#905`
  (762d29ce, 2026-06-17) later routed an import's images through the
  same upload.
- 3.5, 3.4, 3.3 (code): no Body Text editor, `PandocConverter` or
  `bodyText` API on `stable-3_5_0` (ojs 091fb65453, lib/pkp cf3f984335,
  lib/ui-library d4e01883), nor on `stable-3_4_0` and `stable-3_3_0`
  (ojs 75cc2d488b / ac77c9fb35, lib/pkp 6f96165c90 / 4156e50233,
  lib/ui-library ee684b34 / 96959f9e).
- Tips walked and read on `main`: ojs b84f8e2e44, lib/pkp ddd8ab243a,
  lib/ui-library 64d67363.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched on
  2026-10-02; `pkp/ui-library#979` (open) read at 85384f34.
