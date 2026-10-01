# The empty "Upload Media File" window offers screen readers and the Tab key a button nobody sees

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (read in the code: no "Media" page)
  - 3.4: none (read in the code: no "Media" page)
  - 3.3: none (read in the code: no "Media" page)
- **Introduced** `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U47 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a submission's "Media" page, the button "Add Media File" opens the
window "Upload Media File". Until a file has been added to it, a screen
reader lists a button "Drop files here to upload" there that has nothing
visible behind it: a sighted user sees only the drop area and "Click to
upload files". The Tab key stops on it too, right after "Click to upload
files", and nothing on the page shows where the focus is.

The hidden button opens the same file chooser as "Click to upload
files", so uploads work either way. The "Media" page is new on `main`
and in no release yet, so no live site meets this; the fix is one
setting in the window's upload component.

## Impact

- **Lost:** nothing. A screen-reader user hears two controls for one
  action, one of them named after a drag gesture, and a keyboard user
  loses sight of the focus for one Tab press.
- **Who:** whoever adds media files, when they use a screen reader or
  the keyboard, each time they open the window: the Journal Manager
  (Press Manager, Preprint Server Manager), Editor, Production Editor and
  Site Administrator; and, when assigned to the submission, the Section
  Editor (Series Editor, Moderator) and, on a journal or press, the
  Layout Editor, Designer, Indexer and Proofreader. The "Media" page is
  in the workflow's side menu, under "Publication" ("Preprint" on OPS)
  › the version › "Media".
- **Way round:** "Click to upload files" is the same action, and the
  next Tab press brings the focus back into view.

Low: the upload gets done either way. It would be higher if the hidden
button failed or held the focus, and it does neither.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS).
- A screen reader (NVDA, VoiceOver), or the browser's accessibility tree
  (Chrome DevTools › Elements › "Accessibility", full-page tree), to
  list what the window offers.

1. Sign in as `dbarnes`.
2. Open the submission in Production: OJS 5, "Genetic transformation of
   forest trees"; OMP 4, "How Canadians Communicate: Contexts of
   Canadian Popular Culture"; OPS 1, "The influence of lactation on the
   quantity and quality of cashmere production".
3. In the side menu, under "Publication" (OPS: "Preprint"), choose
   "Media".
4. Press "Add Media File". The window "Upload Media File" opens.
5. List the window's buttons with the screen reader (NVDA: Insert+F7,
   "Buttons"), or read the accessibility tree.
6. With the keyboard, put the focus on "Click to upload files" and press
   Tab.
7. Press "Click to upload files" and choose an image file (`figure.png`).
   Once its card shows "What kind of media is this? (Required)", list the
   buttons again.
8. Press the card's "Remove" (×), and list the buttons once more.

**Expected:** at steps 5 and 8 the window lists the buttons it shows:
those of its top bar (the help link, "Tasks" and the user menu), "Close"
and "Click to upload files". Step 7 adds the card's "Remove" and "Upload
Files". At step 6 "Click to upload files" is the window's last control,
so Tab wraps round to the first, the help link in the window's top bar.

**Observed:** at step 5 the list holds one button more, after "Click to
upload files":

```
- button "Close"
- button "Click to upload files"
- button "Drop files here to upload"
```

At step 6 the focus lands on "Drop files here to upload", and nothing on
the page shows it; only the next Tab wraps round to the top bar's help
link. Enter on the hidden button opens the file chooser. At step 7 the
button is gone ("Close", "Click to upload files", "Remove", "Upload
Files"), and at step 8 it is back.

## Cause

ui-library's `FileMediaUploader.vue`, the uploader in "Upload Media
File", draws its own drop area and "Click to upload files" and keeps a
`VueDropzone` (dropzone-vue3) only for its upload queue. It hides that
Dropzone in a box with `class="absolute h-0 w-0 overflow-hidden
opacity-0"` (lines 144–157). A box hidden that way is out of sight, but
its content stays in the accessibility tree and the Tab order.

The content is Dropzone's own. `VueDropzone` gives its element the
classes `vue-dropzone dropzone` unless its `includeStyling` prop is false
(`dropzone-vue3` `vue-dropzone.vue`, line 5), and Dropzone's `init()`
adds to any `.dropzone` element its default message, a real button:
`<div class="dz-default dz-message"><button class="dz-button"
type="button">Drop files here to upload</button></div>` (dropzone
6.0.0-beta.2, `src/dropzone.js` line 226). A click on it opens the
hidden file input. Dropzone's stylesheet hides the message once a file
is added (`.dropzone.dz-started .dz-message{display:none}`), and its
reset after the last removal shows it again.

The rule it breaks: a control the page does not show must not be
offered to assistive technology or to the keyboard (WCAG 2.2, 2.4.7
"Focus Visible" for the Tab stop).

Reach:
- `FileMediaUploader` has one user, the "Upload Media File" window
  (`MediaFileManagerAddFileModal.vue`), in every app (checked in the
  code; walked on OJS, OMP and OPS).
- ui-library's older `FileUploader.vue` makes the same mistake: its
  Dropzone sits in a `.fileUploader` box of width 0, height 0 and
  opacity 0. The same button was seen on screen on OJS's "JATS XML"
  page. The code shows it also in the submission wizard's file list
  (`SubmissionFilesListPanel.vue`) and in file attachments
  (`FileAttacherUpload.vue`, used by the Composer and discussions), and
  in 3.5's ui-library. Left out of this fix (Proposed fix).
