# A section, series or file component named with only spaces is refused with a raw text code

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** each form's key was wrong from the start: OJS section form [a941bd9ff6](https://github.com/pkp/ojs/commit/a941bd9ff614d4ad49fe9bd301fa9f6bc57784b4) (2013), OPS taken from OJS; OMP series form [debe50d659](https://github.com/pkp/omp/commit/debe50d659cafbcf8fb8593704521a16f8ca22fd) (2010); component key OMP [5ec0812770](https://github.com/pkp/omp/commit/5ec0812770669d19fe3b36b6a9eb2b30cd4cbd12) (2010), moved to pkp-lib [891551701b](https://github.com/pkp/pkp-lib/commit/891551701b580f62314d10a1501f3327a18b3ecb) (2013)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a6) · spec U58 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager types a single space as a section's "Section title" (a
series' "Title" on a press) or as a file component's "Name" under
Settings › Workflow › "Components", and presses "Save". The browser's
own required check stops an empty box with "This field is required."
under it, but it counts a space as filled in, so the save goes to the
server. The server refuses it, rightly, but the notice at the top right
is a raw text code where a sentence should be:
"##manager.setup.form.section.nameRequired## (English)"
("##manager.setup.form.series.nameRequired## (English)" on a press,
"##manager.setup.form.genre.nameRequired## (English)" for a component).

Only a title or name made of spaces leads there. The code shows in
every interface language, because no language file has these messages.

## Impact

- **Lost**: nothing. The window stays open and nothing is saved, as it
  should be.
- **Who**: a journal, press or preprint server manager creating or
  editing a section, series or file component, who leaves only spaces
  in the title or name.
- **Way round**: nothing is marked under the box, and a box of spaces
  looks empty, so the manager has to guess from the raw code
  ("…nameRequired…") that the title or name is missing. Typing a real
  one saves.

Low: the refusal is right and the task gets done once the manager
types a real name; only the message is a raw text code. It would be
higher if the code left the manager unable to work out what to change.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. The
  `stable-3_5_0` dataset, OMP and OPS take the same steps with the
  brackets.

Sections [OMP: Series]:

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Journal and open the "Sections" tab [OMP: Settings ›
   Press › "Series"; OPS: Settings › Server › "Sections"].
3. Press "Create Section" [OMP: "Add Series"].
4. Type one space into "Section title" [OMP: "Title"] and "U17B" into
   "Abbreviation" [OMP: no such box, type "u17b" into "Path"; OPS: also
   type "u17b" into "Section URL Path"].
5. Press "Save".

Components:

6. Go to Settings › Workflow, open the "Submission" tab and its side
   tab "Components".
7. Press "Add a Component".
8. Type one space into "Name".
9. Press "Save".

**Expected:** at step 5 the notice gives a sentence, "A title is
required for the section. (English)" [OMP: "A title is required for the
series. (English)"]; at step 9 a sentence such as "A name is required
for the component. (English)". The language name in brackets is added
to every such message.

**Observed:** after each "Save" the window stays open, nothing is
marked under the box, and a notice at the top right reads:

```
##manager.setup.form.section.nameRequired## (English)
```

[OMP: `##manager.setup.form.series.nameRequired## (English)`] at step 5,
and at step 9 on all three apps:

```
##manager.setup.form.genre.nameRequired## (English)
```

An empty box, by contrast, is refused in the browser with "This field is
required." under it, and an abbreviation of spaces in the same section
window gets a sentence, "An abbreviated title is required for the
section (English)".

## Cause

In each of the three windows, the required check on the title or name
refers to a message key that no locale file has ever defined:

- `SectionForm::__construct()`, OJS
  `controllers/grid/settings/sections/form/SectionForm.php` line 44 and
  OPS line 42: `FormValidatorLocale(…, 'title', 'required',
  'manager.setup.form.section.nameRequired')`.
- `SeriesForm::__construct()`, OMP
  `controllers/grid/settings/series/form/SeriesForm.php` line 56:
  `'manager.setup.form.series.nameRequired'`.
- `GenreForm::__construct()`, pkp-lib
  `controllers/grid/settings/genre/form/GenreForm.php` line 68:
  `'manager.setup.form.genre.nameRequired'`.

`FormValidator::getMessage()` translates the key, and a key with no
translation comes back as `##key##`; `FormValidatorLocale::getMessage()`
adds " (English)". `Form::validate()` hands the errors to
`createTrivialNotification()` as a form-error notification, which is the
notice at the top right. The keys the forms were meant to use exist
beside them: OJS's English `manager.po` defines
`manager.sections.form.titleRequired` "A title is required for the
section." and OMP's `manager.series.form.titleRequired` "A title is
required for the series.", both unused. In the section forms the
title message sits next to the abbreviation message the same form does
use (`manager.sections.form.abbrevRequired`); OMP's series form has no
abbreviation check. OPS had the section one until
3d318e9b1c ("Remove unused locale keys", 2019) removed it as unused.
pkp-lib has no message for a component's name.

The checks are `'required'`, so the form builder gives the boxes a `required` class,
and jQuery Validation (1.21.0 on `main`, 1.19.5 on 3.4 and 3.3) turns an
empty box away in the browser; its `required` rule does not trim, so a
space passes. On the server `FormValidatorLocale::getFieldValue()` trims
the primary-language value to empty and the check fails.

Reach:

- Creating and editing alike, in the primary language's box (the check
  reads only that one). Creating was taken through the screens;
  editing was read in the code.
