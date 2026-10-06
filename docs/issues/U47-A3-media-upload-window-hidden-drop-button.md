# The empty "Upload Media File" window gives screen readers and the keyboard a button nobody can see

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Media" page)
  - 3.4: none (code; no "Media" page)
  - 3.3: none (code; no "Media" page)
- **Introduced** `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137ce](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** U47 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a publication's "Media" page, "Add Media File" opens the window
"Upload Media File". Before any file is added, a screen reader lists a
button "Drop files here to upload" there that has nothing visible behind
it: a sighted user sees only the drop area and "Click to upload files".
The button goes once a file is added.

A keyboard user meets the same button: Tab from "Click to upload files"
moves the focus onto it, and no focus mark shows anywhere on the
window. Pressing it opens the file chooser, so the upload still gets
done, by either button.

It meets everyone who adds media files: the manager, editor and
production editor, and an assigned section editor (series editor on a
press, moderator on a preprint server), guest editor or production
assistant (layout editor, designer, indexer, proofreader).

## Impact

- **Lost**: nothing; the file chooser opens from either button. The
  unseen button's name asks a screen-reader user for a drag and drop
  they cannot make.
- **Who**: those who add media files with a screen reader or the
  keyboard, each time they open the empty window.
- **Way round**: use "Click to upload files"; a keyboard user presses
  Tab once more to bring the focus back on screen.

Low: the upload gets done either way; what goes wrong is a misleading
control and one press of Tab whose focus cannot be seen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- A small image file, such as `figure.png`.
- A screen reader, or the browser's accessibility tree (Chrome DevTools,
  Elements › Accessibility).

1. Sign in as `dbarnes`.
2. Open submission 1: "Signalling Theory Dividends" (OJS); "The ABCs of
   Human Survival: A Paradigm for Global Citizenship" (OMP); "The
   influence of lactation on the quantity and quality of cashmere
   production" (OPS).
3. In the side menu, under "Publication" ("Preprint" on OPS), choose
   "Media" (on OJS, the one under "Version of Record 1.1", the version
   the menu opens on).
4. Press "Add Media File". The window "Upload Media File" opens.
5. Read the window's buttons with the screen reader.
6. Put the focus on "Click to upload files" and press Tab.
7. Press Enter.
8. Close the file chooser without choosing. Press "Click to upload
   files" and choose `figure.png`, then read the window's buttons again.

**Expected**: step 5 lists the buttons the window shows: the side
window's own top bar (the help link, "Tasks", the user menu), "Close"
and "Click to upload files". Step 6 moves the focus to a control on
screen.

**Observed**: step 5 lists one more button, which the window does not
show (OJS; OMP and OPS read the same):

```
- dialog "Upload Media File":
  - link "##common.help##"
  - button "Tasks 2"
  - button "DB dbarnes dbarnes"
  - button "Close"
  - heading "Upload Media File" [level=1]
  - paragraph: Upload image or multimedia files in bulk. You can manually adjust or link files later if needed.
  - heading "Upload File" [level=3]
  - img
  - paragraph: Drag and drop files here.
  - text: or
  - button "Click to upload files"
  - button "Drop files here to upload"
