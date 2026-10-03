# "Description" in the library's "Add a file" and "Edit" windows is starred as required, yet saves empty

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#10710` for `pkp/pkp-lib#10680` · [53e4857dfc](https://github.com/pkp/pkp-lib/commit/53e4857dfc912ab1ad3ffcc8d9952da48c8713c7) · 2025-01-14 · Nate Wright (NateWr); backported the same day to `stable-3_4_0` by `pkp/pkp-lib#10709` ([67f41b553a](https://github.com/pkp/pkp-lib/commit/67f41b553a3d962c6e560631af3d770c6e58064a)) and to `stable-3_3_0` by `pkp/pkp-lib#10708` ([45d3f11089](https://github.com/pkp/pkp-lib/commit/45d3f11089cd359f3651090764909135670caab7))
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U39 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U39-submission-and-publisher-libraries.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The "Add a file" and "Edit" windows of the Publisher Library and of a
submission's "Library" mark "Description" with the required-field star,
and the note under the form says "Required fields are marked with an
asterisk: *". Yet "OK" with "Description" left empty saves the file
with no message, and "Edit" reads the description back empty.

The star tells people that a description is required when it is not.

The proposal is to remove the star and keep "Description" optional, as
it has worked since the field was added. The issue that asked for the
field wanted it mandatory, at least for images, so the team should
confirm which way to go.

## Impact

- **Lost**: nothing; the file and every value typed are saved.
- **Who**: whoever adds or edits a library file: the managers and
  editors on Settings › Workflow › "Publisher Library", and every
  workflow participant in a submission's "Library", the Author included.
- **Way round**: none needed.

Low: a label that promises a rule the form does not apply, while the
task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on OMP and OPS).
- Any small file to upload.

Publisher Library, adding:

1. Sign in as `dbarnes`.
2. Open Settings › Workflow, tab "Publisher Library" (OMP "Press
   Library", OPS "Preprint Server Library").
3. Press "Add a file". Read the labels and the line under the fields.
4. Type "u39d no description" in "Name", choose "Other" in "Type",
   press "Upload File" and choose the file. Leave "Description" empty.
5. Press "OK".

Publisher Library, editing:

6. Press the arrow at the start of the row "u39d no description", then
   "Edit".
7. Change "Name" to "u39d renamed", leave "Description" empty and press
   "OK".

Submission Library:

8. Open the workflow of submission 4, "Computer Skill Requirements for
   New and Existing Teachers: Implications for Policy and Practice"
   (OMP: 3, "The Political Economy of Workplace Injury in Canada"; OPS:
   1, "The influence of lactation on the quantity and quality of
   cashmere production"), and press "Library" in its header.
9. Repeat steps 3 to 5 in the "Submission Library" window, with the name
   "u39d submission no description".
10. Repeat steps 6 and 7 on that row, with the name "u39d submission
    renamed".

**Expected**: the star marks only fields the form requires. Either an
empty "Description" is refused like an empty "Name", with "This field is
required." under the box, or "Description" carries no star.

**Observed**: in both windows of both libraries the labels read "Name
*", "Type *", "Description *" and "File *" ("File" without the star in
"Edit"), with "Required fields are marked with an asterisk: *" under
them. Each "OK" with "Description" empty closes the window with no
message, and the row lists under "Other" as "u39d no description", then
"u39d renamed" (and the submission's rows likewise). The next "Edit"
shows "Description" empty.

Control: in the Publisher Library's "Add a file", with "Name" empty,
"Other" chosen and no file uploaded, "OK" is refused with "This field is
required." under "Name", and nothing is sent.

## Cause

The four library form templates wrap the description box in a starred
section, but nothing requires it. In
`lib/pkp/templates/controllers/grid/settings/library/form/newFileForm.tpl`
(and the same lines in its `editFileForm.tpl` and in
`controllers/grid/files/submissionDocuments/form/{newFileForm,editFileForm}.tpl`):

```smarty
	{fbvFormArea id="description"}
		{fbvFormSection title="common.description" required=true}
			{fbvElement type="textarea" multilingual="true" id="description" value=$description}
		{/fbvFormSection}
	{/fbvFormArea}
```

`required=true` on `fbvFormSection` only draws the star on the label.
"Name" and "Type" are enforced on both sides. In the page, their
`fbvElement` carries `required=true`, which jQuery Validation (set up by
`js/controllers/form/FormHandler.js`) reads as a rule and answers with
"This field is required.". On the server, the shared `LibraryFileForm`
constructor adds `FormValidatorLocale` on `libraryFileName` and
`FormValidatorCustom` on `fileType`. The description has neither: the
textarea has no `required`, and `LibraryFileForm` (the parent of all
four forms) registers no check for `description`. So the page sends the
empty value and the server saves it.

The lines came with [53e4857dfc](https://github.com/pkp/pkp-lib/commit/53e4857dfc912ab1ad3ffcc8d9952da48c8713c7)
(`pkp/pkp-lib#10710`), which added the description field to both
libraries for `pkp/pkp-lib#10680`. That issue asked for descriptions to
help accessibility (alt text for images) and said "This should be
mandatory, at least for images." The change stored and edited the
description and drew the star, but added no check.

Reach:

- No other instance in the search (code). Every `.tpl` under
  `lib/pkp/templates` and under each app's `templates/` and `plugins/`
  (OJS, OMP, OPS `main`) was scanned for a `{fbvFormSection …
  required=true}` with no `required` inside it before
  `{/fbvFormSection}`. Besides the four description sections it found
  six, each with a server check in its form class: the file upload
  sections of both libraries' "Add a file", of `uploadPluginForm.tpl`
  and of OJS's `issueGalleyForm.tpl` (on `temporaryFileId`; for an
  issue galley, when it is new),
  `reviewFormElementForm.tpl`'s question (`FormValidatorLocale` in
  `ReviewFormElementForm`), and OMP's `seriesForm.tpl` path
  (`FormValidatorRegExp` in `SeriesForm`). Vue forms were not part of
  the search.
- No list, page or API shows the description; only the "Edit" window
  reads it back (code, and on screen in the walk).

## Proposed fix

The proposal: drop the star from the four description sections, so that
the field is optional, as it has been on every install since it was
added
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-description-starred-not-required/fix.diff)),
in each of the four templates:

