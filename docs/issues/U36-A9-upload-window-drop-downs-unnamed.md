# In the upload window, the revise and component drop-downs have no name for a screen reader

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [dc439078bb](https://github.com/pkp/pkp-lib/commit/dc439078bbd7d9bceec03df7f05db3573fba549f) (2013-03-15)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Step 1 of the upload window has two drop-downs: "If you are uploading a
revision of an existing file, please indicate which file." and "Article
Component" ("Submission Component" on a press, "Preprint Component" on
a preprint server). Neither has a name for a screen reader, because the
labels are not tied to them (WCAG 4.1.2, Name, Role, Value).

A screen reader user who moves through the window with Tab lands on a
combo box and is told only its current choice: "This is not a revision
of an existing file" on the first, "Select article component" on the
second. Tab skips the label, which is plain text above the drop-down.
To hear it the user has to leave Tab and read back one line.

## Impact

- **Lost.** No data and no work; what is missing is the announcement of
  each drop-down's name.
- **Who.** Anyone using a screen reader who uploads a file in the
  workflow: a submission, review, revision, copyedited or
  production-ready file, or a galley's file.
- **Way round.** Go by the current choice, which says on both
  drop-downs what they are for, or read the line above the drop-down.

Low: the upload gets done, and both drop-downs open on a choice that
names their purpose. A drop-down whose first choice said nothing of its
purpose would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for the version.
- Chrome's accessibility inspector to read a control's name: inspect
  the control, then Elements › Accessibility › "Computed Properties" ›
  "Name". A screen reader serves as well.

Steps (OJS, OMP):

1. Sign in as `dbarnes`.
2. Open the submission's workflow. It opens on Submission.
   - OJS: submission 4, "Computer Skill Requirements for New and
     Existing Teachers: Implications for Policy and Practice".
   - OMP: submission 3, "The Political Economy of Workplace Injury in
     Canada".
3. Above "Submission Files", press "Upload". The window "Upload
   Submission File" opens on "1. Upload File", with two drop-downs. The
   first, the revise drop-down, shows only because the list already
   holds a file.
4. Read each drop-down's name in the inspector, or Tab to it with a
   screen reader on.
5. Click the text "Article Component" (OMP: "Submission Component").

On a preprint server (OPS), steps 2 and 3 are: open preprint 1, "The
influence of lactation on the quantity and quality of cashmere
production", choose Publication › "Galleys", press "Add galley", type
"u36k PDF" as the label and press "Save". The window "Upload a File
Ready for Publication" opens with one drop-down, "Preprint Component".

**Expected:** each drop-down's name is its label: "If you are uploading
a revision of an existing file, please indicate which file." and
"Article Component*" (the "*" is the label's required mark). Clicking a
label moves the focus to its drop-down.

**Observed:** both drop-downs have an empty name. The accessibility
tree holds the label as text and the drop-down as a bare combo box:

```
- text: If you are uploading a revision of an existing file, please indicate which file.
- combobox:
  - option "This is not a revision of an existing file" [selected]
  ...
- text: Article Component*
- combobox:
  - option "Select article component" [selected]
```

Clicking a label leaves the focus where it was.

## Cause

pkp-lib's `templates/controllers/wizard/fileUpload/form/fileUploadForm.tpl`
draws each drop-down in a form section with a title and no `for`, lines
173 and 179:

```smarty
{fbvFormSection title=$revisionSelectTitle required=$revisionOnly}
	{fbvElement type="select" name="revisedFileId" id="revisedFileId" …}
…
{fbvFormSection title="submission.upload.fileContents" required=true}
	{fbvElement type="select" name="genreId" id="genreId" …}
```

`templates/form/formSection.tpl` writes the title as a `<label>`, and
gives it a `for` attribute only when the section was called with `for`.
`FormBuilderVocabulary::smartyFBVFormSection()` then looks in the
section's content for an id that starts with that value and a unique
suffix, and otherwise passes `for` on as written. Without `for` the
`<label>` belongs to no control. The selects carry no `aria-label` or
`aria-labelledby` either, so their name is empty.

Neither section has had a `for` since the form came into pkp-lib
(dc439078bb, where the revise section had the fixed title
`submission.upload.revisingExistingFile`).

Reach:

- Every upload window that shows a drop-down in step 1, since all of
  them use this form. Walked: "Submission Files" in OJS and OMP, and a
  new galley in OPS. Read in the code: the windows of the other file
  lists.
- The same omission elsewhere, counted and not checked one by one: 138
  of the 205 `fbvFormSection` calls with a title or label in OJS's
  templates (pkp-lib, the app, its plugins) have no `for`. This report
  leaves them out.
- The same screen's hidden upload box, which a screen reader still
  reads, has another cause, in the form's JavaScript:
  [U36-A9-upload-window-hidden-box-read-by-screen-reader.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A9-upload-window-hidden-box-read-by-screen-reader.md).
  That report's way round, choosing the component first, is easier to
  find once this drop-down has its name.

## Proposed fix

Pass `for` to the two sections
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-window-drop-downs-unnamed/fix.diff)):

