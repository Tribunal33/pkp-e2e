# Screen reader users hear a form field called invalid, but not the error message shown under it

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** PR `pkp/ui-library#20` for `pkp/pkp-lib#3594` · [7496b3c2](https://github.com/pkp/ui-library/commit/7496b3c2c4b7872373bc2f2fef0e572bb8301059) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** fix in PR `pkp/ui-library#934` (open, not yet in main), for `pkp/pkp-lib#12599` (open), covering more: it also moves the focus to the error list and leaves `aria-invalid` off valid fields instead of writing `"false"`
- **Tracked in** spec U42 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a24)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a form of the editorial screens rejects a save, it shows an error
message under each field that failed ("This field is required.", "This
is not a valid URL."). A screen reader user who moves into such a field
hears it called invalid, but not the message: the message is not tied
to the field. The fault is in the ui-library's `FieldBase.vue`, which
every form field is built on, so every field of every such form has it.

Most forms also list each failed field with its first message at their
foot, in a list only a screen reader announces, and that list is the
way to the reason. A few forms show no such list: creating a new
version, sending a file to the text editor, an author's response to
the reviews, and the media file windows. There the user has to read on
past the field to find the message.

The ask is a one-line fix in `FieldBase.vue`. The open
`pkp/ui-library#934` contains the same change but needs `?.` added to
it, or it breaks the "Creators" rows of the data citation panel.

## Impact

- **Lost**: at the field, the reason it failed, for screen reader users.
  A second message on the same field ("This must be 4 digits long."
  beside "This is not a valid integer.") is shown only under the field,
  never in the foot's list.
- **Who**: screen reader users among editors, managers and authors,
  whenever a form on the editorial screens rejects a save. Authors meet
  it on the response to the reviews, which has no list at its foot.
- **Way round**: on most forms, the foot's list; on the forms without
  one, reading on past the field, where the message follows it in the
  page. Each message is also a polite live region, so a screen reader
  may read it once as it appears.

Low: the user can still find every reason and save the form, but the
fields fail WCAG 3.3.1 and 1.3.1 (level A), and on the forms without a
list only by reading on past the field. A form whose message did not
follow its field in the page would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), or for
  `stable-3_5_0` (the "Contact" steps only: 3.5 has no data citations).
- A way to read what a screen reader is given for a field: a screen
  reader, or Chrome's accessibility inspector (inspect the field, then
  Elements › Accessibility › "Computed Properties": "Invalid user
  entry" and "Description").
- For the data citation steps: data citations on (off in the dataset).
  As `dbarnes`, go to Settings › Workflow › "Submission" › "Metadata",
  tick "Enable data citation metadata" and press "Save".

Settings › "Contact":

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Go to Settings › Journal (Press, Server) and open the "Contact" tab.
3. Under "Technical Support Contact", clear "Name" and "Email address"
   and press "Save".
4. Put the cursor in "Name", then in "Email address".

The data citation panel (main):

5. Open submission 1 "Signalling Theory Dividends" (OJS), 4 "How
   Canadians Communicate: Contexts of Canadian Popular Culture" (OMP) or
   1 "The influence of lactation on the quantity and quality of cashmere
   production" (OPS), and in the side menu under "Publication" ("Preprint" on OPS)
   choose "Data".
6. Press "Add Data Citation". Type `h19y Survey data` in "Title",
   choose "Supporting data without specifying whether they were
   generated or analyzed (supporting)." in "Relationship type", type
   `20a4` in "Year" and `example` in "URL". Under "Creators" press
   "Add" and type `0000-0002-1825-0097` in the row's ORCID iD field.
   Press "Save".
7. Put the cursor in "Year", "URL" and the creator's ORCID iD field in
   turn.

**Expected.** Each field is given to the screen reader as invalid, with
the message under it as its description: "This field is required." at
step 4; "This is not a valid integer. This must be 4 digits long.",
"This is not a valid URL." and "The ORCID iD you Please include the full URI (e.g.
"https://orcid.org/0000-0002-1825-0097")." at step 7.

**Observed.** The messages show under the fields, and each field is given
as invalid with no description. At step 4, as Chrome's accessibility
tree gives "Name":

```
textbox "Name Required"   invalid: true   description: (none)
<input name="supportName" aria-invalid="true">   (no aria-describedby)
<div class="pkpFieldError" aria-live="polite" id="contact-supportName-error">This field is required.</div>
```

"Email address" and, at step 7, "Year", "URL" and the ORCID iD field
read the same: invalid, no description. The form's foot reads "Please
correct 3 errors. Go to URL: This is not a valid URL. Go to Year: This
is not a valid integer. Go to Creators: The ORCID iD you specified is
invalid. …", without Year's second message ("Please correct 2 errors.
Go to Name: …" at step 3).

