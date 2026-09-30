# Keyboard users cannot choose a file in Native XML import, authors' revision uploads and other legacy upload forms

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; OPS has no Native XML Plugin, only the other upload forms)
- **Introduced** broken by [3342372300](https://github.com/pkp/pkp-lib/commit/334237230016e84e8a5bf99d4d65cbccb721a717) (plupload 2.1.9 → 2.3.6, pushed without a PR) · 2018-10-22 · Alec Smecher (asmecher); the attribute it broke was added by PR `pkp/pkp-lib#2014` for `pkp/pkp-lib#1740` · [1dbcd963fb](https://github.com/pkp/pkp-lib/commit/1dbcd963fb7c01276ba7a64da2c14b5ab97438e6) · 2016-10-11 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a6)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On the Native XML Plugin's "Import" tab, the Tab key should stop on
"Upload File". Instead it skips the button and the box and goes straight
to "Import", so a manager who works without a mouse cannot choose a file
to import.

The same happens in every legacy upload form, the ones built on the
shared "Drag and drop a file here to begin upload" box. These include
the "Upload File" window that a submission's workflow file lists open,
where an author uploads revisions and editors upload files at every
stage. They also include the Users XML import, plugin upload, library
files, issue cover images and galleys, series cover images and profile
images. The author's "Start A New Submission" wizard uses a newer upload
control, which the keyboard reaches.

Keyboard users have no way round: only a mouse click or a dropped file
chooses one. The keyboard reached the button until a 2018 library
upgrade, first released in 3.1.2.

## Impact

- **Lost:** the upload. An author who was asked for revisions cannot
  upload the revised file. An editor or assistant cannot add a file to
  any workflow stage, and a manager cannot import. Nothing tells them
  why: the focus simply passes the button.
- **Who:** people who work from the keyboard alone, in ordinary use:
  every revision round and every workflow file. Screen-reader users are
  shut out differently. The button stays in the page's accessibility
  tree, where a screen reader's reading mode lists it, but Tab never
  reaches it.
- **Way round:** none from the keyboard.

High: for keyboard-only users a core task fails with no way round, and
authors meet it in every revision round. A new submission still works.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.
- Any small file on the computer, for instance `u63a6.xml` holding
  `<u63a6/>`. The box takes any file and reads it only when "Import" is
  pressed.

Native XML import (OJS, OMP, OPS):

1. Sign in as `rvaca`.
2. Open "Tools" (`/index.php/publicknowledge/en/management/tools`) and
   choose "Native XML Plugin". The page opens on the "Import" tab.
3. Click the "Import" tab's name, so the keyboard focus is on it.
4. Press Tab.
5. Press Tab again.
6. With the focus on "Upload File", press Enter and choose `u63a6.xml`.

An author's revision upload (OJS):

1. Sign in as `lkumiega`.
2. Open submission 13, "Hydrologic Connectivity in the Edwards Aquifer
   between San Marcos Springs and Barton Springs during 2009 Drought
   Conditions" (Review round 1, "Revisions have been requested.").
3. Under "Revisions Uploaded", press "Upload". The "Upload File" window
   opens.
4. In "Article Component", choose "Article Text". The box "Drag and drop
   a file here to begin upload" appears, with its "Upload File" button.
5. With the focus on "Article Component", press Tab.

An editor's workflow upload (OJS):

1. Sign in as `dbarnes`.
2. Open submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence" (Copyediting).
3. Under "Draft Files", press "Upload/Select Files". In the window that
   opens, press the "Upload File" link above the file list. The "Upload
   File" window opens.
4. and 5. As for the author.

**Expected:** in the import, step 4 puts the focus on "Upload File". In
step 6, Enter opens the computer's file picker, and the chosen file's
name appears in the box with the button reading "Change File". In both
workflow groups, step 5 puts the focus on the box's "Upload File".

**Observed:** in the import, step 4 puts the focus on the "Import"
button. After step 5 no element of the page has the focus: "Import" is
the page's last stop. No Tab
stop lands on "Upload File" or the box, so step 6 cannot be taken. In
both workflow groups, step 5 skips "Upload File" and lands on "Cancel".

Both buttons carry `tabindex="-1"`, and so does the hidden file input
behind them:

```html
<button id="pkpUploaderButton" class="pkp_uploader_button pkp_button" tabindex="-1">Upload File</button>
<!-- plupload's input, in a .moxie-shim beside it, at opacity 0 -->
<input type="file" tabindex="-1">
```

Control: clicking "Upload File" with the mouse opens the file picker
once, and the file goes up. In "Start A New Submission" › "Upload
Files", Tab reaches "Upload File" and Enter opens the file picker.

## Cause

The shared upload box, `templates/controllers/fileUploadContainer.tpl`
line 72 in pkp-lib, takes its "Upload File" button out of the tab order:

```html
<button id="{$browseButton|escape}" class="pkp_uploader_button pkp_button" tabindex="-1">
```

That attribute came in with
[1dbcd963fb](https://github.com/pkp/pkp-lib/commit/1dbcd963fb7c01276ba7a64da2c14b5ab97438e6)
(`pkp/pkp-lib#1740`, 2016). That commit stopped `UploaderHandler.js`
from passing clicks on the button to plupload's file input, because
Windows browsers opened the file picker twice. From then on, the hidden
file input was meant to be the keyboard's stop, and the button left the
tab order so the control would not have two stops. `UploaderHandler`
mirrors the input's focus onto the button (the `in_focus` class) so the
user sees where they are.

[3342372300](https://github.com/pkp/pkp-lib/commit/334237230016e84e8a5bf99d4d65cbccb721a717)
(2018) moved plupload from 2.1.9 to 2.3.6. Since plupload 2.3.4, its
moxie runtime takes the hidden input out of the tab order itself, and
makes the browse button the keyboard's stop instead. In
`moxie.js` `FileInput.init()`:

```js
// it shouldn't be possible to tab into the hidden element
(I.can('summon_file_dialog') ? input : browseButton).setAttribute('tabindex', -1);
```

The template's `tabindex="-1"` still keeps the button out, so neither
element can take the focus, and the `in_focus` mirroring has had nothing
to mirror since. moxie routes a click on the browse button to the input
(`input.click()`, then `e.preventDefault()`), so Enter on a focusable
button opens the picker. `UploaderHandler` also binds its own
`$browseButton.click(function(e) { return false; })` (line 101) to keep
the button from submitting the form. That `return false` stops the
event's default and its bubbling, not the other handlers on the same
element, so moxie's handler still runs.

Reach: every form that includes `fileUploadContainer.tpl`. On screen:

- the Native XML Plugin's "Import" tab (main and 3.5, all three apps);
- the upload wizard (`controllers/wizard/fileUpload/form/fileUploadForm.tpl`),
  on OJS main, from an author's "Revisions Uploaded" and an editor's
  "Draft Files".

The wizard opens from three places, in all three apps. The old file
grids open it through their `AddFileLinkAction`: the ui-library's
`fileSelectUpload()` loads such a grid, which is the "Draft Files" path.
The ui-library's `fileUpload()` (`useFileManagerActions.js`) opens it
for the workflow's file lists, the author's revisions included, and
`galleyChangeFile()` (`useGalleyManagerActions.js`) for galleys.

Read in the code only, not tried in a browser:

- the same wizard on OMP and OPS, and on 3.5;
- the Users XML Plugin's import, in OJS and OMP;
- "Upload A New Plugin" and plugin upgrades (`uploadPluginForm.tpl`),
  the publisher library and a submission's library
  (`library/form/newFileForm.tpl`, `editFileForm.tpl`,
  `submissionDocuments/form/newFileForm.tpl`), and the public profile's
  "Profile Image" (`publicProfileForm.tpl`);
- OJS's issue cover image and issue galley (`issueForm.tpl`,
  `issueGalleyForm.tpl`), and OMP's series cover image
  (`seriesForm.tpl`).

The submission wizard's "Upload Files" step uses the ui-library's
`SubmissionFilesListPanel`. Its "Upload File" is an ordinary Vue button
that opens Dropzone's file browser, and it is not affected.

## Proposed fix

Proposed: remove `tabindex="-1"` from the button in
`fileUploadContainer.tpl`, which lets plupload make the button the
control's one keyboard stop, as the library intends:

```diff
-		<button id="{$browseButton|escape}" class="pkp_uploader_button pkp_button" tabindex="-1">
+		<button id="{$browseButton|escape}" class="pkp_uploader_button pkp_button">
```

This keeps the intent of `pkp/pkp-lib#1740`: no click forwarding comes
back, and moxie's own handler calls `input.click()` once.

The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-file-keyboard-unreachable/fix.diff).
Its paths start at the app root (`lib/pkp/templates/…`); in a pkp-lib
PR the file is `templates/controllers/fileUploadContainer.tpl`. It was
tried on `main`:

- Native XML import (OJS, OMP, OPS): Tab from the "Import" tab landed on
  "Upload File". Enter opened one file picker and sent one upload request
  and no import request. The box then read "Change File" with the file's
  name. The next Tab reached "Import", so the hidden input stays out of
  the tab order.
- The upload wizard (OJS), from the author's "Revisions Uploaded" and
  the editor's "Draft Files": Tab from "Article Component" landed on
  "Upload File".
- The mouse path, checked with and without the fix: a click on "Upload
  File" opened exactly one file picker and uploaded the file once.

**Alternatives**

- Take the moxie-set `tabindex` off the hidden input, so that it is the
  stop as 1dbcd963fb intended. This works against the library on every
  upgrade. The input also reads "Choose File" to a screen reader rather
  than the button's label.
- Move these forms to the ui-library's Vue uploader. That is the longer
  road the newer screens took, and too large for this fault.

**What goes with it**

- Optional clean-up: remove the dead `in_focus` mirroring in
  `js/controllers/UploaderHandler.js` and its rule in
  `styles/controllers/plupload.less`. This needs the usual
  `js/pkp.min.js` rebuild.
- No stored data changes, and no API or hook is involved.
- The same line applies as written to 3.5, 3.4 and 3.3.
- A regression test belongs in pkp-e2e's import/export spec (U63) as an
  e2e check. On the Native XML "Import" tab, Tab from the tab's name
  reaches "Upload File", and Enter opens a file chooser. A second case
  does the same in the workflow's upload wizard.

Small: one attribute in one shared template, and an e2e test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-file-keyboard-unreachable/walk.js),
  `node bin/probe.js all shared/playwright/checks/issues/upload-file-keyboard-unreachable/walk.js`.
  Its header names the variables for the two workflow groups and the
  submission wizard's control.
