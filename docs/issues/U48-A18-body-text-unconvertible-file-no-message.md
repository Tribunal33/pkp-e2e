# A file sent to the Body Text editor that cannot be converted ends the import with no message

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no "Body Text" page)
  - 3.4: none (code; no "Body Text" page)
  - 3.3: none (code; no "Body Text" page)
- **Introduced** `pkp/ui-library#905` for `pkp/pkp-lib#12897` · [762d29ce](https://github.com/pkp/ui-library/commit/762d29ce5f0163d01949446425a5d7c06d848794) · 2026-06-17 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** fix in PR `pkp/ui-library#979` (open), not yet in main, as part of a rewrite of the import (checked in its code, not run)
- **Tracked in** spec U48 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a18)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Sending a file the converter cannot read (a text file named ".docx") to
"Body Text" runs the "Importing document" box through "Converting…",
then the box goes with no message: nothing is imported, and the editor
stays as it was (empty on a version with no Body Text). The page should
say the file could not be converted.

The person editing is left guessing whether the import failed, is still
running, or produced an empty document. The same silence follows any
file the converter rejects; damaged or password-protected Word files
are expected to be among them but were not tried.

## Impact

- **Lost**: nothing; the file could not have been imported.
- **Who**: editors and production staff using "Send to Text Editor" on
  a file whose content the converter cannot read.
- **Way round**: none on screen to learn the reason; the person can
  only try another file.

Low: the outcome is right for an unreadable file; only the explanation
is missing. It would be medium if files people expect to import
(ordinary Word files that are damaged or protected) were refused this
way; that stays a hypothesis, since only a renamed text file was
walked.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded.
- A plain text file saved with a ".docx" name, here `broken.docx`
  ("This is a plain text file, not a Word document, saved with a .docx
  name.").

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production), and choose "Production" in the side menu.
3. In "Production Ready Files", press "Upload", choose
   `broken.docx` and the component "Article Text", and finish the
   upload.
4. In the file's row, open "More Actions" and choose "Send to Text
   Editor".
5. In "Send File to Text Editor", choose "Unassigned version (…)",
   leave "Publication Stage" and "Revision Significance" empty, and
   press "Confirm".
6. Watch the box above the editor.

**Expected:** after "Converting…" the box reads "Import failed" with the
converter's reason and offers "Dismiss".

**Observed:** "Body Text" opens and the box reads "Importing document"
with "Downloading document…", "Loading converter…", then
"Converting…"; about 30 ms later the box is gone. No "Import failed", no
reason, no "Dismiss"; the editor stays empty. No request failed and the
browser logged no error.

The control: a real Word file sent the same way imports its heading,
text and figure.

## Cause

`PandocConverter.vue` (`lib/ui-library`) converts the file in
`runConversion()` with pandoc-wasm and treats only a thrown exception as
a failure (its `catch` sets `lastError`, which shows "Import failed"):

```js
const result = await pandocInstance.convert({to: 'html', …}, null, {[file.name]: file});
stage.value = 'upload';
const html = await rewriteImages(result.stdout, result.mediaFiles || {});
emit('html-ready', {html});
```

pandoc-wasm's `convert()` does not throw when pandoc fails: it returns
an empty `stdout` and pandoc's error on `stderr` (`src/core.js` of
pandoc-wasm 1.1.0, installed in the OJS checkout's own `node_modules`,
which OJS's `vite.config.js` aliases as `pandoc-core`). For this file it
returns `stdout: ""` and `stderr: "ERROR: couldn't unpack docx
container: Did not find end of central directory signature"` (run in
Node with the same options). The component emits `html-ready` with
empty HTML, and the page's `handlePandocHtmlReady()`
(`WorkflowPublicationBodyText.vue`) hands it to `view.pasteHTML()`,
which adds nothing. The `finally` of the auto-import watcher in
`PandocConverter.vue` then clears the busy state, so the box goes, and
`lastError` is never set.

Reach:

- Every file pandoc rejects, whatever its format: the page offers the
  import for `docx`, `odt`, `rtf`, `tex`, `latex`, `md` and `markdown`
  (code; only the renamed text file was walked).
- A download that fails or a converter that does not load still throw,
  and still show "Import failed" (code).

## Proposed fix

Treat an empty output as a failure, right after the conversion, with
the guard `pkp/ui-library#979` uses
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-unconvertible-file-no-message/fix.diff)):

