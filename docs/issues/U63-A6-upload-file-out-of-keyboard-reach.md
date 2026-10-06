# "Upload File" cannot be reached with the keyboard: no revision, galley or import upload without a mouse

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [3342372300](https://github.com/pkp/pkp-lib/commit/334237230016e84e8a5bf99d4d65cbccb721a717) · 2018-10-22 · Alec Smecher (asmecher): the update from plupload 2.1.9 to 2.3.6, which made the button's earlier `tabindex="-1"` (below) leave nothing reachable
- **Upstream** none open (2026-10-01); `pkp/pkp-lib#1411` (closed 2016 with a fix, the same symptom on the submission file upload; the 2018 plupload update undid that fix)
- **Tracked in** spec U63 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a6) · spec U36 [A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a26)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Someone who works with the keyboard alone cannot choose a file in the
upload window that the editorial workflow opens. In the window, Tab
skips "Upload File" and the "Drag and drop a file here to begin upload"
box. It goes from the component list straight to "Cancel", and no
number of Tab or Shift+Tab presses ever stops on "Upload File". The
Native XML Plugin's "Import" tab has the same box and the same fault:
Tab goes straight to "Import".

Without a mouse the file picker cannot be opened, and dropping a file
needs a mouse too. So an author cannot upload a revision, and an editor
cannot upload a production-ready file or a galley's file. On a preprint
server, a moderator cannot add a galley's file. Imports cannot be
started either.

New submissions are not affected: the submission form's "Add File" can
be reached and works from the keyboard.

## Impact

- **Lost.** No data. The upload cannot be made, and nothing on screen
  says why.
- **Who.** Authors, editors and managers who cannot use a mouse. It hits
  every workflow upload: revisions, review and copyedited files,
  production-ready files, galleys. It also hits imports and the other
  older upload forms listed under Cause. This holds in every setup.
- **Way round.** None from the keyboard. Someone with a mouse has to do
  the upload. An author outside the journal usually has no one to ask.