## Cause

`FieldBase.vue` (`lib/ui-library/src/components/Form/fields/`), the base
of every Vue form field, builds the field's `aria-describedby` in the
computed `describedByIds()`. It adds the message's id only when
`this.error` is set:

```js
if (this.error) {
	ids.push(this.describedByErrorId);
}
```

`error` is a prop no caller passes: the fields receive their messages
as `allErrors` from the `Form`, which the computed `errors()` reads.
The fields draw the message from `errors` (`FieldText.vue`: `<FieldError
v-if="errors && errors.length" :id="describedByErrorId" …>`), so the
message exists with its id while the field never points at it.

Reach:

- Every field that puts `describedByIds` on its control:
  `FieldText`, `FieldTextarea`, `FieldSelect`, `FieldDate`,
  `FieldMultiSelect`, `FieldOptions`, `FieldRadioInput`, `FieldPubId`,
  `FieldMetadataSetting`, `FieldArchivingPn`, `FieldUpload`,
  `FieldUploadImage` and, through `FieldBaseAutosuggest`, the
  autosuggest fields (code). Each draws its message under
  `v-if="errors && errors.length"` with that id. `FieldSlider` also
  puts `describedByIds` on its control but draws no message (code).
- Not reached by this fault or its fix: `FieldRichTextarea` and
  `FieldColor` draw the message with the id but give their control no
  `aria-describedby` at all, and `FieldFunder` draws its own message
  without the id (code).