- Every language: the keys are in no locale file of the three apps or
  pkp-lib, so no translation can show a sentence either.
- The same mistake in other forms, tracked separately and not fixed
  here: the URN plugin's suffix-pattern checks (its own report,
  [U44 A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A8-urn-suffix-pattern-spaces-raw-text-code.md));
  the Static Pages plugin's title check
  (`plugins.generic.staticPages.nameRequired`, OJS and OMP); OMP's
  catalog entry checks `grid.catalogEntry.typeRequired` (sales rights)
  and `grid.catalogEntry.priceRequired` (markets); OPS's galley label
  check `editor.submissions.galleyLabelRequired`; and the reviewer's
  required review form answers,
  `reviewer.submission.reviewFormResponse.form.responseRequired`, which
  only OJS defines (checked in the code).

## Proposed fix

Give each check a message that exists, in the layer that owns the
form:

- OJS `SectionForm` and OMP `SeriesForm`: point the title check at the
  key already written for it, `manager.sections.form.titleRequired` and
  `manager.series.form.titleRequired`. Most translations already carry
  them (63 of OJS's 78 locales, 30 of OMP's 34), and in the section
  form this follows the abbreviation check beside it
  (`manager.sections.form.abbrevRequired`).
- OPS `SectionForm`: the same key as its OJS twin, added back to OPS's
  English `manager.po` beside `manager.sections.form.abbrevRequired`.
- pkp-lib `GenreForm`: a new message in the `manager.setup.genres.*`
  family its other checks use (`manager.setup.genres.key.exists`).

The diffs, one per app root; each carries the same pkp-lib hunks
(`GenreForm` and its message), which pkp-lib takes once:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/fix-ops.diff).

```diff
--- a/controllers/grid/settings/sections/form/SectionForm.php
+++ b/controllers/grid/settings/sections/form/SectionForm.php
-        $this->addCheck(new \PKP\form\validation\FormValidatorLocale($this, 'title', 'required', 'manager.setup.form.section.nameRequired'));
+        $this->addCheck(new \PKP\form\validation\FormValidatorLocale($this, 'title', 'required', 'manager.sections.form.titleRequired'));
--- a/lib/pkp/controllers/grid/settings/genre/form/GenreForm.php
+++ b/lib/pkp/controllers/grid/settings/genre/form/GenreForm.php
-        $this->addCheck(new \PKP\form\validation\FormValidatorLocale($this, 'name', 'required', 'manager.setup.form.genre.nameRequired'));
+        $this->addCheck(new \PKP\form\validation\FormValidatorLocale($this, 'name', 'required', 'manager.setup.genres.nameRequired'));
--- a/lib/pkp/locale/en/manager.po
+++ b/lib/pkp/locale/en/manager.po
 msgid "manager.setup.genres.key.exists"
 msgstr "The key already exists."
 
+msgid "manager.setup.genres.nameRequired"
+msgstr "A name is required for the component."
+
```

Tried on `main` in all three apps: step 5 showed "A title is required
for the section. (English)" ["… for the series. (English)"] and step 9
"A name is required for the component. (English)", with the window
open and nothing saved. A section, series and component with a real
name saved and closed the same with the fix in and out.

This is a proposal; the team decides the wording and the key names,
including the punctuation: the reused title messages end in a full stop
before " (English)", where the abbreviation message reads "…for the
section (English)".

