# Once a journal stops taking a language for metadata, a contributor whose institution is named in it cannot be saved, and the form shows no reason

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the institution is one of the contributor's own language fields)
  - 3.3: none (code; the institution is one of the contributor's own language fields)
- **Introduced** `pkp/pkp-lib#10880` for `pkp/pkp-lib#7135` · [d7c67a46fe](https://github.com/pkp/pkp-lib/commit/d7c67a46fee724dfc003eb4b650021b5edb8e915) · 2025-01-31 · GaziYucel (GaziYucel)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U41 [A28](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a28)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A hand-entered institution (one typed in, not picked from the ROR
registry) can be named in each of the journal's metadata languages. A
manager can later stop taking one of those languages: on the "Languages"
tab of Settings › Website › "Setup", in the "Submission Languages"
table, they untick its "Metadata" box. The contributor's "Edit" window
then shows the institution with name boxes for the remaining languages
only, and "Save" in that window is refused, even with nothing changed.
The page says "The form was not saved because 1 error(s) were
encountered. Please correct these errors and try again.", no message
appears under any field, and "Save" stays disabled.

The server refuses the institution's name in the unticked language,
which the window no longer shows, so there is nothing on the form to
correct. No change to that contributor can be saved while the
institution holds that name.

It happens only on a submission with no other text in the unticked
language. When the submission's title or a contributor's name is
written in that language, the form keeps offering it and the save goes
through.

## Impact

- **Lost**: the change made to the contributor. Taking the first way
  round below also loses the institution's name in the unticked
  language.
- **Who**: anyone who edits contributors on a journal, press or server
  that has stopped taking a metadata language its hand-entered
  institutions were named in: managers and editors in the workflow;
  authors in the submission wizard, and in the workflow where they may
  edit the metadata (on a preprint server, of a preprint not yet
  posted). Institutions picked from the ROR registry are not affected.
- **Way round**: remove the institution ("Remove institution", "Yes"),
  save, and add it again by its name; or tick "Metadata" for the
  language again. Both are on screen, but nothing on screen points to
  either.

Medium: the scale's "a task fails, with a way round, in a rarely met
state".

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (`publicknowledge`), which
  takes English and French (Canada) for submission metadata. Each app
  has a submission, with no French text, whose contributor holds one
  hand-entered institution, named in English only:
  - OJS: submission 7, "Developing efficacy beliefs in the classroom",
    contributor "Domatilia Sokoloff", "University College Cork".
  - OMP: submission 1, "The ABCs of Human Survival: A Paradigm for
    Global Citizenship", contributor "Arthur Clark", "University of
    Calgary".
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production", contributor "Carlo Corino",
    "University of Bologna".

Steps:

1. Sign in as `dbarnes`.
2. Open the submission's workflow.
3. In the side menu, open "Publication" › "Contributors" ("Preprint" ›
   "Contributors" on OPS).
4. On the contributor's row, press "Edit". The form offers "French
   (Canada)" above its fields, and the institution's row reads "1 of 2
   languages completed".
5. Under "Affiliations", on the institution's row, press the "⋯" button
   (a screen reader names it "Click to edit or delete"), then "Edit
   institution name".
6. Type "u41h13g nom" into the box "Type the institution name in French
   (Canada)" and press "Save". The contributor is saved.
7. Open Settings › Website › "Setup" › "Languages". In the "Submission
   Languages" table, on the row "French (Canada)/français (Canada)",
   untick "Metadata". "Submissions" on that row unticks with it.
8. Open the submission's workflow and "Contributors" again, and press
   "Edit" on the contributor. The form no longer offers "French
   (Canada)", and the institution's row reads "All translations
   available". On that row, press "⋯", then "Edit institution name":
   there is one box, "Type the institution name in English", holding
   the English name.
9. Change nothing and press "Save".

**Expected**: the contributor is saved. The institution keeps its
French name, and the form offers "French (Canada)" to edit it, as it
does when the submission's title or a contributor's name holds French.

**Observed**: the save is refused and the window stays open, with the
notice "The form was not saved because 1 error(s) were encountered.
Please correct these errors and try again.". The form's foot shows
"Please correct one error." and "Jump to next error"; no message is
shown under "Affiliations" or any other field, and "Save" is disabled.
The request answers 400 with:

```json
{"affiliations":[{"name":{"fr_CA":["This language is not accepted."]}}]}
```

The stored names stay as they were (`en` and `fr_CA`). The same steps
with an institution picked from the registry instead save (200).

## Cause

`PKPPublication::getLanguages()` (pkp-lib) is the rule for which
languages a submission's metadata may hold: the publication's own
language, every language its multilingual fields hold, and every
language its authors' multilingual fields hold.
`PKPSubmission::getPublicationLanguages()` joins that over every
version of the submission, and its callers add the journal's metadata
languages (`$context->getSupportedSubmissionMetadataLocales()`). So
text already stored in a language the journal has since dropped stays
allowed, and stays on the forms: the submission's `metadataLocales`,
which set the contributor form's languages, are the journal's metadata
languages plus `getPublicationLanguageNames()`, which reads
`getLanguages()` too (`submission/maps/Schema.php`).

`d7c67a46fe` (multiple affiliations, `pkp/pkp-lib#7135`) moved an
author's affiliation out of the author's own multilingual fields
(`schemas/author.json`, `affiliation`) into an entity of its own
(`Affiliation`, `schemas/affiliation.json`, `name`). `getLanguages()`
still reads only the author schema's multilingual fields, so since that
change an institution's names no longer count.

A name in a dropped language is then neither offered nor allowed:

- `affiliation/maps/Schema.php` gives the form every stored name of a
  hand-entered institution (`getAffiliationName(null, $locales)`
  returns `getData('name', null)`).
- `FieldAffiliations.vue` draws a name box only for the form's
  languages (`v-if="supportedLocales.includes(affiliationNameLocale)"`),
  so the `fr_CA` name is not shown.
- `Form.vue`'s `submitValues()` drops values in other languages only
  for fields marked `isMultilingual`. The affiliations field is a list,
  not marked so, and its value is posted as the map gave it, `fr_CA`
  name included.
- `PKPSubmissionController::editContributor()` passes each posted
  institution to `Affiliation\Repository::validate()`, which allows
  only `getPublicationLanguages($context->getSupportedSubmissionMetadataLocales())`.
  `ValidatorFactory::allowedLocales()` refuses the `fr_CA` name with
  "This language is not accepted.", and the controller answers 400
  under `affiliations[0]`. The form has no `fr_CA` box to show the
  message under.

Where else it does and does not happen:

- The same form on the submission wizard's "Contributors" step, for a
  submission still in progress (code). "Add Contributor" is not
  affected: a new institution has names only in the form's languages.
- A new version copies the contributor's affiliations, so the refusal
  follows into it (code).
- An institution picked from the registry stores no name
  (`saveAffiliations()` clears it), and the map names it in the allowed
  languages only, so it is not refused (walked).
- The screen-reader list at the foot reads "Go to Affiliations: [object
  Object]" for this refusal, a separate fault: spec U41
  [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a7).