```diff
 	{fbvFormArea id="description"}
-		{fbvFormSection title="common.description" required=true}
+		{fbvFormSection title="common.description"}
 			{fbvElement type="textarea" multilingual="true" id="description" value=$description}
```

This follows the forms around it: in an old form, an optional field's
section carries no `required`, as with the "File" section of the same
two "Edit" templates (`{fbvFormSection title="common.file"}`). It keeps
what the introducing change was for, a description a person can give,
and changes no stored data, request or API.

This leaves the description optional, where the issue asked for it to
be mandatory "at least for images". A check on every file of both
libraries would go further than that ask: it would cover contracts and
reports in every submission's library, and the next "Edit" of every file
saved without a description would refuse until one is typed.

Tried on `main` in all three apps: "Description" lost its star in both
windows of both libraries, and an empty description saved as before;
in the Publisher Library, "Name", "Type" and "File" kept their stars, an
empty "Name" was still refused, and a typed description was saved and
read back in "Edit", the same as without the fix.

**Alternatives**:

- Require the description, as the star says: add
  `FormValidatorLocale($this, 'description', 'required',
  'settings.libraryFiles.descriptionRequired')` to `LibraryFileForm`,
  with that new locale string. The check alone also covers the page: a
  `required` validator adds the class `required` to the field
  (`FormValidator::__construct()` fills `$form->cssValidation`, which
  `FormBuilderVocabulary::_addClientSideValidation()` passes to
  `textarea.tpl`), and the template puts it on the primary-language box
  only, which jQuery Validation then refuses. No template changes. Small
  as code, but not recommended unless the team wants every library file
  described: it also burdens the Submission Library's contracts and
  reports, and the "Edit" of every older file.
- Require it for images only, as the issue put it. The form would then
  have to know the uploaded file's type, which no library form does
  today: a new pattern, and a product decision first.

**What goes with it**:

- Backport: the same four lines are in `stable-3_5_0`, and through the
  backports of `pkp/pkp-lib#10680` (`pkp/pkp-lib#10709`,
  `pkp/pkp-lib#10708`) in `stable-3_4_0` and `stable-3_3_0`; the diff
  applies there as written.
- The guard: the e2e scenario that adds a library file can assert that
  "Description" carries no star, or that an empty one is refused if the
  team chooses that rule.

Small: one attribute removed in four templates of one repo, following
the optional fields beside it; no code, data or API change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-description-starred-not-required/walk.js)
  (steps 1 to 10 and the control; `nb` as its argument runs the
  neighbour check alone; helpers in its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-description-starred-not-required/lib.js)
  and `library-add-file-refused-closes-unasked/lib.js`), run on installs
  freshly loaded from PKP's default test dataset (pkp/datasets e8dafbc,
  2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/library-description-starred-not-required/walk.js [nb]`.
  Walked on `main` and `stable-3_5_0` (`PKP_E2E_LINE=stable-3_5_0` in
  front), OJS, OMP and OPS, with the same result on both. No request
  failed and the page's script raised no error.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, then
  `walk.js` (Expected: no star, empty description saved) and
  `walk.js nb` with the fix in and out (the Publisher Library: "Name"
  left empty with a description typed and a file uploaded is refused
  under "Name" with nothing sent; named, it saves and "Edit" reads
  "u39d described" back; the stars on "Name", "Type" and "File").
- Branch tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (lib/pkp cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441,
  OPS acd8ae704b, lib/pkp 767353f4fe; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, lib/pkp ac3fa73402.
- Code reads: on `main` and `stable-3_5_0`, the four templates,
  `LibraryFileForm` and the four forms that extend it, with no app copy
  or override in any of the three apps (the files are byte-identical
  across their lib/pkp checkouts); for the page-side check,
  `js/controllers/form/FormHandler.js`, `FormValidator`,
  `FormValidatorLocale`, `FormBuilderVocabulary::_addClientSideValidation()`,
  `Form::getDefaultFormLocale()` and `templates/form/textarea.tpl`; the
  template scan the Cause's Reach describes, each hit read against its
  form class. On
  `stable-3_4_0` and `stable-3_3_0` (lib/pkp, the branch all three apps
  share): the same four templates with the starred section, and a
  `LibraryFileForm` (`.inc.php` on 3.3) with no check on `description`;
  the backports 67f41b553a (3.4) and 45d3f11089 (3.3).
- Introduced: `git blame` on the section's line in each template names
  53e4857dfc, which created the description block; its PR's issue gives
  the request quoted in the Cause.
- Upstream search (2026-10-03): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, for "library file description required",
  "library description asterisk", "library description mandatory",
  "publisher library alt text", `LibraryFileForm description` and
  `10680`. `pkp/pkp-lib#12540` (the stars on multilingual fields) and
  `pkp/pkp-lib#9347` (screen readers reading the asterisk) are about
  other forms; nothing covers this one.
- MySQL not checked; nothing in the fault depends on the database.