High: core steps of submitting and publishing (an author's revision, an
editor's galley file) cannot be done by keyboard-only users. This holds
on every install, with no way round. Critical would need the fault to
reach the users of a common setup; here it reaches only people who
cannot use a mouse, and new submissions still work. Medium would fit
only if keyboard-only use counted as a rarely met state.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- Any small file on the computer, for example `u63ir14.xml`. The steps
  never go past choosing it.

Editor, a workflow upload (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Open the submission's workflow:
   - OJS: submission 5, "Genetic transformation of forest trees".
   - OMP: submission 4, "How Canadians Communicate: Contexts of
     Canadian Popular Culture".
   - Both open on Production. Under "Production Ready Files", press
     "Upload".
   - OPS: submission 1, "The influence of lactation on the quantity and
     quality of cashmere production". Choose Publication › "Galleys",
     press "Add galley", type "u63ir14" as the label and press "Save".
3. The window "Upload a Production Ready File" opens (OPS: "Upload a
   File Ready for Publication"). Choose "Article Text" under "Article
   Component". In OMP choose "Appendix" under "Submission Component";
   in OPS choose "Preprint Text" under "Preprint Component".
4. Press Tab, and keep pressing it. Then press Shift+Tab back to the
   window's top.

Author, a revision (OJS):

1. Sign in as `lkumiega`.
2. Open submission 13, "Hydrologic Connectivity in the Edwards Aquifer
   between San Marcos Springs and Barton Springs during 2009 Drought
   Conditions". It opens on Review, Round 1, with revisions requested.
3. Press "Upload revisions". In the window "Upload Review File", choose
   "Article Text" under "Article Component".
4. Press Tab, and keep pressing it. Then press Shift+Tab.

Native XML import (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Open Tools › Import/Export › "Native XML Plugin". The page opens on
   the "Import" tab.
3. Click the "Import" tab's name, so the focus sits on the tab strip.
4. Press Tab, and keep pressing it. Then press Shift+Tab.

**Expected:** after the component list (or the tab strip), Tab stops on
"Upload File". Enter there opens the computer's file picker. Once
`u63ir14.xml` is chosen, its name shows in the box and the button reads
"Change File". In the upload window, Tab then goes on to "Continue".

**Observed:** in the upload window, Tab goes from the component list to
"Cancel", then to the window's help link. Shift+Tab goes from "Cancel" back to
the component list, then to "1. Upload File" and "Close". On the import
tab, Tab goes to "Import" and then off the page's content. Shift+Tab
goes from "Import" back to the tab. The focus never stops on "Upload
File", so the file picker cannot be opened.

A mouse click on "Upload File" opens the picker once, and the file goes
up. On a new submission's "Upload Files" step, Tab reaches "Add File"
and Enter opens the picker.

## Cause

The visible "Upload File" button and the hidden file input behind it
are both out of the tab order, set by two pieces of code that each
expect the other to take the focus.

pkp-lib's `templates/controllers/fileUploadContainer.tpl`, line 72,
gives the button `tabindex="-1"`:

```html
<button id="{$browseButton|escape}" class="pkp_uploader_button pkp_button" tabindex="-1">
```

Nate Wright (NateWr) added it in
[1dbcd963fb](https://github.com/pkp/pkp-lib/commit/1dbcd963fb7c01276ba7a64da2c14b5ab97438e6)
(authored 2016-10-11, merged through `pkp/pkp-lib#2014` on 2016-11-22).
It was for `pkp/pkp-lib#1740`, a file picker that opened twice on
Windows. That commit removed pkp's forwarding of the button's clicks.
From then on, keyboard users were to reach plupload's own hidden
`<input type="file">` instead; `js/controllers/UploaderHandler.js` still
gives the button a focus style when `.moxie-shim input` is focused. With
plupload 2.1.9, which pkp-lib used then, that input had no `tabindex`,
so Tab reached it.

That is why this is a regression: the upload worked from the keyboard
until plupload 2.3.x, and broke with the update to it. From 2.3.4 on,
moxie's HTML5 `FileInput.init()` takes the hidden input out of the tab
order in every current browser. It leaves the browse button as the
keyboard's target:

```js
// it shouldn't be possible to tab into the hidden element
(I.can('summon_file_dialog') ? input : browseButton).setAttribute('tabindex', -1);
```

pkp-lib moved to plupload 2.3.6 in 3342372300, first released in 3.2.
Since then the button and the input both carry `tabindex="-1"`.

Where the box appears, each through the same template line:

- The upload wizard (`wizard.fileUpload.FileUploadWizardHandler`,
  `wizard/fileUpload/form/fileUploadForm.tpl` line 187). On `main` it is
  opened by every workflow file list: ui-library's `FileManager`
  (`useFileManagerActions.js`, `fileUpload()`) and `GalleyManager`
  (`useGalleyManagerActions.js`, `galleyChangeFile()`). That covers
  submission, review, revision, copyedited, production-ready and galley
  files, and a reviewer's attachments. On screen: production-ready files
  (OJS, OMP), a new galley (OPS), an author's revision (OJS). On 3.5,
  3.4 and 3.3 the files grids open the same wizard through
  `BaseAddFileLinkAction` (code).
- The Native XML Plugin's "Import" tab (OJS, OMP, OPS) and the Users XML
  Plugin's "Import Users" tab (OJS, OMP): on screen.
- Read in the code, not driven:
  - Website › Plugins, "Upload A New Plugin" (`uploadPluginForm.tpl`).
  - The user profile's "Public" tab, profile image
    (`publicProfileForm.tpl`).
  - Publisher Library and submission documents
    (`library/form/newFileForm.tpl`, `editFileForm.tpl`,
    `submissionDocuments/form/newFileForm.tpl`).
  - OJS's issue cover image and issue galley (`issueForm.tpl`,
    `issueGalleyForm.tpl`).
  - OMP's series cover image (`seriesForm.tpl` line 41).
- Not affected: the submission form's file list and the upload fields
  of the Vue forms (ui-library `SubmissionFilesListPanel`,
  `FieldUpload`). They are different components, and each keeps its
  button in the tab order.

## Proposed fix

Remove `tabindex="-1"` from the button in
`lib/pkp/templates/controllers/fileUploadContainer.tpl`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/fix.diff)).
Then plupload decides which element the keyboard reaches:

```diff
-		<button id="{$browseButton|escape}" class="pkp_uploader_button pkp_button" tabindex="-1">
+		<button id="{$browseButton|escape}" class="pkp_uploader_button pkp_button">
```

plupload already picks one keyboard target per browser. In every
current browser it keeps the button in the tab order and takes the
hidden input out. The template's attribute then takes the button out as
well, which leaves nothing.

When the focused button gets Enter or Space, the browser sends the same
click that moxie already listens for. moxie opens the picker and cancels
the default action, and `UploaderHandler`'s own handler returns `false`,
so the form is not submitted. The 2016 fault, a picker opening twice,
came from pkp's click forwarding, which stays removed. ui-library's
`FieldUpload` does the same: its "Upload File" button stays in the tab
order ("keyboard-accessible file upload").

Tried on `main`, all three apps. In the workflow's upload window and on
the import tab, Tab now stops on "Upload File" and Enter opens one file
picker. The chosen file shows with "Change File", and the next Tab goes
to "Continue" (in the window) or "Import" (on the tab). A mouse click
still opens exactly one picker without submitting the form, with the fix
in and out.

**Alternatives:**

- Patch moxie so its hidden input stays tabbable. That edits a vendored
  library, which `pkp/pkp-lib#6888` moved away from. It also gives the
  focus to an unlabelled input.
- Bring back the 2016 click forwarding. That is what opened the picker
  twice on Windows (`pkp/pkp-lib#1740`).
- Move these forms to ui-library's upload components. That is right in
  the long run, and far larger than this fault needs.

**What goes with it:**

- `UploaderHandler.js`'s focus style for `.moxie-shim input` can stay.
  It still serves a browser where plupload makes the input the target.
- No stored data, API or plugin hook is touched.
- The template line is the same on 3.5, 3.4 and 3.3, so the diff
  applies there as written.
- Guard: an e2e test that Tab reaches "Upload File" in the workflow's
  upload window and Enter opens the file picker.

Small: one attribute in one shared template, and a test.

## Evidence

- Kept script, run on an install loaded from PKP's default test dataset
  (PostgreSQL), in Chromium:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/lib.js)
  and
  [the A9 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js).
  Run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/walk.js`
  (`WALK_GROUPS=editor,author,wizard,import` picks groups;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - It records each Tab and Shift+Tab stop, and the `tabindex` of the
    button and of plupload's input.
  - Without the fix, both are `-1` in every window and app.
  - A Playwright `filechooser` listener stands in for the operating
    system's file picker.
  - The "wizard" group is the control: on a new submission's "Upload
    Files" step (OJS, `ccorino`), the 12th Tab reaches "Add File", and
    Enter opens one picker.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/fix.diff ojs omp ops`,
  then walk.js (the editor, author and import groups) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/neighbour.js),
  then the same with `revert`. With the fix, the button has no
  `tabindex` and the input stays `-1`. In the upload window, Tab stops
  on "Upload File", then "Cancel", or "Continue" once a file is up. Run
  with the fix in and out, neighbour.js shows that a mouse click opens
  one picker and the form is not submitted. On the Users XML Plugin,
  Tab stops first on "Import Users" without the fix and on "Upload File"
  with it.