## Proposed fix

Count the authors' affiliation names in `PKPPublication::getLanguages()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliation-dropped-language-save-refused/fix.diff)):

```diff
--- a/lib/pkp/classes/publication/PKPPublication.php
+++ b/lib/pkp/classes/publication/PKPPublication.php
@@ -22,6 +22,7 @@
 use APP\facades\Repo;
 use APP\publication\enums\VersionStage;
 use Illuminate\Support\Str;
+use PKP\affiliation\Affiliation;
 use PKP\author\contributorRole\ContributorType;
 use PKP\context\Context;
 use PKP\core\Core;
@@ -489,21 +490,28 @@
      * Include optional additional languages.
      *
      * Publication: locale, multilingual metadata props
-     * Authors: multilingual props
+     * Authors: multilingual props, and those of their affiliations
      */
     public function getLanguages(?array ...$additionalLocales): array
     {
         $getMProps = fn (string $schema): array => app()->get('schema')->getMultilingualProps($schema);
         $metadataprops = $getMProps(PKPSchemaService::SCHEMA_PUBLICATION);
         $authorProps = $getMProps(PKPSchemaService::SCHEMA_AUTHOR);
+        $affiliationProps = $getMProps(PKPSchemaService::SCHEMA_AFFILIATION);
 
         $getlocales = fn (array $props, object $item): array => array_map(fn (string $prop): array => array_keys($item->getData($prop) ?? []), $props);
         $metadataLocales = $getlocales($metadataprops, $this);
         $authorsLocales = $this->getData('authors')?->map(fn (Author $author): array => $getlocales($authorProps, $author)) ?? [];
+        $affiliationsLocales = $this->getData('authors')?->map(
+            fn (Author $author): array => collect($author->getAffiliations())
+                ->map(fn (Affiliation $affiliation): array => $getlocales($affiliationProps, $affiliation))
+                ->all()
+        ) ?? [];
 
         return collect([$this->getData('locale')])
             ->concat($metadataLocales)
             ->concat($authorsLocales)
+            ->concat($affiliationsLocales)
             ->concat($additionalLocales)
             ->flatten()
             ->filter()
```