- Fix trial:
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-file-keyboard-unreachable/trial.sh)
  applies fix.diff with `node bin/try-fix.js apply`, walks with the fix,
  reverts, and walks without it.
- The walks: main and 3.5 with OJS, OMP and OPS (Native XML), and main
  OJS (the workflow groups and the submission wizard). They ran in
  headless Chromium on PKP's default datasets from pkp/datasets 38ab955
  (2026-09-30). In the workflow groups, the script gives "Article
  Component" the focus directly rather than by a click.
- Branch tips:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc); OMP 3b0ecf794c and OPS
    c8af945bb7 (pkp-lib 3dc90c81a6, with an identical template).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd
    (pkp-lib a9c76aed62).
  - stable-3_4_0: OJS 9571d8fde7, OMP 0aec65441f, OPS acd8ae704b
    (pkp-lib df13621c2d).
  - stable-3_3_0: OJS 9fdb9bcf9a, OMP 8e72fc8836, OPS c5532e2161
    (pkp-lib d446601ebe).
- Code reads:
  - Line 72 carries `tabindex="-1"` at every tip above. Their
    `composer.lock` has `moxiecode/plupload` 2.3.9 (main, 3.5, 3.4) or
    2.3.7 (3.3).
  - `moxie.js` sets `tabindex=-1` on the input in plupload v2.3.4 and
    later, and not in v2.3.3, v2.3.0 or v2.1.9 (read from
    moxiecode/plupload's tags).
  - In 2.1.9, the input sits in a 1 px shim with `opacity:0` and no
    tabindex, so it could take the focus. That is the stop 1dbcd963fb
    relied on. 3.1.0 and 3.1.1 were not walked.
  - `git log -G` on `composer.lock` shows 3342372300 moving 2.1.9 to
    2.3.6, first in tag 3_1_2-0.
  - The ui-library's `useFileManagerConfig.js` gives the author
    `FILE_UPLOAD` on `WORKFLOW_REVIEW_REVISIONS`. `SubmissionFilesListPanel.vue`
    opens Dropzone from a `PkpButton`.
  - No other template in the three apps sets `tabindex="-1"` on a
    control.
- Upstream search (2026-09-30), in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library, issues and PRs: "upload file keyboard",
  "plupload tabindex", "upload button tab focus", "plupload
  accessibility", "uploader keyboard accessible", "UploaderHandler",
  "keyboard accessibility upload". Related but not this fault:
  - `pkp/pkp-lib#1411`: submission upload not keyboard operable, fixed
    in 2016 by click forwarding;
  - `pkp/pkp-lib#1740`: the double picker whose fix added the
    `tabindex="-1"`.
- Unverified: whether a screen reader (NVDA, JAWS, VoiceOver) activates
  the button from its reading mode today, and how it announces the
  button with the fix. The walks saw only that the button is in the
  accessibility tree.