```diff
 			{[file.name]: file},
 		);
+		// pandoc-wasm does not throw when pandoc fails: it returns no output,
+		// with pandoc's message on stderr
+		if (!result.stdout?.trim()) {
+			throw new Error(
+				result.stderr?.trim() || t('publication.bodyText.import.failed'),
+			);
+		}
```

The existing `catch` then sets `lastError`, and the box shows "Import
failed", the reason and "Dismiss", as it already does for a failed
download. It also covers empty output with nothing on `stderr` (a file
that converts to nothing), which then reads "Import failed" twice
rather than ending in silence; `publication.bodyText.import.failed`
exists on `main`. A file that converts has output, whatever pandoc
writes to `stderr`, so it is not refused.

Tried on OJS `main`: with the fix the same send ends in a box reading
"Import failed", "ERROR: couldn't unpack docx container: Did not find
end of central directory signature" and "Dismiss", which closes it; the
editor stays empty. The control, a real Word file with an image, still
imports its heading, text and figure with no failure box, with and
without the fix.

**Alternatives:**

- Show only the translated "Import failed" text instead of pandoc's own
  line: friendlier, but it hides the reason, which is the one thing the
  person can act on.
- Throw whenever `stderr` is not empty: would refuse a conversion that
  produced output beside a message.

**What goes with it:**

- `pkp/ui-library#979` (open) replaces this component. Its
  `useDocumentImport.js` (lines 103-106 at 85384f34) throws the same
  error when the output is empty; `BodyTextEditor.vue`'s `runImport()`
  catches it into `importError` (line 554), which
  `BodyTextImportStatus.vue` shows as "Import failed" with the cause and
  "Dismiss". So #979 shows a message for this case (read in its code,
  not run). If it lands first, this fix is not needed; if not, this is
  the small fix until then.
- The guard: an e2e check in spec U48 that sends an unreadable file and
  expects "Import failed".

A proposal; the team decides. Small: one guard in one component, using
a locale key that exists.

## Evidence

- Kept script:
  [shared/playwright/checks/issues/body-text-unconvertible-file-no-message/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-unconvertible-file-no-message/walk.js)
  with the file it uploads (`u48r4-broken.docx`, beside it, the
  `broken.docx` of the steps) and the
  helpers in
  [body-text-opens-with-unsaved-changes/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/body-text-opens-with-unsaved-changes/lib.js),
  run on a freshly loaded dataset with
  `node bin/probe.js ojs shared/playwright/checks/issues/body-text-unconvertible-file-no-message/walk.js`
  (`MODE=nb` runs the control, a real Word file).
- Walked on OJS `main` (PostgreSQL), PKP's default test dataset
  (pkp/datasets e8dafbc). Unverified: whether pasting empty HTML could
  change text already in the editor (the walk's editor was empty, and
  the paste goes to a cursor, not a selection); damaged and
  password-protected Word files and the other formats were not walked.
- Code read: `PandocConverter.vue`, `pandocLoader.js`,
  `WorkflowPublicationBodyText.vue` (`handlePandocHtmlReady()`),
  `useFileManagerConfig.js` (`PANDOC_IMPORT_EXTENSIONS`) on `main`;
  pandoc-wasm 1.1.0 `src/core.js` `convert()` and its README. The
  pandoc answer above came from calling `convert()` in Node 22 on the
  same file.
- `pkp/ui-library#979` read at its head 85384f34
  (`useDocumentImport.js`, `BodyTextEditor.vue`,
  `BodyTextImportStatus.vue` under `src/components/BodyTextEditor/`).
- 3.5, 3.4, 3.3 (code): no Body Text editor or `PandocConverter` on
  `stable-3_5_0` (ojs 091fb65453, lib/pkp cf3f984335, lib/ui-library
  d4e01883), nor on `stable-3_4_0` and `stable-3_3_0` (ojs 75cc2d488b /
  ac77c9fb35, lib/pkp 6f96165c90 / 4156e50233, lib/ui-library ee684b34
  / 96959f9e).
- Tips walked and read on `main`: ojs b84f8e2e44, lib/pkp ddd8ab243a,
  lib/ui-library 64d67363.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched on
  2026-10-02; `pkp/pkp-lib#12897` (the import feature, open) and
  `pkp/ui-library#979` are the only hits.