- The foot's list (`FormErrors.vue`, `errorList()`) takes only the
  first message of each field, and forms built with `showErrorFooter:
  false` have no list: `useWorkflowVersionForm.js` ("Create New
  Version", "Send File to Text Editor", and OJS's "Schedule For
  Publication" on a version with no publication stage; "Publication
  Stage" and "Revision Significance" are required there),
  `useAuthorResponseForm.js` (the author's response to the reviews:
  "Author Response", a `FieldRichTextarea` this fix does not reach,
  and the author list are required), and the two
  `MediaFileManager` windows ("Name of the file" required). These are
  on `main` only (code; not walked).
- The creator rows' fields all carry the message id `-orcid-error`
  (no per-row `formId`): with two rows rejected, both fields would point
  at the first row's message. The per-row `formId` of
  [U42-A14's fix](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U42-A14-citation-author-boxes-unnamed.md)
  makes the ids unique.
- The unused `error` prop also hides `FieldArchivingPn`'s own `error()`
  method, which it hands to `$.ajax` as the failure callback: a prop
  wins over a method of the same name, so the callback is `undefined`
  (read in the code, not walked).

## Proposed fix

A proposal: read the messages the field draws, in
`FieldBase.describedByIds()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-box-message-not-announced/fix.diff),
in `lib/ui-library`):

```diff
-			if (this.error) {
+			if (this.errors?.length) {
 				ids.push(this.describedByErrorId);
 			}
```

This is the condition every field already uses to draw the message, so
the id is in the field's `aria-describedby` exactly while the message
with that id is on the page, for every field at once. The optional
chaining matters: `errors()` returns `undefined` when `allErrors`
holds the field's key with an undefined value. `FieldAuthors` passes
exactly that (`{orcid: errors?.[index]?.orcid}`) for every row it
draws, and the templates read it as `errors?.length` too.

Tried on `main` on the three apps: after the same Steps, every rejected
field ("Name", "Email address", "Year", "URL", the creator's ORCID iD) is
given as invalid with its message as its description. Checks that the
fix goes no further, with it and without it: the Masthead's English
title field, emptied and rejected, is described by its message and
still by its "1/2 languages completed" count, while the untouched
initials field keeps only its count; "Contact", corrected and saved,
leaves no message id on its fields; a data citation with a valid
creator row and an empty one is saved, and the empty row renders
without a script error. Without the fix, the rejected Masthead title
is described only by its count.

**Alternatives**

- Merging `pkp/ui-library#934` instead: it makes the same change as
  `this.errors.length`, and uses the same expression in its new
  `ariaInvalid()`. For the rows `FieldAuthors` draws (the data citation
  panel's "Creators", and "Author Information" in References › "Edit
  citation" with metadata lookup on), `errors` is `undefined`, so both
  would throw while the field renders (read in the code, not run). With
  `?.` in both places the PR covers this report; its other changes
  (focus, `aria-invalid`) answer `pkp/pkp-lib#12599` and need their own
  review, so the one line can go in first.
- Passing `error` from each field: every field would need a new prop
  wiring for what `errors` already holds.
- Removing the unused `error` prop as well: right, and it gives
  `FieldArchivingPn` its `error()` callback back, but that changes the
  plugin toggle's failure path and is worth its own check.

**What goes with it**

- No data or API change; a plugin field that extends `FieldBase` gets
  the id too, from the same `errors`.
- Backport: the diff applies as it stands on `stable-3_5_0`. On
  `stable-3_4_0` and `stable-3_3_0` the same line follows an
  `if (this.helpTopic)` block, so the change is made there by hand (`?.`
  already builds there: `FieldOptions.vue` on `stable-3_3_0` uses it).
- Guard: an e2e check (a field rejected on "Contact" whose
  `aria-describedby` names its message). A ui-library unit test would
  need `@vue/test-utils` and a DOM environment, which ui-library does
  not have yet: its tests cover composables and stores only.

Small: one condition in one shared ui-library file, tried, and an e2e
check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-box-message-not-announced/walk.js)
  with its helpers in `lib.js` beside it. It takes the Steps as
  `dbarnes` on PKP's default dataset (pkp/datasets eaf024c5,
  2026-10-18), puts the cursor in each rejected field and reads its
  `aria-invalid`, `aria-describedby` and what each id there points at,
  and its description in Chromium's accessibility tree (CDP
  `Accessibility.getPartialAXTree`). With `nb` as its argument it runs
  the checks that the fix goes no further instead (Masthead title, Contact
  corrected and saved, a valid data citation with an empty creator
  row), with the fix in and out:
  `node bin/probe.js all shared/playwright/checks/issues/rejected-field-message-not-announced/walk.js [steps|nb]`.
- Tips walked, on PostgreSQL:
  - main: OJS 6b4323ced7, OMP 5777025be, OPS f048e747b4 (pkp-lib
    042726ebf6, ui-library 99abe252).
  - 3.5: OJS 007c2cd0d6, OMP 2d575f250, OPS e737a9e465 (pkp-lib
    092ec34b0f, ui-library 2576e00a), the "Contact" steps: the same
    observation on the three apps. The "Data" steps cannot be taken
    there: 3.5 has no data citations ("Enable data citation metadata"
    and the "Data" page are absent).
- Code reads:
  - main: `FieldBase.vue` (`describedByIds()`, `errors()`,
    `compileId()`), `FieldText.vue`, `FieldError.vue`,
    `FieldAuthors.vue`, `FieldArchivingPn.vue`, `FieldBaseAutosuggest.vue`,
    `FieldSlider.vue`, `FieldRichTextarea.vue`, `FieldColor.vue`,
    `FieldFunder.vue` and every field drawing `FieldError`; no field or
    PHP `Field` class passes `error`. pkp-lib `PKPContactForm.php`,
    `PKPMastheadForm.php`, `DataCitationEditForm.php`.
  - Introduced: blame on `if (this.error)` lands on 7496b3c2, the
    forms' first version, where `FieldBase` declared no `error` prop;
    `commits/7496b3c2/pulls` names `pkp/ui-library#20`, for
    `pkp/pkp-lib#3594`. `error: String` was declared in 7f13651e (Vue 3
    migration, `pkp/ui-library#286`).
  - 3.5 (`stable-3_5_0` ui-library 2576e00a): the same line in
    `FieldBase.vue`, and `FieldText.vue` draws the message the same way.
  - 3.4 (ui-library `stable-3_4_0` ee684b34) and 3.3 (ui-library
    `stable-3_3_0` 96959f9e): `describedByIds()` checks `this.error`,
    `FieldText.vue` draws `FieldError` under `v-if="errors &&
    errors.length"` with `describedByErrorId`, and `PKPContactForm`
    (`.inc.php` on 3.3) has the required "Name" and "Email" fields.
  - The forms without a list at their foot: `showErrorFooter` in
    `useForm.js`, `Form.vue`, `FormPage.vue`, and its `false` callers
    on main; none on `stable-3_5_0` (its one `:show-error-footer="false"`,
    the user invitation's details step, shows `FormErrorSummary` above
    the form instead).
  - `pkp/ui-library#934` read through its files (its `FieldBase.vue`
    and `FieldText.vue` changes).
- Upstream search (2026-10-19): pkp/pkp-lib, pkp/ui-library and
  pkp/ojs, issues and pull requests, open and closed, by the symptom's
  words and by `describedByIds`; `pkp/pkp-lib#12837` (closed as a
  duplicate) is about `aria-invalid` on valid fields, not this.
- Not driven: a real screen reader (descriptions read from Chrome's
  accessibility tree, which is what a screen reader is given); the
  forms without a list at their foot and the other forms (code).