**Alternatives**:

- Define the three keys the code names in the locale files instead: no
  PHP change, but the existing, translated title messages stay unused
  and every translation starts from nothing.
- Trim in the browser so a box of spaces is refused as empty: it hides
  the message rather than fixing it, and the same holds for every other
  required box on these legacy forms.

**What goes with it**:

- Backport: the diffs apply to `stable-3_5_0` and `stable-3_4_0` as
  written (line numbers aside). On `stable-3_3_0` the files are
  `.inc.php` with tab indentation and unqualified validator classes,
  and the English locale is `en_US`; the same lines change by hand.
- Translations: the new component message, and the section message in
  OPS, go to Weblate like any new key.
- Test: an e2e check in each spec (a **Planned** item) that saves a
  title or name of one space and reads the sentence in the notice.

Medium: the missing messages sit in pkp-lib and in each of the three
apps, so the fix is four small changes in four repositories, each a
line or two following the forms' own pattern, with no data repair.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/walk.js)
  takes the Steps and records, for each "Save", the answer, whether the
  window stays open, the messages under its boxes, the notices at the
  top right, and the lists afterwards.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Neighbour check:** `WALK=neighbour` in front takes the same
    windows with a real title or name ("u17b section", "u17b series",
    "u17b component"). With the fix in and out alike, each saved,
    closed its window and appeared in its list.
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets c657990 (2026-10-01). No request failed on
  the server and no page script failed.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/fix-<app>.diff <app>`
  for each app, the walk and the neighbour check each on a freshly
  loaded dataset, then reverted.
- The two controls after Observed (an empty box, an abbreviation of
  spaces) come from the specs' own live probes (U17 note td2,
  2026-09-25; U58 note td4, 2026-09-27), not from this walk.
- Not driven: 3.4 and 3.3; MySQL not checked (the fault does not
  depend on the database).
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794
    (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3
    (lib/pkp cf3f984335 in each).
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 32b0f4b4af.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib f6ab331645.
- Code reads:
  - On every branch: the three forms' constructors, which name the same
    keys (`SectionForm.inc.php`, `SeriesForm.inc.php`,
    `GenreForm.inc.php` on 3.3), and the English locale files of each
    app and pkp-lib (`locale/en_US/` on 3.3), which define none of
    them. OJS and OMP define their title messages on every branch; OPS
    and pkp-lib have no such message on any.
  - `FormValidatorLocale::getFieldValue()` and `Form::validate()` on
    every branch, and jQuery Validation's `required` rule (1.21.0 on
    `main` and 3.5).
  - Every other key: the `addCheck()` keys of the three apps, their
    plugins and pkp-lib on `main`, looked up in all English `.po` files
    of each app tree (Reach).
- The trace (`git log -S` on each key, in the app and in pkp-lib):
  - OMP: [debe50d659](https://github.com/pkp/omp/commit/debe50d659cafbcf8fb8593704521a16f8ca22fd)
    (2010-02-04, mcrider, "Added series and division code") added the
    series check with `manager.setup.form.series.nameRequired`.
    [5ec0812770](https://github.com/pkp/omp/commit/5ec0812770669d19fe3b36b6a9eb2b30cd4cbd12)
    (2010-12-01, jerico.dev) renamed the component form's key to
    `manager.setup.form.genre.nameRequired`, and pkp-lib
    [891551701b](https://github.com/pkp/pkp-lib/commit/891551701b580f62314d10a1501f3327a18b3ecb)
    (2013-04-25, Jason Nugent, "Genres grid from OMP") moved it there.
    Neither key was ever in a locale file.
  - OJS: [a941bd9ff6](https://github.com/pkp/ojs/commit/a941bd9ff614d4ad49fe9bd301fa9f6bc57784b4)
    (2013-02-18, Alec Smecher, "Port sections to new structures")
    wrote the section grid's form with
    `manager.setup.form.section.nameRequired`; the key was never
    defined. OPS took the form from OJS.
  - These predate pkp's GitHub pull requests (bug numbers in pkp's old
    tracker), so no PR is named.
- Upstream searches (2026-10-02) in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library: by `nameRequired`, each full key,
  `FormValidatorLocale`, and the words "section title spaces",
  "component name required spaces", "missing locale key". No issue or
  PR names these keys. `pkp/pkp-lib#8081` (validating translation
  files, open) is about translations' contents, not keys the code names.