- `FieldUpload.vue` and `FieldUploadImage.vue` show Dropzone's message
  on purpose as their drop area: not instances (code).

## Proposed fix

Turn off `VueDropzone`'s styling classes in `FileMediaUploader.vue`, so
that Dropzone adds no message to the hidden box
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-upload-hidden-drop-button/fix.diff)):

```diff
-		<!-- Hidden VueDropzone -->
+		<!-- Hidden VueDropzone: never shown. Without its styling class Dropzone
+			adds no "Drop files here to upload" button, which screen readers
+			and the Tab key would otherwise reach. -->
 		<div class="absolute h-0 w-0 overflow-hidden opacity-0">
 			<VueDropzone
 				v-if="isMounted"
 				:id="dropzoneId"
 				ref="dropzone"
+				:include-styling="false"
 				:options="dropzoneOptions"
```

The box is never shown, so it needs neither class: nothing in the
component styles by them. The upload queue, the hidden file input (which
Dropzone puts in the uploader's own element, outside the box), "Click to
upload files" and a drop on the drop area work as before. The button
must not exist at all, not just be hidden: the side window's focus trap
(reka-ui `FocusScope`) picks the window's last control by `tabIndex`
alone, so a hidden but present button still counts as the last control
(see the `inert` alternative).

Tried on OJS, OMP and OPS: the empty window listed only its top bar,
"Close" and "Click to upload files", and Tab from "Click to upload files"
wrapped round to the top bar's help link. A file dropped on the drop
area was still added with "Upload Files". The "JATS XML" page, which the
fix leaves alone, kept its button.

**Alternatives:**
- `inert` on the hidden box: tried. It takes the button out of the tree
  and the Tab order, but `FocusScope` ignores `inert` and still takes
  the button for the window's last control. Tab from "Click to upload
  files" then left the focus on the page body instead of wrapping round.
- `aria-hidden="true"` on the box: hides the button from screen readers
  but leaves it focusable, so Tab still stops on an unseen control, now
  one without a name.
- A `dictDefaultMessage` option or `VueDropzone`'s `use-custom-slot`:
  each changes the text, but keeps an element in the hidden box.

**What goes with it:**
- `FileUploader.vue` needs the same outcome, in a different change: its
  box doubles as the drop overlay shown while a file is dragged over the
  page, with Dropzone's message as the overlay's text, so the classes
  cannot simply go. It is worth its own report.
- The test: an e2e check that the empty "Upload Media File" window
  lists no "Drop files here to upload" (U47's scenario for the window).
  A ui-library unit test is ruled out for now: its vitest runs seven
  tests of composables and stores, with no DOM environment and no
  `@vue/test-utils`, so mounting `FileMediaUploader` (which also reads
  the `pkp` global) would first need that test setup added.

Small: one attribute in one component.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-upload-hidden-drop-button/walk.js)
  takes the Steps on an install freshly reset to the default dataset and
  reads the browser's own accessibility tree (Chrome DevTools Protocol
  `Accessibility.getFullAXTree`, what a screen reader is given) at steps
  5, 7 and 8, and the Tab order from the window's "Close":
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/media-upload-hidden-drop-button/walk.js`.
  It also re-checks what the fix could break (a file dropped on the drop
  area, then "Upload Files") and reads OJS's "JATS XML" page.
- The fix check: `node bin/try-fix.js apply shared/playwright/checks/issues/media-upload-hidden-drop-button/fix.diff ojs omp ops`
  (rebuilds the JavaScript), reset the dataset, run the script, then
  `node bin/try-fix.js revert ojs omp ops`. Run with the fix in and
  out.
- The hidden button, read from the page: `<button class="dz-button"
  type="button">Drop files here to upload</button>`, 49×160 px, in a
  0×0 px box with `opacity: 0` and `overflow: hidden`; the element drawn
  at its centre is not the button.
- Tips: `main` OJS `bade233f73`, OMP `3b0ecf794c`, OPS `c8af945bb7`
  (lib/pkp `2e377d27fc` on OJS, `3dc90c81a6` on OMP and OPS; ui-library
  `280f98c570` on all three); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp `a9c76aed62`, ui-library
  `1a7a4750`); `stable-3_4_0` OJS `9571d8fde7` (lib/pkp `df13621c2d`,
  ui-library `ee684b34`); `stable-3_3_0` OJS `9fdb9bcf9a` (lib/pkp
  `d446601ebe`, ui-library `96959f9e`). Walked on the default dataset of
  pkp/datasets `38ab955` (2026-09-30).
- 3.5, 3.4, 3.3 (code): ui-library `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0` have no `FileMediaUploader` and no `MediaFileManager`,
  and their lib/pkp no `MediaFilesController`: there is no "Media" page
  to walk.
- Introduced: `git blame` on `FileMediaUploader.vue` lines 144–157 gives
  3f97137c, the merge of `pkp/ui-library#794` that added the component
  and the "Media" page's front end; the file has no later commit.
- Upstream: pkp/pkp-lib and pkp/ui-library searched by the symptom's
  words and by `FileMediaUploader` and `dz-button`; nothing matched.
- Not driven: a real screen reader; the browser's accessibility tree
  stands for it, so how NVDA or VoiceOver words the button stays
  unverified.