```diff
-			{fbvFormSection title=$revisionSelectTitle required=$revisionOnly}
+			{fbvFormSection title=$revisionSelectTitle required=$revisionOnly for="revisedFileId"}
…
-			{fbvFormSection title="submission.upload.fileContents" required=true}
+			{fbvFormSection title="submission.upload.fileContents" required=true for="genreId"}
```

This is how the other legacy forms tie a section's title to its control
(`userGroupForm.tpl`: `{fbvFormSection title="settings.roles.from"
for="roleId" required="true"}`). A select is written with the id it is
given, with no suffix, so `for` matches it as written.

The fix does not touch the window that opens with the file to revise
already set. That branch of the template has its own section, "Current
file", and a hidden `revisedFileId` input; the section that gains
`for="revisedFileId"` is not drawn there.

Tried on `main`, all three apps. The drop-downs are then named "If you
are uploading a revision of an existing file, please indicate which
file." and "Article Component*" ("Submission Component*", "Preprint
Component*"), and a click on a label moves the focus to its drop-down.
The rest of step 1 gave the same results with the fix applied and
without it: choosing a file to revise sets the component, the upload
goes up under the chosen component, and "Continue" opens "2. Review
Details".

The "*" in the name is accepted here. `formSection.tpl` puts the
required mark inside the label, so every legacy form that passes `for`
names its required controls this way. The select also carries
`required` and `aria-required`. ui-library's `FormFieldLabel` instead
adds a screen-reader text for the mark; bringing that to
`formSection.tpl` would change every legacy form and is not part of
this fix.

**Alternatives:**

- Have `smartyFBVFormSection()` find the control's id itself when the
  section holds exactly one control. That would name the controls of
  many legacy forms at once. It changes every such form, so it needs
  its own review.
- An `aria-label` on each select. It repeats the label's text in a
  second place and does not make the label clickable.

**What goes with it:**

- The two lines are the same on 3.5, 3.4 and 3.3 (lines 174 and 180 on
  3.4 and 3.3), so the change applies there.
- Guard: a test, in pkp-e2e's Playwright suites, that finds each
  drop-down by role and name ("Article Component*").

Small: two attributes in one template, and a test.

## Evidence

- No screen reader was run. Every statement about what a screen reader
  announces is taken from the accessibility tree Chromium builds, read
  as Playwright's `ariaSnapshot()`; what a given screen reader says on
  Tab is unverified.
- Kept script, run on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets c657990, 2026-10-01):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-window-hidden-box-read-by-screen-reader/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-window-hidden-box-read-by-screen-reader/lib.js),
  shared with the hidden-box report; its header gives the commands.
  - For each drop-down the default mode records the label's text and
    `for`, the number of labels tied to the select, its `aria-label`
    and `aria-labelledby`, and the name in its accessibility snapshot.
    Without the fix: no `for`, no tied label, no ARIA attribute, an
    empty name.
  - `MODE=nb` takes step 5 (the script calls the label element's
    `click()` and reads which element then has the focus) and checks
    the rest of step 1, with the fix applied and without it.
- The fix was tried on 2026-10-02 on the `main` tips below, applied
  from fix.diff and taken out again.
- Introduced: `git blame` on lines 173 and 179 leads to dc439078bb,
  "file upload wizard to PKP-lib" (Jason Nugent), which brought the
  template into pkp-lib with both sections without `for` (its lines 167
  and 173). Its earlier history, in OMP, was not read.
- Code reads:
  - `main`: `formSection.tpl`,
    `FormBuilderVocabulary::smartyFBVFormSection()` and
    `_smartyFBVSelect()`, ui-library's `FormFieldLabel.vue`.
  - 3.5, at the lib/pkp tip below: the template's two sections and
    `formSection.tpl` the same.
  - 3.4 and 3.3: the same two sections without `for`, and
    `formSection.tpl` the same, read with `git show` on
    `origin/stable-3_4_0` and `origin/stable-3_3_0` in OJS's `lib/pkp`,
    and at the `lib/pkp` commits that OMP's and OPS's branch tips point
    at.
  - The count: `fbvFormSection` calls with `title=` or `label=` under
    OJS `main`'s `lib/pkp/templates`, `templates` and `plugins`, with
    and without `for=`.
- Tips:
  - `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a); OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6).
  - 3.5: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3 (lib/pkp
    cf3f984335).
  - 3.4: OJS 75cc2d488b (lib/pkp 32b0f4b4af); OMP 0aec65441 and OPS
    acd8ae704b (lib/pkp df13621c2d).
  - 3.3: OJS ac77c9fb35 (lib/pkp f6ab331645); OMP 8e72fc883 and OPS
    c5532e2161 (lib/pkp d446601ebe).
- Walked: steps 1 to 4 on `main` and 3.5, all three apps; step 5 on
  `main` only.