This fixes the rule where it lives, so every reader of the language set
(the validator, the forms' `metadataLocales`, the affiliation and author
maps) agrees again, and the affiliation stays its own entity. The cost
is small: every call of `getLanguages()` now also reads each version's
affiliations, which `author\DAO::fromRow()` already loads for all of
that version's authors in one query, kept with them.

Tried on OJS, OMP and OPS `main` with the Steps: at step 8 the form
offered "French (Canada)" with the institution's French box holding
"u41h13g nom", and step 9 saved (200), the names kept. With French
unticked on a submission whose institution has no French name, the form
offered English alone and saved, with the fix and without it.

**Alternatives**

- Drop the names in languages the form does not offer before the field
  is posted, as `Form.vue`'s `submitValues()` does for multilingual
  fields: the save goes through, but the French name is deleted without
  a word, unlike any other French text on the submission.
- Let `Affiliation\Repository::validate()` also allow the languages the
  institution already holds: the save goes through, but the name stays
  hidden and cannot be edited or removed, and the validator and the
  forms keep disagreeing about the language set.

**What goes with it**

- A submission whose only text in a dropped language is an
  institution's name now offers that language on its forms, as one with
  a title in it already does. The submission's `metadataLocales` in the
  REST API grows to match.
- A funder's `name` (`main` only) is not counted in `getLanguages()`
  either, but `funder\Repository::validate()` checks no language, so no
  save is refused there; left out.
- Backport: the `getLanguages()` hunk applies to `stable-3_5_0`; the
  `use` line goes in by hand, since that file's imports differ.
- Guard: an end-to-end check taking the Steps (a **Planned** item in
  spec U41), or a unit test of `getLanguages()` with an institution
  named in a language nothing else holds.

Small: a few lines in one pkp-lib method, written the way its author
fields already are, with no data repair and no change to any API's
shape, and a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliation-dropped-language-save-refused/walk.js)
  takes the Steps (`steps`); `way` adds the remove-and-save way round
  after them; `ror` takes them with an institution picked from the
  registry; `control` unticks French on a submission with no French
  name anywhere, then saves the contributor (it must save, with the fix
  and without it). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliation-dropped-language-save-refused/walk.js [steps|way|ror|control]`.
- Dataset: pkp/datasets 384e28b (2026-10-12), PostgreSQL.
- Walked on 2026-10-13: the Steps on `main` and `stable-3_5_0` in all
  three apps; `way` and `ror` on OJS `main` only.
- Not walked: the submission wizard's step, a new version, a submission
  holding a French title, the way round by ticking "Metadata" again (by
  the code each behaves as the Cause says).
- Introduced: `git log -L` on the `$authorsLocales` line of
  `getLanguages()` gives 7781b8a799 (`pkp/pkp-lib#9309`, jyhein,
  2024-03-21), which wrote the rule. `git log -S'"affiliation"' -- schemas/author.json` gives
  d7c67a46fe, which removed that field and added
  `Affiliation\Repository::validate()`. Its PR is `pkp/pkp-lib#10880`
  (bozana, merged 2025-02-06). Both are on `stable-3_5_0`.
- Code reads: on `main`, the methods the Cause names, with
  `useForm.js` (`setLocalesForSubmission()`) and
  `funder\Repository::validate()`; OMP and OPS override neither
  language method. On `stable-3_5_0`, the same code. On
  `stable-3_4_0`, `ContributorForm` has one multilingual
  `FieldText('affiliation')`, whose hidden languages `submitValues()`
  leaves out. On `stable-3_3_0`, `PKPAuthorForm` keeps the affiliation
  as one of the author's localized fields.
- Tips: OJS `main` 7c6fba2064, OMP eb9381314, OPS 1bc3f78888 (lib/pkp
  f4c2578c94, lib/ui-library c9889f00); `stable-3_5_0` OJS 5fc74d6213
  (lib/pkp f4f8fcdbc0), OMP 486cbf9eb and OPS 399c4ebca3 (lib/pkp
  8094f06bf5), lib/ui-library 2576e00a.
- Upstream search: pkp/pkp-lib, pkp/ui-library and pkp/ojs, by the
  symptom's words and by `getLanguages` and `getPublicationLanguages`.
  The nearest, `pkp/pkp-lib#11187` (affiliation entry usability) and
  `pkp/pkp-lib#12629` (a server error for an affiliation without a name
  in the submission's language), are other faults.