- Introduced:
  - `git blame` on the template's line 72 gives 1dbcd963fb. Its authored
    date is the 2016-10-11 given in the Cause; it was merged through
    `pkp/pkp-lib#2014` on 2016-11-22.
  - pkp-lib's `composer.lock` moved `moxiecode/plupload` from v2.1.9 to
    v2.3.6 in 3342372300, a direct commit with no PR, first in the
    3.2.0 tags.
  - moxie's `js/moxie.js`, read on raw.githubusercontent.com: v2.1.9,
    v2.2.0, v2.2.1 and v2.3.0 to v2.3.3 set no `tabindex`. v2.3.4 and
    v2.3.6 to v2.3.9 carry the line quoted in the Cause (there is no
    v2.3.5 tag).
  - That plupload 2.1.9 left the input reachable is read from the code,
    not walked: no 3.1 install was driven.
- Code reads:
  - 3.5, at the lib/pkp tip below: template line 72 the same, plupload
    v2.3.9 with the moxie line, the files grids through
    `BaseAddFileLinkAction`.
  - 3.4 and 3.3, with `git show origin/stable-3_4_0:` and
    `origin/stable-3_3_0:` in `lib/pkp`: template line 72 the same,
    `composer.lock` plupload v2.3.9 and v2.3.7 (both with the moxie
    line), `UploaderHandler.js` the same, `BaseAddFileLinkAction` opening
    the wizard.
  - With `git show upstream/stable-3_4_0:` and `upstream/stable-3_3_0:`
    in each app: `plugins/importexport/native/templates/index.tpl`
    includes the template; OPS 3.3 ships no Native XML Plugin.
- Tips:
  - `main`: OJS bade233f73 (lib/pkp 2e377d27fc); OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6).
  - 3.5: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62).
  - 3.4: OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b (lib/pkp
    df13621c2d).
  - 3.3: OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161 (lib/pkp
    d446601ebe).
  - Dataset: pkp/datasets 38ab955 (2026-09-30).
- Walked: on `main`, all four groups. On 3.5, only the import group
  (all three apps, the same result); the 3.5 workflow, which opens the
  wizard from its files grids, was read in the code. Only the keyboard
  (Tab, Shift+Tab, Enter) was walked. No screen reader was tried, and
  no browser other than Chromium.
- Not driven: the code-only screens listed under the Cause.