```

After step 6 the focus is on "Drop files here to upload" and no focus
mark shows on the window. Step 7 opens the file chooser. After step 8
the card for `figure.png` shows and the button is gone from the list.

## Cause

`FileMediaUploader.vue` (lib/ui-library), the window's upload box, draws
its own drop area and "Click to upload files" and keeps a Dropzone
instance out of sight to do the uploading: `<VueDropzone>` sits in a
`div` with `absolute h-0 w-0 overflow-hidden opacity-0`. That hides it
from the eye only. The accessibility tree and the Tab order still hold
everything inside it.

`dropzone-vue3` gives the Dropzone element the classes `vue-dropzone
dropzone` while its `includeStyling` prop is on (the default), and
Dropzone 6, when its element has the `dropzone` class and no
`.dz-message`, adds its default message:
`<div class="dz-default dz-message"><button class="dz-button"
type="button">Drop files here to upload</button></div>`
(Dropzone's default `dictDefaultMessage`). So the hidden box carries a real, focusable
button. A click on it reaches Dropzone's own click handler, which opens
the file chooser. Once a file is added, Dropzone sets `dz-started` and
its stylesheet hides the message (`.dropzone.dz-started .dz-message
{display: none}`), which is why the button goes with the first card.

Reach:

- The button is the Media window's own: `FileMediaUploader` is used
  only by `MediaFileManagerAddFileModal.vue` (checked in the code; on
  screen on the three apps).
- The shared `FileUploader.vue` hides its Dropzone the same way
  (`.fileUploader`: `width: 0; height: 0; overflow: hidden; opacity: 0`)
  and carries the same unseen button. It serves the submission files
  upload, the email "Attach Files" upload and the "JATS" page (checked
  in the code, not on screen). There the message is the text of the
  drop overlay `FileUploader` shows while a file is dragged over the
  page, so turning the styling off there would blank the overlay: that
  component needs its own change and is left out of this report.
- `FieldUpload.vue` and `FieldUploadImage.vue` (the settings upload
  boxes) show the Dropzone message on screen as their drop area; they
  are not affected (checked in the code).

## Proposed fix

Turn off `dropzone-vue3`'s styling on the hidden Dropzone in
`FileMediaUploader.vue`, so the element never gets the `dropzone` class
and Dropzone adds no default message
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-upload-window-hidden-drop-button/fix.diff)):

```diff
 			<VueDropzone
 				v-if="isMounted"
 				:id="dropzoneId"
 				ref="dropzone"
+				:include-styling="false"
 				:options="dropzoneOptions"
```

The window never shows the Dropzone element. In
`useFileMediaUploader.js` (beside the component), `handleDrop` forwards
a drop on the visible area to `dropzone.addFile()`, `openFileBrowser`
("Click to upload files") calls `hiddenFileInput.click()`, and
`dropzoneOptions` puts the hidden file input outside the hidden box
(`hiddenInputContainer: '#' + props.id`). Nothing in the component or
`MediaFileManager` reads `.dz-message` or Dropzone's stylesheet, so the
library's own switch removes the button rather than hiding it.

Tried on OJS, OMP and OPS `main`: the empty window then lists only its
top bar, "Close" and "Click to upload files", and Tab from "Click to
upload files" wraps to the help link in the side window's top bar.
Adding `figure.png` by "Click to upload files" and by a drop on the drop
area still gives a card where choosing "Image" turns "Upload Files" on,
with the fix in and out.

**Alternatives**:

- `aria-hidden="true"` with `inert` on the hiding `div`: also takes the
  button out of the accessibility tree and the Tab order, but keeps a
  control in the page that nothing uses.

**What goes with it**:

- Guard: an e2e check on the empty window that its buttons are the top
  bar's, "Close" and "Click to upload files", and that Tab from "Click
  to upload files" stays on a shown control.

Small: a one-line change in ui-library alone, with no data or API
effect.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-upload-window-hidden-drop-button/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/media-upload-window-hidden-drop-button/walk.js`
  on an install loaded from the default dataset; `WALK=neighbour` runs
  the neighbour check (both ways of adding a file, the drop as a `drop`
  event carrying `figure.png` on the drop area). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/media-upload-window-hidden-drop-button/fix.diff ojs omp ops`,
  which rebuilds the JavaScript.
- The walk reads the accessibility tree with Playwright's `ariaSnapshot()`
  and role queries, and the focus with `document.activeElement` and its
  computed opacity; no screen reader was run, so what each one
  announces is unverified.
- The help link's name "##common.help##" in the Observed block is a
  separate finding (U08 A1).
- Tips walked (PostgreSQL, pkp/datasets c657990 of 2026-10-01): OJS
  b84f8e2e44 (pkp-lib ddd8ab243a, ui-library 64d6736318); OMP 3b0ecf794c
  and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library 280f98c570).
  `FileMediaUploader.vue` and `useFileMediaUploader.js` are the same in
  both ui-library commits. Dropzone 6.0.0-beta.2 and dropzone-vue3 1.0.2
  as installed in the apps' `node_modules`.
- 3.5 (code): `stable-3_5_0` (ui-library d4e0188353) has no
  `FileMediaUploader` and no `MediaFileManager`; not walked. 3.4 and
  3.3 (code): ui-library `origin/stable-3_4_0` (ee684b341b) and
  `origin/stable-3_3_0` (96959f9ed4), the same.
- Introduced: `git blame` on the hidden `div` and `<VueDropzone>` gives
  3f97137ce for every line, the file's only commit.
